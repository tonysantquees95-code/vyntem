// Relatório do mês: os números (lógica pura, testada) e o PDF (pdf-lib, só carregado quando a pessoa pede).
import type { Banco } from "./dados.ts";
import { MESES, diasAte, filtrar, intervalo, ordenar, porCategoria, reais, resumoDasContas, totais, fimDoMes, inicioDoMes } from "./calculos.ts";
import { filtrarPorVisao, VISOES, type Visao } from "./escopo.ts";
import { agrupar } from "./pendencias.ts";

export interface LinhaDoRelatorio { nome: string; total: number; pct: number }
export interface DadosDoRelatorio {
  titulo: string; visao: Visao; mes: string; periodo: string; geradoEm: string;
  receita: number; despesa: number; resultado: number; patrimonio: number;
  despesas: LinhaDoRelatorio[]; receitas: LinhaDoRelatorio[];
  maiores: { data: string; nota: string; categoria: string; valor: number }[];
  aPagar: { vencimento: string; nota: string; valor: number; atrasada: boolean }[];
  aReceber: { vencimento: string; nota: string; valor: number; atrasada: boolean }[];
  qtdLancamentos: number;
}
const rotuloVisao = (v: Visao): string => VISOES.find((x) => x.id === v)?.rotulo ?? "Tudo";

/** `mes` = qualquer data AAAA-MM-DD do mês; `hoje` serve para marcar o que está atrasado. */
export function montarRelatorio(bancoTodo: Banco, mes: string, visao: Visao, hoje: string): DadosDoRelatorio {
  const banco = filtrarPorVisao(bancoTodo, visao);
  const per = intervalo("mes", mes);
  const doMes = filtrar(banco.lancamentos, { de: per.de, ate: per.ate });
  const t = totais(doMes);
  const nomeCat = (id?: string) => banco.categorias.find((c) => c.id === id)?.nome ?? "Sem categoria";
  const linhas = (tipo: "despesa" | "receita"): LinhaDoRelatorio[] => porCategoria(doMes, tipo, banco.categorias).map((f) => ({ nome: f.nome, total: f.total, pct: f.pct }));
  const maiores = ordenar(doMes.filter((l) => l.tipo === "despesa")).sort((a, b) => b.valor - a.valor).slice(0, 5).map((l) => ({ data: l.data, nota: l.nota, categoria: nomeCat(l.categoriaId), valor: l.valor }));
  const g = agrupar(banco.pendencias, hoje);
  const doMesOuAtrasada = (p: { vencimento: string }) => (p.vencimento >= inicioDoMes(mes) && p.vencimento <= fimDoMes(mes)) || diasAte(hoje, p.vencimento) < 0;
  const abertas = [...g.atrasadas, ...g.hoje, ...g.semana, ...g.depois].filter(doMesOuAtrasada);
  const lin = (tipo: "despesa" | "receita") => abertas.filter((p) => p.tipo === tipo).map((p) => ({ vencimento: p.vencimento, nota: p.nota, valor: p.valor, atrasada: diasAte(hoje, p.vencimento) < 0 }));
  const [ano, m] = [mes.slice(0, 4), Number(mes.slice(5, 7))];
  return {
    titulo: `Relatório de ${MESES[m - 1]} de ${ano}`, visao, mes: mes.slice(0, 7), periodo: `${per.de} a ${per.ate}`, geradoEm: hoje,
    receita: t.receita, despesa: t.despesa, resultado: t.receita - t.despesa,
    patrimonio: resumoDasContas(banco.contas.filter((c) => !c.arquivada), banco.lancamentos).total,
    despesas: linhas("despesa"), receitas: linhas("receita"), maiores, aPagar: lin("despesa"), aReceber: lin("receita"), qtdLancamentos: doMes.filter((l) => l.tipo !== "transferencia").length,
  };
}
export const nomeDoArquivoDoRelatorio = (r: Pick<DadosDoRelatorio, "mes" | "visao">): string => `Relatorio-Vyntem-${r.mes}${r.visao === "tudo" ? "" : `-${r.visao}`}.pdf`;
export const rotuloDaVisao = rotuloVisao;
const dataBR = (d: string): string => d.split("-").reverse().join("/");

