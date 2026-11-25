// Contas a pagar e a receber. Lógica pura (testada no Node): sem rede e sem localStorage. Dinheiro em centavos; datas AAAA-MM-DD.
import type { Banco, Escopo, Lancamento, Pendencia } from "./dados.ts";
import { diasAte, somarDias } from "./calculos.ts";

export type SituacaoDaPendencia = "paga" | "atrasada" | "hoje" | "semana" | "depois";
export const DIAS_DA_SEMANA = 7;

export function situacao(p: Pendencia, hoje: string): SituacaoDaPendencia {
  if (p.pagoEm) return "paga";
  const d = diasAte(hoje, p.vencimento);
  if (d < 0) return "atrasada";
  if (d === 0) return "hoje";
  return d <= DIAS_DA_SEMANA ? "semana" : "depois";
}

export interface GruposDePendencias { atrasadas: Pendencia[]; hoje: Pendencia[]; semana: Pendencia[]; depois: Pendencia[]; pagas: Pendencia[] }
const porVencimento = (a: Pendencia, b: Pendencia): number => (a.vencimento === b.vencimento ? a.id.localeCompare(b.id) : a.vencimento < b.vencimento ? -1 : 1);
export function agrupar(lista: readonly Pendencia[], hoje: string): GruposDePendencias {
  const g: GruposDePendencias = { atrasadas: [], hoje: [], semana: [], depois: [], pagas: [] };
  for (const p of lista) { const s = situacao(p, hoje); (s === "paga" ? g.pagas : s === "atrasada" ? g.atrasadas : s === "hoje" ? g.hoje : s === "semana" ? g.semana : g.depois).push(p); }
  for (const k of ["atrasadas", "hoje", "semana", "depois"] as const) g[k].sort(porVencimento);
  g.pagas.sort((a, b) => ((b.pagoEm ?? "") < (a.pagoEm ?? "") ? -1 : 1));
  return g;
}

export interface ResumoDePendencias { aPagarAte7: number; aReceberAte7: number; atrasadasQtd: number; atrasadasTotal: number; hojeQtd: number; abertas: number }
export function resumo(lista: readonly Pendencia[], hoje: string): ResumoDePendencias {
  const r: ResumoDePendencias = { aPagarAte7: 0, aReceberAte7: 0, atrasadasQtd: 0, atrasadasTotal: 0, hojeQtd: 0, abertas: 0 };
  for (const p of lista) {
    const s = situacao(p, hoje);
    if (s === "paga") continue;
    r.abertas++;
    if (s === "atrasada") { r.atrasadasQtd++; if (p.tipo === "despesa") r.atrasadasTotal += p.valor; }
    if (s === "hoje") r.hojeQtd++;
    if (s !== "depois" && p.tipo === "despesa") r.aPagarAte7 += p.valor;
    if (s !== "depois" && s !== "atrasada" && p.tipo === "receita") r.aReceberAte7 += p.valor;
  }
  return r;
}

/** Texto curto de quando vence: "vence hoje", "vence amanhã", "venceu há 3 dias", "vence em 5 dias". */
export function quandoVence(p: Pendencia, hoje: string): string {
  if (p.pagoEm) return p.tipo === "receita" ? "recebida" : "paga";
  const d = diasAte(hoje, p.vencimento);
  if (d === 0) return p.tipo === "receita" ? "recebe hoje" : "vence hoje";
  if (d === 1) return p.tipo === "receita" ? "recebe amanhã" : "vence amanhã";
  if (d === -1) return p.tipo === "receita" ? "atrasada há 1 dia" : "venceu ontem";
  if (d < 0) return p.tipo === "receita" ? `atrasada há ${-d} dias` : `venceu há ${-d} dias`;
  return p.tipo === "receita" ? `recebe em ${d} dias` : `vence em ${d} dias`;
}

export const idDoLancamentoPago = (p: { id: string }): string => `pend-${p.id}`;

