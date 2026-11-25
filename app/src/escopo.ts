// Pessoal × Negócio: a mesma carteira, vista inteira ou só de um lado. Lógica pura (testada no Node).
import type { Banco, Escopo } from "./dados.ts";

export type Visao = "tudo" | Escopo;
export const VISOES: readonly { id: Visao; rotulo: string }[] = [{ id: "tudo", rotulo: "Tudo" }, { id: "pessoal", rotulo: "Pessoal" }, { id: "negocio", rotulo: "Negócio" }];
export const escopoDaConta = (b: Banco, contaId?: string): Escopo => b.contas.find((c) => c.id === contaId)?.escopo ?? "pessoal";

/** O banco só com o que é do lado escolhido. "tudo" devolve o mesmo banco. Transferência entre os dois lados aparece nos dois. */
export function filtrarPorVisao(banco: Banco, visao: Visao): Banco {
  if (visao === "tudo") return banco;
  const contas = banco.contas.filter((c) => (c.escopo ?? "pessoal") === visao);
  const ids = new Set(contas.map((c) => c.id));
  return {
    ...banco, contas,
    lancamentos: banco.lancamentos.filter((l) => ids.has(l.contaId) || (l.contaDestinoId !== undefined && ids.has(l.contaDestinoId))),
    pendencias: banco.pendencias.filter((p) => p.escopo === visao),
  };
}
