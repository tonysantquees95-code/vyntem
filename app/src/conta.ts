// Vetorial ID: login único (o mesmo da Vênus), licença e limite de aparelhos vêm do servidor.
import { SERVIDOR } from "./servidor";
export { SERVIDOR };

export interface Licenca { acesso: boolean; apps?: { vindex?: boolean; vortex?: boolean; vyntem?: boolean }; pacote?: string; fimDoTeste?: number; renovar?: boolean; emTeste?: boolean; diasDeTesteRestantes?: number; diasPagosRestantes?: number; plano?: string; selo?: string }
export interface Sessao { token: string; email: string; nome: string; licenca: Licenca }
export const SITE_DA_CONTA = `${SERVIDOR}/conta.html`;
export interface Aparelho { id: string; nome: string; plataforma: string }
export type ErroDeLimite = { tipo: "sessoes"; itens: { id: string; titulo: string }[] } | { tipo: "aparelhos"; itens: { id: string; titulo: string }[] };

export class ErroConta extends Error {
  constructor(mensagem: string, public codigo = "", public limite: ErroDeLimite | null = null, public status = 0) { super(mensagem); }
}

const CHAVE_SESSAO = "vyntem.sessao";
const CHAVE_APARELHO = "vyntem.aparelho";

export function aparelhoLocal(plataforma: string): Aparelho {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE_APARELHO) ?? "null") as Aparelho | null;
    if (guardado?.id) return guardado;
  } catch { /* sem armazenamento */ }
  const id = `vyntem-${plataforma}-${Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  const nome = plataforma === "android" ? "Celular (Vyntem)" : "Computador (Vyntem)";
  const a = { id, nome, plataforma: plataforma === "demonstracao" ? "web" : plataforma };
  try { localStorage.setItem(CHAVE_APARELHO, JSON.stringify(a)); } catch { /* ok */ }
  return a;
}

export function sessaoGuardada(): Sessao | null {
  try { const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO) ?? "null") as Sessao | null; return s?.token ? s : null; } catch { return null; }
}
export function guardarSessao(s: Sessao | null): void {
  try { if (s) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); else localStorage.removeItem(CHAVE_SESSAO); } catch { /* ok */ }
}

export async function chamar<T>(metodo: string, caminho: string, corpo?: unknown, token?: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${SERVIDOR}${caminho}`, { method: metodo, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: corpo === undefined ? undefined : JSON.stringify(corpo), signal: AbortSignal.timeout(20000) });
  } catch {
    throw new ErroConta("Sem conexão com o servidor. Confira a internet.");
  }
  const d = (await r.json().catch(() => ({}))) as Record<string, any>;
  if (!r.ok) {
    let limite: ErroDeLimite | null = null;
    if (d.codigo === "limite_simultaneo") limite = { tipo: "sessoes", itens: (d.ativas ?? []).map((a: any) => ({ id: a.sessao, titulo: `${a.nome} (${a.plataforma})` })) };
    if (d.codigo === "limite_dispositivos") limite = { tipo: "aparelhos", itens: (d.dispositivos ?? []).map((x: any) => ({ id: x.id, titulo: `${x.nome} (${x.plataforma})` })) };
    throw new ErroConta(d.error || `Erro ${r.status}`, d.codigo || "", limite, r.status);
  }
  return d as T;
}

export async function entrar(email: string, senha: string, aparelho: Aparelho, extra: { encerrar?: string; remover?: string } = {}): Promise<Sessao> {
  const r = await chamar<{ token: string; usuario: { email: string; nome?: string } }>("POST", "/id/entrar", { email, senha, dispositivo: aparelho, app: "vyntem", ...extra });
  const v = await verificar(r.token);
  return { token: r.token, email: r.usuario.email, nome: r.usuario.nome ?? "", licenca: v };
}

/** Cria o Vetorial ID na hora (grátis) e já entra. */
export async function criarConta(nome: string, email: string, senha: string, aparelho: Aparelho): Promise<Sessao> {
  const r = await chamar<{ token: string; usuario: { email: string; nome?: string } }>("POST", "/id/cadastrar", { nome, email, senha, dispositivo: aparelho, app: "vyntem" });
  const v = await verificar(r.token);
  return { token: r.token, email: r.usuario.email, nome: r.usuario.nome || nome, licenca: v };
}

/** Confere o login e a licença no servidor (também renova o que for preciso). */
export async function verificar(token: string): Promise<Licenca> {
  const r = await chamar<{ licenca: Licenca }>("GET", "/id/verificar", undefined, token);
  return r.licenca;
}

export async function sair(token: string): Promise<void> {
  try { await chamar("POST", "/id/sair", {}, token); } catch { /* já saiu */ }
}

// ------------------------------------------------------------------ trava de segurança (recibo assinado conferido offline)
const CHAVE_VISTO = "vyntem.visto";
export function lerVisto(): number { try { return Number(localStorage.getItem(CHAVE_VISTO) ?? 0) || 0; } catch { return 0; } }
export function gravarVisto(agora: number): void { try { if (agora > lerVisto()) localStorage.setItem(CHAVE_VISTO, String(agora)); } catch { /* ok */ } }

/** Abre o pagamento do plano (gera a cobrança no servidor). */
export async function gerarCobranca(token: string): Promise<string> {
  const r = await chamar<{ cobranca?: { url?: string } }>("GET", "/id/licenca?gerar=1", undefined, token);
  return r.cobranca?.url ?? "";
}
