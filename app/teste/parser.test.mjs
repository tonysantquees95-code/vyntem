import test from "node:test";
import assert from "node:assert/strict";
import { interpretar } from "../src/parser.ts";
import { responder } from "../src/perguntas.ts";
import { bancoVazio, limparBanco } from "../src/dados.ts";

const HOJE = "2026-11-17";
const b = bancoVazio();

test("frase simples de despesa", () => {
  const r = interpretar("gastei 45 no mercado", b, HOJE);
  assert.equal(r.tipo, "despesa"); assert.equal(r.valor, 4500); assert.equal(r.data, HOJE); assert.equal(r.categoriaId, "c-mercado");
});
test("ontem, centavos e receita", () => {
  assert.equal(interpretar("paguei R$ 32,90 de almoço ontem", b, HOJE).data, "2026-11-16");
  const r = interpretar("recebi 1500 de salário", b, HOJE);
  assert.equal(r.tipo, "receita"); assert.equal(r.valor, 150000); assert.equal(r.categoriaId, "c-salario");
});
test("parcelas e data dd/mm", () => {
  const r = interpretar("comprei um tênis de 300 em 3x", b, HOJE);
  assert.equal(r.parcelas, 3); assert.equal(r.valor, 30000);
  assert.equal(interpretar("gastei 20 na farmácia dia 5/11", b, HOJE).data, "2026-11-05");
});
test("sem valor não é lançamento", () => { assert.equal(interpretar("oi tudo bem", b, HOJE), null); });
test("perguntas locais", () => {
  const banco = { ...b, lancamentos: [{ id: "1", tipo: "despesa", valor: 4500, data: "2026-11-05", contaId: "a-banco", categoriaId: "c-mercado", nota: "", origem: "manual", criadoEm: 1 }] };
  assert.match(responder("quanto gastei este mês?", banco, HOJE), /45,00/);
  assert.match(responder("qual meu saldo", banco, HOJE), /-?\s?45,00|45,00/);
  assert.equal(responder("blá blá", banco, HOJE), null);
});
test("limparBanco recusa lixo e conserta o que dá", () => {
  assert.doesNotThrow(() => limparBanco(null));
  assert.doesNotThrow(() => limparBanco("texto"));
  const x = limparBanco({ contas: [{ id: "a", nome: "X", tipo: "banco", saldoInicial: "abc" }], lancamentos: [{ id: "l", tipo: "despesa", valor: -5, data: "2026-02-30", contaId: "a" }, { id: "m", tipo: "despesa", valor: 500, data: "2026-02-10", contaId: "a" }] });
  assert.ok(x.categorias.length > 0, "recoloca as categorias padrão");
  assert.ok(x.lancamentos.every((l) => l.valor > 0 && /^\d{4}-\d{2}-\d{2}$/.test(l.data)), "sem valor negativo nem data inválida");
});