/** Marca como paga/recebida: cria o lançamento (id fixo, então repetir não duplica) na conta escolhida. */
export function pagar(banco: Banco, id: string, contaId: string, data: string, agora: number = Date.now()): Banco {
  const p = banco.pendencias.find((x) => x.id === id);
  if (!p || p.pagoEm || !banco.contas.some((c) => c.id === contaId)) return banco;
  const lid = idDoLancamentoPago(p);
  const lancamentos: Lancamento[] = banco.lancamentos.some((l) => l.id === lid) ? banco.lancamentos : [...banco.lancamentos, {
    id: lid, tipo: p.tipo, valor: p.valor, data, contaId, ...(p.categoriaId ? { categoriaId: p.categoriaId } : {}), nota: p.nota, origem: "manual", criadoEm: agora
  }];
  return { ...banco, lancamentos, pendencias: banco.pendencias.map((x) => (x.id === id ? { ...x, pagoEm: data, contaId } : x)) };
}
/** Desfaz o "paguei": a conta volta a ficar em aberto e o lançamento some. */
export function desfazerPagamento(banco: Banco, id: string): Banco {
  const p = banco.pendencias.find((x) => x.id === id);
  if (!p || !p.pagoEm) return banco;
  const { pagoEm: _p, ...resto } = p; void _p;
  return { ...banco, lancamentos: banco.lancamentos.filter((l) => l.id !== idDoLancamentoPago(p)), pendencias: banco.pendencias.map((x) => (x.id === id ? resto : x)) };
}
export const salvarPendencia = (banco: Banco, p: Pendencia): Banco => ({ ...banco, pendencias: banco.pendencias.some((x) => x.id === p.id) ? banco.pendencias.map((x) => (x.id === p.id ? p : x)) : [...banco.pendencias, p] });
export const removerPendencia = (banco: Banco, id: string): Banco => ({ ...banco, pendencias: banco.pendencias.filter((x) => x.id !== id) });

export interface Lembrete { numero: number; quando: number; titulo: string; corpo: string }
/** Número estável (para a notificação do Android) a partir do id da conta + qual lembrete. */
export function numeroDoLembrete(id: string, tipo: 0 | 1): number {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1_000_000_000;
  return h * 2 + tipo;
}
const reaisTexto = (c: number): string => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/**
 * Lembretes das contas em aberto: um na véspera, às 18h, e outro no dia, às 9h (só os que ainda não passaram).
 * `agora` e as horas usam o relógio do aparelho. O texto não traz nome de cliente, só a descrição que a pessoa escreveu.
 */
export function lembretes(lista: readonly Pendencia[], agora: Date, max = 60): Lembrete[] {
  const saida: Lembrete[] = [];
  for (const p of lista) {
    if (p.pagoEm) continue;
    const [a, m, d] = p.vencimento.split("-").map(Number);
    const vespera = somarDias(p.vencimento, -1).split("-").map(Number);
    const nome = p.nota.trim() || (p.tipo === "receita" ? "Receber" : "Pagar");
    const quando: [number, 0 | 1, string, string][] = [
      [new Date(vespera[0]!, vespera[1]! - 1, vespera[2]!, 18, 0).getTime(), 0, p.tipo === "receita" ? "Receber amanhã" : "Conta vence amanhã", `${nome} · ${reaisTexto(p.valor)}`],
      [new Date(a!, m! - 1, d!, 9, 0).getTime(), 1, p.tipo === "receita" ? "Receber hoje" : "Conta vence hoje", `${nome} · ${reaisTexto(p.valor)}`],
    ];
    for (const [t, tipo, titulo, corpo] of quando) if (t > agora.getTime()) saida.push({ numero: numeroDoLembrete(p.id, tipo), quando: t, titulo, corpo });
  }
  return saida.sort((x, y) => x.quando - y.quando).slice(0, max);
}
export type { Escopo };
