// Responde perguntas simples sobre as suas contas, sem internet ("quanto gastei com mercado este mês?").
// Quando a IA estiver ligada, ela cobre as perguntas mais livres; estas aqui são instantâneas e ficam no aparelho.
import type { Banco } from "./dados.ts";
import { dicasDoMes, faturaDoCartao, chaveDaFaturaAberta, filtrar, intervalo, MESES, moverPeriodo, ordenar, porCategoria, reais, saldoDaConta, somarDias, totais, type Intervalo } from "./calculos.ts";
import { semAcento } from "./parser.ts";

const PALAVRAS_DE_CATEGORIA: Record<string, string[]> = {
  "c-mercado": ["mercado", "supermercado", "feira", "padaria"], "c-restaurante": ["restaurante", "lanche", "ifood", "comida na rua", "almoco", "jantar"],
  "c-transporte": ["transporte", "uber", "gasolina", "onibus", "combustivel"], "c-contas": ["luz", "agua", "internet", "contas"], "c-saude": ["saude", "farmacia", "remedio"],
  "c-lazer": ["lazer", "cinema", "streaming"], "c-roupas": ["roupa", "roupas"], "c-educacao": ["educacao", "curso", "escola"], "c-presente": ["presente", "presentes"], "c-casa": ["casa", "aluguel"],
};

/** "este mês", "mês passado", "ontem", "em outubro", "esta semana", "este ano"… (padrão: o mês de hoje). */
export function periodoDoTexto(t: string, hoje: string): Intervalo {
  if (/\banteontem\b/.test(t)) return intervalo("dia", somarDias(hoje, -2));
  if (/\bontem\b/.test(t)) return intervalo("dia", somarDias(hoje, -1));
  if (/\bhoje\b/.test(t)) return intervalo("dia", hoje);
  if (/semana passada/.test(t)) return intervalo("semana", somarDias(hoje, -7));
  if (/\bsemana\b/.test(t)) return intervalo("semana", hoje);
  if (/mes passado|ultimo mes/.test(t)) return intervalo("mes", moverPeriodo("mes", hoje, -1));
  if (/ano passado/.test(t)) return intervalo("ano", moverPeriodo("ano", hoje, -1));
  if (/\bano\b/.test(t)) return intervalo("ano", hoje);
  for (let i = 0; i < 12; i++) {
    if (new RegExp(`\\b${semAcento(MESES[i]!)}\\b`).test(t)) {
      const ano = Number(hoje.slice(0, 4)) - (i + 1 > Number(hoje.slice(5, 7)) ? 1 : 0);
      return intervalo("mes", `${ano}-${String(i + 1).padStart(2, "0")}-01`);
    }
  }
  return intervalo("mes", hoje);
}

/** null = não entendi (a tela então tenta a IA ou pede para reformular). */
export function responder(pergunta: string, banco: Banco, hoje: string): string | null {
  const t = semAcento(pergunta);
  const lanc = banco.lancamentos;
  if (/\bsaldo\b|quanto (eu )?tenho/.test(t)) {
    const contas = banco.contas.filter((c) => !c.arquivada);
    const total = contas.reduce((s, c) => s + saldoDaConta(c, lanc), 0);
    return `Seu saldo total é ${reais(total)}.\n${contas.map((c) => `• ${c.nome}: ${reais(saldoDaConta(c, lanc))}`).join("\n")}`;
  }
  if (/fatura/.test(t)) {
    const cartoes = banco.contas.filter((c) => c.tipo === "cartao" && !c.arquivada);
    if (!cartoes.length) return "Você ainda não tem cartão cadastrado. Cadastre em Contas.";
    return cartoes.map((c) => { const f = faturaDoCartao(c, lanc, chaveDaFaturaAberta(c, hoje)); return `${c.nome}: fatura aberta de ${reais(f.total)}, vence em ${f.vencimento.slice(8)}/${f.vencimento.slice(5, 7)}.`; }).join("\n");
  }
  if (/\b(dica|dicas|resumo|como estou)\b/.test(t)) {
    const d = dicasDoMes(banco, hoje);
    return d.length ? d.map((x) => `• ${x.texto}`).join("\n") : "Ainda não tenho lançamentos suficientes para dar dicas deste mês.";
  }
  const receita = /quanto (eu )?(recebi|ganhei|entrou)/.test(t);
  const despesa = /quanto (eu )?(gastei|gasto|paguei|saiu)|gastos?\b|despesas?\b/.test(t);
  if (/maior (gasto|despesa|compra)/.test(t)) {
    const p = periodoDoTexto(t, hoje);
    const m = ordenar(filtrar(lanc, { de: p.de, ate: p.ate, tipo: "despesa" })).sort((a, b) => b.valor - a.valor)[0];
    return m ? `Sua maior despesa em ${p.rotulo} foi ${reais(m.valor)}${m.nota ? ` (${m.nota})` : ""}.` : `Não achei despesas em ${p.rotulo}.`;
  }
  if (receita || despesa) {
    const tipo = receita ? "receita" : "despesa";
    const p = periodoDoTexto(t, hoje);
    const doTipo = banco.categorias.filter((c) => c.tipo === tipo);
    let cat = doTipo.find((c) => c.nome.length >= 3 && t.includes(semAcento(c.nome)));
    if (!cat) for (const [id, palavras] of Object.entries(PALAVRAS_DE_CATEGORIA)) if (palavras.some((w) => new RegExp(`\\b${w}`).test(t))) { cat = doTipo.find((c) => c.id === id); if (cat) break; }
    const base = filtrar(lanc, { de: p.de, ate: p.ate, tipo, ...(cat ? { categorias: [cat.id] } : {}) });
    const soma = totais(base);
    const valor = tipo === "receita" ? soma.receita : soma.despesa;
    const verbo = tipo === "receita" ? "recebeu" : "gastou";
    if (!base.length) return `Não achei ${tipo === "receita" ? "receitas" : "despesas"}${cat ? ` de ${cat.nome}` : ""} em ${p.rotulo}.`;
    let r = `Você ${verbo} ${reais(valor)}${cat ? ` com ${cat.nome}` : ""} em ${p.rotulo} (${base.length} lançamento${base.length > 1 ? "s" : ""}).`;
    if (!cat) { const tops = porCategoria(base, tipo, banco.categorias).slice(0, 3); if (tops.length > 1) r += `\nMais: ${tops.map((x) => `${x.nome} ${reais(x.total)}`).join(", ")}.`; }
    return r;
  }
  return null;
}
