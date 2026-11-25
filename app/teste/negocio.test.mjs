import test from "node:test";
import assert from "node:assert/strict";
import { bancoVazio, limparBanco } from "../src/dados.ts";
import { aplicarEntradas } from "../src/caixa.ts";
import * as P from "../src/pendencias.ts";
import { filtrarPorVisao } from "../src/escopo.ts";
import { montarRelatorio, pdfDoRelatorio, nomeDoArquivoDoRelatorio } from "../src/relatorio.ts";

const HOJE = "2026-11-25";
const pend = (id, tipo, valor, venc, extra = {}) => ({ id, tipo, valor, vencimento: venc, nota: `conta ${id}`, escopo: "pessoal", ...extra });
const com = (...ps) => ({ ...bancoVazio(), pendencias: ps });

test("situação e grupos: atrasada, hoje, semana, depois e paga", () => {
  const b = com(pend("a", "despesa", 100, "2026-11-20"), pend("b", "despesa", 200, HOJE), pend("c", "despesa", 300, "2026-12-01"), pend("d", "despesa", 400, "2026-12-30"), pend("e", "despesa", 500, "2026-11-01", { pagoEm: "2026-11-02" }));
  const g = P.agrupar(b.pendencias, HOJE);
  assert.deepEqual([g.atrasadas, g.hoje, g.semana, g.depois, g.pagas].map((x) => x.map((p) => p.id)), [["a"], ["b"], ["c"], ["d"], ["e"]]);
  const r = P.resumo(b.pendencias, HOJE);
  assert.equal(r.aPagarAte7, 100 + 200 + 300); // atrasada + hoje + semana
  assert.equal(r.atrasadasQtd, 1); assert.equal(r.atrasadasTotal, 100); assert.equal(r.hojeQtd, 1); assert.equal(r.abertas, 4);
});
test("a receber atrasada não entra no 'a receber em 7 dias'", () => {
  const r = P.resumo([pend("a", "receita", 100, "2026-11-20"), pend("b", "receita", 250, "2026-11-27")], HOJE);
  assert.equal(r.aReceberAte7, 250);
});
test("quandoVence fala do jeito certo", () => {
  assert.equal(P.quandoVence(pend("a", "despesa", 1, HOJE), HOJE), "vence hoje");
  assert.equal(P.quandoVence(pend("a", "despesa", 1, "2026-11-26"), HOJE), "vence amanhã");
  assert.equal(P.quandoVence(pend("a", "despesa", 1, "2026-11-22"), HOJE), "venceu há 3 dias");
  assert.equal(P.quandoVence(pend("a", "receita", 1, "2026-11-30"), HOJE), "recebe em 5 dias");
});
test("pagar cria um lançamento só (repetir não duplica) e desfazer apaga", () => {
  let b = com(pend("a", "despesa", 12345, HOJE, { categoriaId: "c-casa" }));
  b = P.pagar(b, "a", "a-banco", HOJE, 5);
  const l = b.lancamentos.find((x) => x.id === "pend-a");
  assert.equal(l.valor, 12345); assert.equal(l.tipo, "despesa"); assert.equal(l.contaId, "a-banco"); assert.equal(l.categoriaId, "c-casa");
  assert.equal(b.pendencias[0].pagoEm, HOJE);
  assert.equal(P.pagar(b, "a", "a-banco", HOJE).lancamentos.length, 1);
  b = P.desfazerPagamento(b, "a");
  assert.equal(b.lancamentos.length, 0); assert.equal(b.pendencias[0].pagoEm, undefined);
});
test("pagar numa conta que não existe não faz nada", () => {
  const b = com(pend("a", "despesa", 100, HOJE));
  assert.equal(P.pagar(b, "a", "nao-existe", HOJE), b);
});
test("lembretes: véspera às 18h e no dia às 9h, só os que ainda não passaram, sem pagos", () => {
  const agora = new Date(2026, 10, 25, 10, 0);
  const ls = P.lembretes([pend("a", "despesa", 15000, "2026-11-26"), pend("b", "despesa", 100, "2026-11-25"), pend("c", "despesa", 100, "2026-11-30", { pagoEm: "2026-11-24" })], agora);
  assert.deepEqual(ls.map((l) => new Date(l.quando).toISOString().slice(0, 16)), [new Date(2026, 10, 25, 18, 0), new Date(2026, 10, 26, 9, 0)].map((d) => d.toISOString().slice(0, 16)));
  assert.match(ls[0].corpo, /conta a · R\$\s?150,00/);
  assert.equal(new Set(ls.map((l) => l.numero)).size, ls.length);
});
test("limparBanco: pendências inválidas somem; escopo padrão pessoal e a loja é do negócio", () => {
  const b = limparBanco({ contas: [{ id: "a-loja", nome: "Caixa da loja", tipo: "banco", saldoInicial: 0, cor: "#22d3ee" }, { id: "x", nome: "X", tipo: "banco", saldoInicial: 0, cor: "#111111" }], categorias: [], lancamentos: [],
    pendencias: [pend("ok", "despesa", 500, HOJE, { escopo: "negocio", contaId: "x" }), pend("ruim", "despesa", 0, HOJE), pend("data", "despesa", 5, "2026-13-40"), { lixo: 1 }] });
  assert.equal(b.pendencias.length, 1); assert.equal(b.pendencias[0].escopo, "negocio"); assert.equal(b.pendencias[0].contaId, "x");
  assert.equal(b.contas.find((c) => c.id === "a-loja").escopo, "negocio"); assert.equal(b.contas.find((c) => c.id === "x").escopo, "pessoal");
  assert.deepEqual(limparBanco({}).pendencias, []);
});
test("visão: Negócio mostra só as contas, lançamentos e contas a pagar do negócio", () => {
  let b = aplicarEntradas(bancoVazio(), [{ seq: 1, ref: "venus:1", tipo: "entrada", valorCentavos: 10000, cliente: "A", pedido: "1", data: HOJE }], 1).banco;
  b = { ...b, lancamentos: [...b.lancamentos, { id: "p1", tipo: "despesa", valor: 3000, data: HOJE, contaId: "a-carteira", nota: "mercado", origem: "manual", criadoEm: 2 }],
    pendencias: [pend("n", "despesa", 500, HOJE, { escopo: "negocio" }), pend("p", "despesa", 900, HOJE)] };
  const n = filtrarPorVisao(b, "negocio"), p = filtrarPorVisao(b, "pessoal");
  assert.deepEqual(n.contas.map((c) => c.id), ["a-loja"]); assert.deepEqual(n.lancamentos.map((l) => l.id), ["loja-entrada-venus:1"]); assert.deepEqual(n.pendencias.map((x) => x.id), ["n"]);
  assert.ok(p.contas.every((c) => c.id !== "a-loja")); assert.deepEqual(p.lancamentos.map((l) => l.id), ["p1"]); assert.deepEqual(p.pendencias.map((x) => x.id), ["p"]);
  assert.equal(filtrarPorVisao(b, "tudo"), b);
});
test("transferência entre pessoal e negócio aparece dos dois lados", () => {
  const b = { ...bancoVazio(), contas: [{ id: "p", nome: "P", tipo: "banco", saldoInicial: 0, cor: "#111111", escopo: "pessoal" }, { id: "n", nome: "N", tipo: "banco", saldoInicial: 0, cor: "#111111", escopo: "negocio" }],
    lancamentos: [{ id: "t", tipo: "transferencia", valor: 100, data: HOJE, contaId: "p", contaDestinoId: "n", nota: "", origem: "manual", criadoEm: 1 }] };
  assert.equal(filtrarPorVisao(b, "pessoal").lancamentos.length, 1); assert.equal(filtrarPorVisao(b, "negocio").lancamentos.length, 1);
});
test("relatório do mês: totais, categorias, maiores e contas em aberto", () => {
  const b = { ...bancoVazio(), lancamentos: [
    { id: "1", tipo: "receita", valor: 500000, data: "2026-11-05", contaId: "a-banco", categoriaId: "c-vendas", nota: "vendas", origem: "manual", criadoEm: 1 },
    { id: "2", tipo: "despesa", valor: 120000, data: "2026-11-10", contaId: "a-banco", categoriaId: "c-casa", nota: "aluguel", origem: "manual", criadoEm: 2 },
    { id: "3", tipo: "despesa", valor: 30000, data: "2026-11-12", contaId: "a-banco", categoriaId: "c-mercado", nota: "feira", origem: "manual", criadoEm: 3 },
    { id: "4", tipo: "despesa", valor: 99999, data: "2026-10-30", contaId: "a-banco", categoriaId: "c-mercado", nota: "outro mês", origem: "manual", criadoEm: 4 }],
    pendencias: [pend("a", "despesa", 7000, "2026-11-28"), pend("b", "receita", 9000, "2026-11-20"), pend("c", "despesa", 1, "2026-12-20")] };
  const r = montarRelatorio(b, "2026-11-15", "tudo", HOJE);
  assert.equal(r.titulo, "Relatório de novembro de 2026");
  assert.equal(r.receita, 500000); assert.equal(r.despesa, 150000); assert.equal(r.resultado, 350000); assert.equal(r.qtdLancamentos, 3);
  assert.equal(r.despesas[0].nome, "Casa"); assert.equal(r.maiores[0].valor, 120000);
  assert.deepEqual(r.aPagar.map((x) => x.vencimento), ["2026-11-28"]); assert.equal(r.aReceber[0].atrasada, true);
  assert.equal(nomeDoArquivoDoRelatorio(r), "Relatorio-Vyntem-2026-11.pdf");
  assert.equal(nomeDoArquivoDoRelatorio({ ...r, visao: "negocio" }), "Relatorio-Vyntem-2026-11-negocio.pdf");
});
test("o PDF do relatório sai de verdade (e com acentos)", async () => {
  const r = montarRelatorio({ ...bancoVazio(), lancamentos: [{ id: "1", tipo: "despesa", valor: 4590, data: "2026-11-05", contaId: "a-banco", categoriaId: "c-mercado", nota: "Açaí e pão — feira", origem: "manual", criadoEm: 1 }] }, "2026-11-05", "tudo", HOJE);
  const pdf = await pdfDoRelatorio(r);
  assert.equal(Buffer.from(pdf.slice(0, 5)).toString(), "%PDF-"); assert.ok(pdf.length > 1500);
});
