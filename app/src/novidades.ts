// "O que há de novo": a tela que aparece depois de uma atualização.
// REGRA: toda mudança que altere o que o app faz ou como se usa (função nova, melhoria de fluxo, correção) ganha uma linha AQUI,
// com id = o maior id + 1. A tela mostra só o que a pessoa ainda não viu, então não depende do número da versão.
export type TipoNovidade = "novo" | "melhoria" | "correcao";
export interface Novidade { id: number; data: string; tipo: TipoNovidade; titulo: string; texto: string }

export const NOVIDADES: Novidade[] = [
  { id: 1, data: "2026-11-17", tipo: "novo", titulo: "Nasce o Vyntem", texto: "Controle de gastos com inteligência artificial: lance por frase (“gastei 45 no mercado”), por foto da nota, veja o calendário, os gráficos por categoria, suas contas e cartões com fatura, e pergunte ao assistente como está o seu mês." },
];

export const ROTULO: Record<TipoNovidade, string> = { novo: "Novo", melhoria: "Melhorou", correcao: "Corrigido" };
export const ultimoId = (lista: Novidade[] = NOVIDADES): number => lista.reduce((m, n) => Math.max(m, n.id), 0);
/** O que a pessoa ainda não viu, da mais nova para a mais antiga. */
export const novasDesde = (visto: number, lista: Novidade[] = NOVIDADES): Novidade[] => lista.filter((n) => n.id > visto).sort((a, b) => b.id - a.id);

const CHAVE = "vyntem.novidades.vistas";
/** null = nunca guardou (primeira instalação: a apresentação já explica tudo, então não mostra o histórico). */
export function lerVisto(): number | null {
  try { const v = localStorage.getItem(CHAVE); if (v === null) return null; const n = Number(v); return Number.isInteger(n) && n >= 0 ? n : null; } catch { return null; }
}
export function marcarVisto(id: number = ultimoId()): void {
  try { localStorage.setItem(CHAVE, String(id)); } catch { /* sem armazenamento: mostra de novo na próxima vez */ }
}
