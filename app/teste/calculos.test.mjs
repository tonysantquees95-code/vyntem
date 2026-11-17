import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/calculos.ts";
import { bancoVazio } from "../src/dados.ts";

const L = (o) => ({ id: Math.random().toString(36), tipo: "despesa", valor: 1000, data: "2026-11-10", contaId: "a-banco", nota: "", origem: "manual", criadoEm: 1, ...o });

test("parseValor e reais", () => {
  assert.equal(C.parseValor("45"), 4500);
  assert.equal(C.parseValor("45,90"), 4590);
  assert.equal(C.parseValor("1.234,56"), 123456);
  assert.equal(C.parseValor("12.50"), 1250);
  assert.equal(C.parseValor("abc"), null);
  assert.match(C.reais(123456), /1\.234,56/);
});
test("parcelas: a soma fecha e a sobra vai nas primeiras", () => {
  const v = C.dividirEmParcelas(1000, 3);
  assert.equal(v.reduce((a, b) => a + b, 0), 1000);
  assert.equal(v.length, 3);
  const ps = C.criarParcelas({ tipo: "despesa", contaId: "x", nota: "", origem: "manual" }, 1000, 3, "2026-01-31", (() => { let n = 0; return () => `i${n++}`; })());
  assert.deepEqual(ps.map((p) => p.data.slice(0, 7)), ["2026-01", "2026-02", "2026-03"]);
  assert.deepEqual(ps.map((p) => p.parcela.n), [1, 2, 3]);
  assert.equal(new Set(ps.map((p) => p.parcela.grupo)).size, 1);
});
test("datas: meses, fim de mês e semana domingo–sábado", () => {
  assert.equal(C.somarMeses("2026-01-31", 1), "2026-02-28");
  assert.equal(C.somarDias("2026-12-31", 1), "2027-01-01");
  const s = C.intervalo("semana", "2026-11-17"); // terça
  assert.equal(s.de, "2026-11-15"); assert.equal(s.ate, "2026-11-21");
  const m = C.intervalo("mes", "2026-02-10"); assert.equal(m.ate, "2026-02-28");
  assert.equal(C.moverPeriodo("mes", "2026-01-31", 1).slice(0, 7), "2026-02");
});
test("totais ignoram transferência e saldos das contas fecham", () => {
  const b = bancoVazio();
  const ls = [L({ tipo: "receita", valor: 100000 }), L({ valor: 30000 }), L({ tipo: "transferencia", valor: 20000, contaId: "a-banco", contaDestinoId: "a-carteira" })];
  const t = C.totais(ls);
  assert.equal(t.receita, 100000); assert.equal(t.despesa, 30000); assert.equal(t.saldo, 70000);
  const banco = b.contas.find((c) => c.id === "a-banco"), cart = b.contas.find((c) => c.id === "a-carteira");
  assert.equal(C.saldoDaConta(banco, ls), 100000 - 30000 - 20000);
  assert.equal(C.saldoDaConta(cart, ls), 20000);
});
test("cartão: compra vira dívida, fatura fecha no dia certo, pagar é transferência", () => {
  const cartao = { id: "cc", nome: "Cartão", tipo: "cartao", saldoInicial: 0, cor: "#fff", limite: 100000, diaFechamento: 5, diaVencimento: 12 };
  const ls = [L({ contaId: "cc", valor: 20000, data: "2026-11-03" }), L({ contaId: "cc", valor: 5000, data: "2026-11-06" })];
  assert.equal(C.saldoDaConta(cartao, ls), -25000);
  assert.equal(C.limiteDisponivel(cartao, ls), 75000);
  const k3 = C.chaveDaFatura("2026-11-03", 5), k6 = C.chaveDaFatura("2026-11-06", 5);
  assert.notEqual(k3, k6, "antes e depois do fechamento caem em faturas diferentes");
  assert.equal(C.faturaDoCartao(cartao, ls, k3).total, 20000);
  const pago = [...ls, L({ tipo: "transferencia", contaId: "a-banco", contaDestinoId: "cc", valor: 20000, data: "2026-11-10" })];
  assert.equal(C.saldoDaConta(cartao, pago), -5000);
});
test("agrupar por dia, categorias com porcentagem e calendário", () => {
  const b = bancoVazio();
  const ls = [L({ categoriaId: "c-mercado", valor: 7500, data: "2026-11-02" }), L({ categoriaId: "c-lazer", valor: 2500, data: "2026-11-02" }), L({ categoriaId: "c-mercado", valor: 1000, data: "2026-11-09" })];
  const dias = C.agruparPorDia(ls);
  assert.deepEqual(dias.map((d) => d.data), ["2026-11-09", "2026-11-02"]);
  const f = C.porCategoria(ls, "despesa", b.categorias);
  assert.equal(f[0].id, "c-mercado");
  assert.ok(Math.abs(f.reduce((s, x) => s + x.pct, 0) - 100) < 0.01);
  const cal = C.calendarioDoMes(2026, 11, ls);
  assert.equal(cal.length % 7, 0);
  assert.equal(cal.find((c) => c.data === "2026-11-02").despesa, 10000);
  assert.equal(cal.find((c) => c.data === "2026-11-02").doMes, true);
});
test("série mensal acumula o saldo", () => {
  const ls = [L({ tipo: "receita", valor: 10000, data: "2026-10-05" }), L({ valor: 4000, data: "2026-11-05" })];
  const s = C.serieMensal(ls, "2026-11-17", 3);
  assert.equal(s.length, 3);
  assert.equal(s.at(-1).acumulado, 6000);
});
