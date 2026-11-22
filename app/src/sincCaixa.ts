// Busca no servidor as vendas pagas que a Vênus mandou e lança no Vyntem. Só roda com o Vetorial ID; sem internet, tenta de novo depois.
import { chamar } from "./conta";
import { aplicarEntradas, entradaValida } from "./caixa";
import { receberVendasDaLoja } from "./banco";

const CHAVE = "vyntem.caixa.cursor";
const lerCursor = (): number => { try { return Math.max(0, Number(localStorage.getItem(CHAVE)) || 0); } catch { return 0; } };
const gravarCursor = (n: number): void => { try { localStorage.setItem(CHAVE, String(n)); } catch { /* busca de novo e o id fixo evita duplicar */ } };

let rodando = false;
/** Devolve quantos lançamentos novos entraram. */
export async function sincronizarCaixa(token: string): Promise<number> {
  if (rodando || !token) return 0;
  rodando = true;
  let total = 0;
  try {
    for (let volta = 0; volta < 20; volta++) { // até 4000 vendas por vez; o resto vem na próxima
      const r = await chamar<{ itens: unknown[]; proximo: number; maisPaginas: boolean }>("GET", `/financas/caixa?desde=${lerCursor()}`, undefined, token);
      const itens = (Array.isArray(r.itens) ? r.itens : []).filter(entradaValida);
      if (itens.length) total += receberVendasDaLoja(itens);
      if (Number.isInteger(r.proximo) && r.proximo > lerCursor()) gravarCursor(r.proximo);
      if (!r.maisPaginas) break;
    }
  } catch { /* sem conexão ou login vencido: tenta de novo na próxima vez */ } finally { rodando = false; }
  return total;
}