/** Desenha o relatório numa ou mais páginas A4. Só texto e linhas (fonte Helvetica); nada sai do aparelho. */
export async function pdfDoRelatorio(r: DadosDoRelatorio): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(r.titulo); doc.setCreator("Vyntem");
  const fonte = await doc.embedFont(StandardFonts.Helvetica), negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 48;
  let pag = doc.addPage([W, H]); let y = H - M;
  const roxo = rgb(0.38, 0.27, 0.75), cinza = rgb(0.4, 0.4, 0.45), preto = rgb(0.1, 0.1, 0.14), verde = rgb(0.08, 0.55, 0.38), verm = rgb(0.78, 0.2, 0.2);
  const limpar = (t: string) => t.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
  const nova = () => { pag = doc.addPage([W, H]); y = H - M; };
  const precisa = (h: number) => { if (y - h < M + 24) nova(); };
  const texto = (t: string, x: number, tam = 10, f = fonte, cor = preto) => pag.drawText(limpar(t), { x, y, size: tam, font: f, color: cor });
  const direita = (t: string, xFim: number, tam = 10, f = fonte, cor = preto) => { const s = limpar(t); pag.drawText(s, { x: xFim - f.widthOfTextAtSize(s, tam), y, size: tam, font: f, color: cor }); };
  const cortar = (t: string, larg: number, tam: number, f = fonte): string => { let s = limpar(t); while (s.length > 1 && f.widthOfTextAtSize(s, tam) > larg) s = s.slice(0, -2) + "."; return s; };
  const linha = () => { pag.drawLine({ start: { x: M, y: y - 4 }, end: { x: W - M, y: y - 4 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.9) }); };
  const secao = (t: string) => { precisa(40); y -= 22; texto(t, M, 13, negrito, roxo); y -= 6; linha(); y -= 16; };

  texto("Vyntem", M, 20, negrito, roxo); y -= 22;
  texto(r.titulo, M, 14, negrito); y -= 16;
  texto(`${rotuloVisao(r.visao)} · gerado em ${dataBR(r.geradoEm)}`, M, 9, fonte, cinza); y -= 14;
  secao("Resumo do mês");
  for (const [rot, v, cor] of [["Entradas", r.receita, verde], ["Saídas", r.despesa, verm], [r.resultado >= 0 ? "Sobrou no mês" : "Faltou no mês", Math.abs(r.resultado), r.resultado >= 0 ? verde : verm]] as const) {
    texto(rot, M, 11); direita(reais(v), W - M, 11, negrito, cor); y -= 17;
  }
  texto("Patrimônio nas contas hoje", M, 10, fonte, cinza); direita(reais(r.patrimonio), W - M, 10, fonte, cinza); y -= 12;
  texto(`${r.qtdLancamentos} lançamentos no mês`, M, 9, fonte, cinza); y -= 8;

  const tabela = (titulo: string, itens: LinhaDoRelatorio[]) => {
    if (!itens.length) return; secao(titulo);
    for (const i of itens) { precisa(18); texto(cortar(i.nome, 300, 10), M, 10); direita(`${i.pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`, W - M - 110, 9, fonte, cinza); direita(reais(i.total), W - M, 10); y -= 16; }
  };
  tabela("Saídas por categoria", r.despesas); tabela("Entradas por categoria", r.receitas);
  if (r.maiores.length) {
    secao("Maiores saídas");
    for (const m of r.maiores) { precisa(18); texto(dataBR(m.data), M, 9, fonte, cinza); texto(cortar(`${m.nota || m.categoria}`, 270, 10), M + 62, 10); direita(reais(m.valor), W - M, 10); y -= 16; }
  }
  const pend = (titulo: string, itens: DadosDoRelatorio["aPagar"]) => {
    if (!itens.length) return; secao(titulo);
    for (const i of itens) { precisa(18); texto(dataBR(i.vencimento), M, 9, fonte, i.atrasada ? verm : cinza); texto(cortar(i.nota || "Sem descrição", 270, 10), M + 62, 10); if (i.atrasada) texto("atrasada", M + 340, 8, negrito, verm); direita(reais(i.valor), W - M, 10); y -= 16; }
  };
  pend("Contas a pagar em aberto", r.aPagar); pend("Contas a receber em aberto", r.aReceber);
  y -= 14; precisa(20);
  texto("Relatório gerado pelo Vyntem no seu aparelho. Não tem valor fiscal nem contábil.", M, 8, fonte, cinza);
  return doc.save();
}
