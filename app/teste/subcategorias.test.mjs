import test from "node:test";
import assert from "node:assert/strict";
import { bancoVazio, limparBanco, SUBS_PADRAO } from "../src/dados.ts";
import { interpretar } from "../src/parser.ts";

test("categorias padrão já vêm com subcategorias (Transporte tem Gasolina)", () => {
  const b = bancoVazio();
  assert.ok(b.categorias.find((c) => c.id === "c-transporte").subs.includes("Gasolina"));
  assert.deepEqual(b.categorias.find((c) => c.id === "c-outros-d").subs, undefined);
});

test("banco antigo, sem a lista guardada, ganha as subcategorias padrão; lista vazia guardada é respeitada", () => {
  const antigo = limparBanco({ contas: [], categorias: [{ id: "c-transporte", nome: "Transporte", tipo: "despesa", icone: "transporte", cor: "#34d399" }], lancamentos: [] });
  assert.deepEqual(antigo.categorias[0].subs, SUBS_PADRAO["c-transporte"]);
  const vazio = limparBanco({ contas: [], categorias: [{ id: "c-transporte", nome: "Transporte", tipo: "despesa", icone: "transporte", cor: "#34d399", subs: [] }], lancamentos: [] });
  assert.deepEqual(vazio.categorias[0].subs, []);
  const suja = limparBanco({ contas: [], categorias: [{ id: "x", nome: "X", tipo: "despesa", icone: "outros", cor: "#111111", subs: ["A", "a", "  ", 7, "B"] }], lancamentos: [] });
  assert.deepEqual(suja.categorias[0].subs, ["A", "a", "B"]);
});

test("lançamento guarda a subcategoria; transferência não", () => {
  const b0 = bancoVazio();
  const conta = b0.contas[0].id, outra = b0.contas[1].id;
  const b = limparBanco({ ...b0, lancamentos: [
    { id: "l1", tipo: "despesa", valor: 4000, data: "2026-11-17", contaId: conta, categoriaId: "c-transporte", sub: "Gasolina", nota: "", origem: "manual" },
    { id: "l2", tipo: "transferencia", valor: 100, data: "2026-11-17", contaId: conta, contaDestinoId: outra, sub: "Gasolina", nota: "", origem: "manual" },
  ] });
  assert.equal(b.lancamentos.find((l) => l.id === "l1").sub, "Gasolina");
  assert.equal(b.lancamentos.find((l) => l.id === "l2").sub, undefined);
});

test("o assistente escolhe a subcategoria que a pessoa disse", () => {
  const b = bancoVazio();
  const r = interpretar("gastei 100 de gasolina", b, "2026-11-17");
  assert.equal(r.categoriaId, "c-transporte");
  assert.equal(r.sub, "Gasolina");
  const m = interpretar("45 no mercado", b, "2026-11-17");
  assert.equal(m.sub, undefined);
});
