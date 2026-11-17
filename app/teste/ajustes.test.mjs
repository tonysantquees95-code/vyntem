import test from "node:test";
import assert from "node:assert/strict";
import { AJUSTES_PADRAO, CORES, limparAjustes, corDoTema } from "../src/ajustes.ts";

test("padrão é a menta do logo", () => {
  assert.equal(CORES[0].id, "menta"); assert.equal(AJUSTES_PADRAO.cor, "menta");
  assert.equal(corDoTema(AJUSTES_PADRAO).destaque, "#22e3c4");
});
test("limparAjustes aceita só valores válidos", () => {
  assert.deepEqual(limparAjustes(null), AJUSTES_PADRAO);
  const a = limparAjustes({ cor: "inexistente", esconderValores: "sim", autoAtualizar: false });
  assert.equal(a.cor, AJUSTES_PADRAO.cor); assert.equal(a.esconderValores, false); assert.equal(a.autoAtualizar, false);
});
