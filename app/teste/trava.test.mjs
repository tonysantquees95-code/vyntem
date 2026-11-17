import test from "node:test";
import assert from "node:assert/strict";
import { avaliar, lerSelo } from "../src/trava.ts";

test("sem recibo ou com recibo falso, o app pede para confirmar com o servidor", () => {
  assert.deepEqual(avaliar(undefined, 1000, 0), { tipo: "validar_online", motivo: "sem_selo" });
  assert.equal(lerSelo("abc.def", "x".repeat(43)), null);
  assert.deepEqual(avaliar("lixo.lixo", 1000, 0, undefined, "A".repeat(43)), { tipo: "validar_online", motivo: "invalido" });
});
