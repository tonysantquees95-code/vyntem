// Vênus → Vyntem: cada venda PAGA e confirmada na Vênus vira um lançamento de entrada na conta "Caixa da loja"
// (nota "Pedido #123 · Maria Souza"); venda cancelada ou devolvida vira um estorno. Pedido aguardando pagamento nunca chega aqui.
// Lógica pura (testada no Node): sem rede e sem localStorage. Dinheiro em centavos; datas AAAA-MM-DD.
import type { Banco, Categoria, Conta, Lancamento } from "./dados.ts";

export interface EntradaDaLoja { seq: number; ref: string; tipo: "entrada" | "estorno"; valorCentavos: number; cliente: string; pedido: string; data: string }

export const CONTA_DA_LOJA = "a-loja";
export const CATEGORIA_VENDAS_LOJA = "c-loja-vendas";
export const CATEGORIA_ESTORNOS_LOJA = "c-loja-estornos";
export const idDoLancamento = (e: { tipo: string; ref: string }): string => `loja-${e.tipo}-${e.ref}`;

export function notaDaEntrada(e: Pick<EntradaDaLoja, "tipo" | "cliente" | "pedido">): string {
  const numero = e.pedido ? ` #${e.pedido}` : "";
  const cliente = e.cliente.trim() ? ` · ${e.cliente.trim()}` : "";
  return `${e.tipo === "estorno" ? "Estorno do pedido" : "Pedido"}${numero}${cliente}`;
}

/** Entrada válida? (o servidor já confere; aqui é a segunda trava antes de mexer no dinheiro da pessoa.) */
export function entradaValida(e: unknown): e is EntradaDaLoja {
  if (!e || typeof e !== "object") return false;
  const x = e as Record<string, unknown>;
  return typeof x.ref === "string" && /^[\w:.\-]{1,60}$/.test(x.ref) && (x.tipo === "entrada" || x.tipo === "estorno")
    && Number.isInteger(x.valorCentavos) && (x.valorCentavos as number) > 0 && (x.valorCentavos as number) <= 100_000_000_00
    && typeof x.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.data) && typeof x.cliente === "string" && typeof x.pedido === "string" && Number.isInteger(x.seq);
}

/** Devolve o banco com as entradas lançadas. Reaplicar a mesma entrada não duplica (o id do lançamento é fixo). */
export function aplicarEntradas(banco: Banco, entradas: unknown[], agora: number = Date.now()): { banco: Banco; novos: number } {
  const validas = entradas.filter(entradaValida);
  if (!validas.length) return { banco, novos: 0 };
  const existentes = new Set(banco.lancamentos.map((l) => l.id));
  const faltam = validas.filter((e) => !existentes.has(idDoLancamento(e)));
  if (!faltam.length) return { banco, novos: 0 };
  const contas: Conta[] = banco.contas.some((c) => c.id === CONTA_DA_LOJA) ? banco.contas : [...banco.contas, { id: CONTA_DA_LOJA, nome: "Caixa da loja", tipo: "banco", saldoInicial: 0, cor: "#22d3ee", escopo: "negocio" }];
  const categorias: Categoria[] = [...banco.categorias];
  const garantir = (c: Categoria) => { if (!categorias.some((x) => x.id === c.id)) categorias.push(c); };
  if (faltam.some((e) => e.tipo === "entrada")) garantir({ id: CATEGORIA_VENDAS_LOJA, nome: "Vendas da loja", tipo: "receita", icone: "freela", cor: "#22d3ee" });
  if (faltam.some((e) => e.tipo === "estorno")) garantir({ id: CATEGORIA_ESTORNOS_LOJA, nome: "Estornos de vendas", tipo: "despesa", icone: "outros", cor: "#f87171" });
  const novos: Lancamento[] = faltam.map((e, i) => ({
    id: idDoLancamento(e), tipo: e.tipo === "entrada" ? "receita" : "despesa", valor: e.valorCentavos, data: e.data,
    contaId: CONTA_DA_LOJA, categoriaId: e.tipo === "entrada" ? CATEGORIA_VENDAS_LOJA : CATEGORIA_ESTORNOS_LOJA,
    nota: notaDaEntrada(e), origem: "manual", criadoEm: agora + i
  }));
  return { banco: { ...banco, contas, categorias, lancamentos: [...banco.lancamentos, ...novos] }, novos: novos.length };
}
