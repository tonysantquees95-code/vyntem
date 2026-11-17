// Inteligência artificial do Vyntem: DeepSeek para texto e Groq para ler foto de nota. As chaves ficam no servidor, nunca no app.
// Contrato em docs/IA.md. Sem servidor ou sem internet, o app cai no entendimento local (parser.ts e perguntas.ts).
import { SERVIDOR } from "./servidor";
import { sessaoGuardada } from "./conta";
import { dataValida } from "./dados";
import type { Banco } from "./dados";
import type { Rascunho } from "./parser";

export interface LeituraDeNota { valor: number; data: string; loja: string; categoriaId?: string }

async function chamar(corpo: unknown, ms = 30000): Promise<unknown> {
  const token = sessaoGuardada()?.token;
  const r = await fetch(`${SERVIDOR}/financas/ia`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(r.status === 404 ? "A inteligência artificial ainda não está ligada no servidor." : r.status === 401 ? "Entre de novo com o seu Vetorial ID." : r.status === 402 || r.status === 403 ? "O seu plano não inclui a IA do Vyntem." : r.status === 503 ? "A IA ainda não está configurada no servidor." : `A IA não respondeu (${r.status}).`);
  return r.json();
}
const resumoDeCategorias = (b: Banco) => b.categorias.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }));

/** Texto livre → rascunho de lançamento (DeepSeek). Devolve null se a IA não entendeu. */
export async function interpretarComIA(texto: string, banco: Banco, hoje: string): Promise<Partial<Rascunho> | null> {
  const j = (await chamar({ tarefa: "texto", texto: texto.slice(0, 500), hoje, categorias: resumoDeCategorias(banco), contas: banco.contas.map((c) => ({ id: c.id, nome: c.nome })) })) as Record<string, unknown>;
  const valor = Number(j.valor);
  if (!Number.isInteger(valor) || valor <= 0) return null;
  return {
    tipo: j.tipo === "receita" ? "receita" : "despesa", valor, data: dataValida(j.data) ? j.data : hoje, nota: typeof j.nota === "string" ? j.nota.slice(0, 120) : "",
    categoriaId: banco.categorias.some((c) => c.id === j.categoriaId) ? (j.categoriaId as string) : undefined,
    contaId: banco.contas.some((c) => c.id === j.contaId) ? (j.contaId as string) : undefined,
  };
}

/** Foto de nota/comprovante → valor, data e loja (Groq). `base64` sem o prefixo data:. */
export async function lerNotaComIA(base64: string, banco: Banco, hoje: string): Promise<LeituraDeNota | null> {
  const j = (await chamar({ tarefa: "foto", imagem: base64, hoje, categorias: resumoDeCategorias(banco) }, 60000)) as Record<string, unknown>;
  const valor = Number(j.valor);
  if (!Number.isInteger(valor) || valor <= 0) return null;
  return { valor, data: dataValida(j.data) ? j.data : hoje, loja: typeof j.loja === "string" ? j.loja.slice(0, 80) : "", categoriaId: banco.categorias.some((c) => c.id === j.categoriaId) ? (j.categoriaId as string) : undefined };
}

/** Pergunta livre sobre as finanças (DeepSeek), com um resumo dos números do mês — nunca a lista completa. */
export async function perguntarComIA(pergunta: string, resumo: unknown): Promise<string | null> {
  const j = (await chamar({ tarefa: "pergunta", pergunta: pergunta.slice(0, 400), resumo })) as Record<string, unknown>;
  return typeof j.resposta === "string" && j.resposta.trim() ? j.resposta.trim().slice(0, 1200) : null;
}
