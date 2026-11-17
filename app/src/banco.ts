// Onde ficam os seus dados: só neste aparelho (localStorage). Nada sai daqui sem você pedir.
import { useSyncExternalStore } from "react";
import { bancoVazio, limparBanco, type Banco, type Categoria, type Conta, type Lancamento } from "./dados";

const CHAVE = "vyntem.dados";
let atual: Banco = carregar();
const ouvintes = new Set<() => void>();

function carregar(): Banco {
  try { const bruto = localStorage.getItem(CHAVE); return bruto ? limparBanco(JSON.parse(bruto)) : bancoVazio(); } catch { return bancoVazio(); }
}
let ultimoErro = "";
/** Mudança feita: guarda, avisa as telas e devolve um texto de erro se o aparelho não deixou guardar. */
function aplicar(novo: Banco): string {
  atual = novo;
  try { localStorage.setItem(CHAVE, JSON.stringify(atual)); ultimoErro = ""; } catch { ultimoErro = "Não consegui guardar: o espaço do app acabou. Apague lançamentos antigos ou fotos."; }
  ouvintes.forEach((f) => f());
  return ultimoErro;
}
export const bancoAtual = (): Banco => atual;
export const erroDeGravacao = (): string => ultimoErro;
export function assinarBanco(f: () => void): () => void { ouvintes.add(f); return () => { ouvintes.delete(f); }; }
export const useBanco = (): Banco => useSyncExternalStore(assinarBanco, bancoAtual);

export const adicionarLancamentos = (ls: Lancamento[]): string => aplicar({ ...atual, lancamentos: [...atual.lancamentos, ...ls] });
export const atualizarLancamento = (l: Lancamento): string => aplicar({ ...atual, lancamentos: atual.lancamentos.map((x) => (x.id === l.id ? l : x)) });
export const removerLancamento = (id: string): string => aplicar({ ...atual, lancamentos: atual.lancamentos.filter((x) => x.id !== id) });
/** Apaga todas as parcelas de uma compra parcelada. */
export const removerGrupo = (grupo: string): string => aplicar({ ...atual, lancamentos: atual.lancamentos.filter((x) => x.parcela?.grupo !== grupo) });

export const salvarConta = (c: Conta): string => aplicar({ ...atual, contas: atual.contas.some((x) => x.id === c.id) ? atual.contas.map((x) => (x.id === c.id ? c : x)) : [...atual.contas, c] });
export const temLancamentos = (contaId: string): boolean => atual.lancamentos.some((l) => l.contaId === contaId || l.contaDestinoId === contaId);
/** Conta com histórico não some (os lançamentos ficariam sem dono): é arquivada e some só das listas de escolha. */
export function removerOuArquivarConta(id: string): "removida" | "arquivada" {
  if (temLancamentos(id)) { aplicar({ ...atual, contas: atual.contas.map((c) => (c.id === id ? { ...c, arquivada: true } : c)) }); return "arquivada"; }
  aplicar({ ...atual, contas: atual.contas.filter((c) => c.id !== id) });
  return "removida";
}
export const salvarCategoria = (c: Categoria): string => aplicar({ ...atual, categorias: atual.categorias.some((x) => x.id === c.id) ? atual.categorias.map((x) => (x.id === c.id ? c : x)) : [...atual.categorias, c] });
export const removerCategoria = (id: string): string => aplicar({ ...atual, categorias: atual.categorias.filter((c) => c.id !== id) });

export const exportarBackup = (): string => JSON.stringify({ app: "vyntem", exportadoEm: new Date().toISOString(), ...atual });
/** Lê um backup colado. Devolve o texto do problema, ou "" se deu certo. */
export function importarBackup(texto: string): string {
  let obj: unknown;
  try { obj = JSON.parse(texto); } catch { return "Isso não parece um backup do Vyntem."; }
  if (!obj || typeof obj !== "object" || (obj as { app?: unknown }).app !== "vyntem") return "Isso não parece um backup do Vyntem.";
  const b = limparBanco(obj);
  if (!b.lancamentos.length && !(Array.isArray((obj as { lancamentos?: unknown }).lancamentos) && (obj as { lancamentos: unknown[] }).lancamentos.length === 0)) return "O backup está vazio ou estragado.";
  return aplicar(b);
}
export const apagarTudo = (): string => aplicar(bancoVazio());
