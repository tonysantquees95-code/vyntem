import test from "node:test";
import assert from "node:assert/strict";
import { NOVIDADES, novasDesde, ultimoId } from "../src/novidades.ts";
import { TERMOS, TOUR, VERSAO_DOS_TERMOS } from "../src/apresentacao.ts";

test("novidades: ids únicos e crescentes, tipos válidos e textos preenchidos", () => {
  const ids = NOVIDADES.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, "id repetido");
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b), "ids fora de ordem");
  for (const n of NOVIDADES) {
    assert.ok(["novo", "melhoria", "correcao"].includes(n.tipo), `tipo inválido em ${n.id}`);
    assert.ok(n.titulo.trim().length > 2 && n.texto.trim().length > 10, `texto curto em ${n.id}`);
    assert.match(n.data, /^\d{4}-\d{2}-\d{2}$/);
  }
});
test("novidades: mostra só o que a pessoa ainda não viu", () => {
  assert.equal(novasDesde(ultimoId()).length, 0);
  assert.equal(novasDesde(0).length, NOVIDADES.length);
});
test("apresentação: passos e termos preenchidos, versão dos termos válida", () => {
  assert.ok(TOUR.length >= 5 && TERMOS.length >= 5);
  for (const p of TOUR) assert.ok(p.titulo && p.texto && p.icone);
  assert.ok(Number.isInteger(VERSAO_DOS_TERMOS) && VERSAO_DOS_TERMOS >= 1);
});
