// Telas que o teste visual visita no Vyntem.
import { readFileSync } from "node:fs";
const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const TERMOS = src("apresentacao.ts").match(/VERSAO_DOS_TERMOS\s*=\s*(\d+)/)[1];
const ABAS = [...src("App.tsx").match(/const ABAS = \[([\s\S]*?)\] as const/)[1].matchAll(/rotulo: "([^"]+)"/g)].map((m) => m[1]);

import { bancoVazio } from "../src/dados.ts";
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const em = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
// banco de exemplo: contas a vencer (atrasada, hoje, semana, depois, paga), uma conta do negócio e lançamentos do mês
const bancoComContas = () => {
  const b = bancoVazio();
  b.contas.push({ id: "a-loja", nome: "Caixa da loja", tipo: "banco", saldoInicial: 0, cor: "#22d3ee", escopo: "negocio" });
  const hoje = em(0);
  b.lancamentos.push(
    { id: "l1", tipo: "receita", valor: 350000, data: hoje, contaId: "a-banco", categoriaId: "c-salario", nota: "Salário", origem: "manual", criadoEm: 1 },
    { id: "l2", tipo: "despesa", valor: 18990, data: hoje, contaId: "a-banco", categoriaId: "c-mercado", nota: "Mercado do mês", origem: "manual", criadoEm: 2 },
    { id: "l3", tipo: "receita", valor: 128900, data: hoje, contaId: "a-loja", categoriaId: "c-vendas", nota: "Pedido #1042 · Maria Souza", origem: "manual", criadoEm: 3 });
  b.pendencias.push(
    { id: "p1", tipo: "despesa", valor: 120000, vencimento: em(-3), nota: "Aluguel da loja", escopo: "negocio", categoriaId: "c-casa" },
    { id: "p2", tipo: "despesa", valor: 8990, vencimento: em(0), nota: "Internet", escopo: "pessoal", categoriaId: "c-contas" },
    { id: "p3", tipo: "receita", valor: 45000, vencimento: em(4), nota: "Venda parcelada da Ana", escopo: "negocio" },
    { id: "p4", tipo: "despesa", valor: 30000, vencimento: em(12), nota: "Fornecedor de embalagens", escopo: "negocio" },
    { id: "p5", tipo: "despesa", valor: 15000, vencimento: em(-10), nota: "Energia", escopo: "pessoal", pagoEm: em(-9) });
  return JSON.stringify(b);
};
const sessao = JSON.stringify({ token: "teste", email: "teste@exemplo.com", nome: "Teste", licenca: { acesso: true, apps: { vindex: true, vortex: true, vyntem: true }, pacote: "admin", emTeste: false } });

export default {
  porta: 4181,
  guardado: (modo) => modo === "primeira" ? {} : {
    "vyntem.tour": "1", "vyntem.termos": TERMOS, "vyntem.sessao": sessao,
    "vyntem.novidades.vistas": modo === "atualizou" ? "0" : "9999",
    ...(modo === "contas" ? { "vyntem.dados": bancoComContas() } : {}),
  },
  respostas: { "/id/verificar": { licenca: { acesso: true, apps: { vindex: true, vortex: true, vyntem: true }, pacote: "admin", emTeste: false } } },
  cenarios: [
    ["primeira-abertura", "primeira", async () => {}],
    ["o-que-ha-de-novo", "atualizou", async (p) => { await p.getByText("O que há de novo").first().waitFor(); }],
    ["feedback", "normal", async (p, ajuda) => { await ajuda.aba(p, "Ajustes"); await p.getByRole("button", { name: "Enviar feedback" }).click(); await p.getByText(/^FEEDBACK/).waitFor(); await p.waitForTimeout(300); }],
    ...ABAS.map((a) => [`aba-${a.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}`, "normal", async (p, ajuda) => { await ajuda.aba(p, a); }]),
    ["pendencias-lista", "contas", async (p, ajuda) => { await ajuda.aba(p, "A pagar e receber"); await p.getByText("Atrasadas").first().waitFor(); await p.getByText("Aluguel da loja").first().waitFor(); await p.getByText("Pagas e recebidas").first().waitFor(); }],
    ["pendencias-nova", "contas", async (p, ajuda) => { await ajuda.aba(p, "A pagar e receber"); await p.getByRole("button", { name: "Nova conta a pagar ou receber" }).click(); await p.getByRole("dialog", { name: "Nova conta" }).waitFor(); await p.getByRole("radio", { name: "Negócio" }).click(); await p.waitForTimeout(300); }],
    ["pendencias-paguei", "contas", async (p, ajuda) => { await ajuda.aba(p, "A pagar e receber"); await p.getByRole("button", { name: "Paguei" }).first().click(); await p.getByRole("button", { name: "Confirmar pagamento" }).waitFor(); }],
    ["pendencias-paguei-lanca", "contas", async (p, ajuda) => { await ajuda.aba(p, "A pagar e receber"); await p.getByRole("button", { name: "Paguei" }).first().click(); await p.getByRole("button", { name: "Confirmar pagamento" }).click(); await p.getByText("Pagas e recebidas").first().waitFor(); await p.getByRole("button", { name: "Desfazer" }).first().waitFor(); await ajuda.aba(p, "Lançamentos"); await p.getByText("Aluguel da loja").first().waitFor(); }],
    ["inicio-contas-a-vencer", "contas", async (p) => { await p.getByText("Contas a vencer").first().waitFor(); await p.getByText("1 atrasada").first().waitFor(); }],
    ["visao-negocio", "contas", async (p) => { await p.getByRole("tab", { name: "Negócio" }).click(); if ((await p.getByRole("tab", { name: "Negócio" }).getAttribute("aria-selected")) !== "true") throw new Error("Negócio deveria aparecer escolhido"); await p.getByText("Contas a vencer").first().waitFor(); }],
    ["visao-pessoal-sem-loja", "contas", async (p, ajuda) => { await p.getByRole("tab", { name: "Pessoal" }).click(); await ajuda.aba(p, "Contas"); await p.getByText("Carteira").first().waitFor(); if (await p.getByText("Caixa da loja").count()) throw new Error("Caixa da loja não deveria aparecer no lado Pessoal"); }],
    ["conta-escopo", "contas", async (p, ajuda) => { await ajuda.aba(p, "Contas"); await p.getByRole("button", { name: /^Editar Caixa da loja/ }).click(); await p.getByText("É do quê?").first().waitFor(); const r = p.getByRole("radio", { name: "Negócio" }); if ((await r.getAttribute("aria-checked")) !== "true") throw new Error("Caixa da loja deveria estar como Negócio"); }],
    ["relatorio-pdf", "contas", async (p, ajuda) => { await ajuda.aba(p, "Gráficos"); await p.getByRole("button", { name: /Gerar relatório em PDF/ }).click(); await p.getByText("Relatório baixado na pasta de downloads.").waitFor({ timeout: 15000 }); }],
    ["novo-lancamento", "normal", async (p) => { await p.getByLabel("Novo lançamento").click(); await p.waitForTimeout(400); }],
  ],
};
