import test from "node:test";
import assert from "node:assert/strict";
import { aplicarEntradas, notaDaEntrada, entradaValida, idDoLancamento, CONTA_DA_LOJA } from "../src/caixa.ts";
import { bancoVazio } from "../src/dados.ts";
import * as C from "../src/calculos.ts";

const E = (n, extra = {}) => ({ seq: n, ref: `venus:${n}`, tipo: "entrada", valorCentavos: 18990, cliente: "Maria Souza", pedido: String(n), data: "2026-11-21", ...extra });

test("venda paga vira entrada na conta Caixa da loja, com pedido e cliente na nota", () => {
  const { banco, novos } = aplicarEntradas(bancoVazio(), [E(1042)], 1000);
  assert.equal(novos, 1);
  const l = banco.lancamentos[0];
  assert.deepEqual([l.tipo, l.valor, l.data, l.contaId], ["receita", 18990, "2026-11-21", CONTA_DA_LOJA]);
  assert.equal(l.nota, "Pedido #1042 · Maria Souza");
  assert.ok(banco.contas.some((c) => c.id === CONTA_DA_LOJA && c.nome === "Caixa da loja"));
  assert.equal(banco.categorias.find((c) => c.id === l.categoriaId).nome, "Vendas da loja");
});

test("receber a mesma venda de novo não duplica nem mexe no banco", () => {
  const a = aplicarEntradas(bancoVazio(), [E(1), E(2)], 1000);
  const b = aplicarEntradas(a.banco, [E(1), E(2)], 2000);
  assert.equal(b.novos, 0);
  assert.equal(b.banco, a.banco);
  assert.equal(a.banco.lancamentos.length, 2);
});

test("estorno vira despesa com nota própria e não apaga a venda", () => {
  const a = aplicarEntradas(bancoVazio(), [E(7), E(8, { ref: "venus:7", tipo: "estorno" })], 1000);
  assert.deepEqual(a.banco.lancamentos.map((l) => l.tipo), ["receita", "despesa"]);
  assert.equal(a.banco.lancamentos[1].nota, "Estorno do pedido #8 · Maria Souza");
  assert.notEqual(idDoLancamento({ tipo: "entrada", ref: "venus:7" }), idDoLancamento({ tipo: "estorno", ref: "venus:7" }));
});

test("o saldo do caixa da loja soma as vendas e desconta o estorno, em centavos", () => {
  const { banco } = aplicarEntradas(bancoVazio(), [E(1, { valorCentavos: 10000 }), E(2, { valorCentavos: 5050 }), E(3, { ref: "venus:1", tipo: "estorno", valorCentavos: 10000 })], 1000);
  const total = banco.lancamentos.reduce((s, l) => s + (l.tipo === "receita" ? l.valor : -l.valor), 0);
  assert.equal(total, 5050);
  assert.equal(Number.isInteger(total), true);
});

test("o que o usuário já tem fica intacto e entrada estragada é ignorada", () => {
  const base = bancoVazio();
  const { banco, novos } = aplicarEntradas(base, [E(1), { lixo: 1 }, E(2, { valorCentavos: 12.5 }), E(3, { valorCentavos: -4 }), E(4, { data: "ontem" }), null], 1000);
  assert.equal(novos, 1);
  assert.deepEqual(banco.contas.slice(0, base.contas.length), base.contas);
  assert.equal(base.lancamentos.length, 0); // o banco original não foi alterado
  assert.equal(entradaValida(E(1)), true);
  assert.equal(entradaValida(E(1, { tipo: "pix" })), false);
});

test("sem cliente ou sem número a nota continua legível", () => {
  assert.equal(notaDaEntrada({ tipo: "entrada", cliente: "", pedido: "55" }), "Pedido #55");
  assert.equal(notaDaEntrada({ tipo: "entrada", cliente: "João", pedido: "" }), "Pedido · João");
});
