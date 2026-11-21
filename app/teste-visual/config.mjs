// Telas que o teste visual visita no Vyntem.
import { readFileSync } from "node:fs";
const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const TERMOS = src("apresentacao.ts").match(/VERSAO_DOS_TERMOS\s*=\s*(\d+)/)[1];
const ABAS = [...src("App.tsx").match(/const ABAS = \[([\s\S]*?)\] as const/)[1].matchAll(/rotulo: "([^"]+)"/g)].map((m) => m[1]);

const sessao = JSON.stringify({ token: "teste", email: "teste@exemplo.com", nome: "Teste", licenca: { acesso: true, apps: { vindex: true, vortex: true, vyntem: true }, pacote: "admin", emTeste: false } });

export default {
  porta: 4181,
  guardado: (modo) => modo === "primeira" ? {} : {
    "vyntem.tour": "1", "vyntem.termos": TERMOS, "vyntem.sessao": sessao,
    "vyntem.novidades.vistas": modo === "atualizou" ? "0" : "9999",
  },
  respostas: { "/id/verificar": { licenca: { acesso: true, apps: { vindex: true, vortex: true, vyntem: true }, pacote: "admin", emTeste: false } } },
  cenarios: [
    ["primeira-abertura", "primeira", async () => {}],
    ["o-que-ha-de-novo", "atualizou", async (p) => { await p.getByText("O que há de novo").first().waitFor(); }],
    ["feedback", "normal", async (p, ajuda) => { await ajuda.aba(p, "Ajustes"); await p.getByRole("button", { name: "Enviar feedback" }).click(); await p.getByText(/^FEEDBACK/).waitFor(); await p.waitForTimeout(300); }],
    ...ABAS.map((a) => [`aba-${a.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}`, "normal", async (p, ajuda) => { await ajuda.aba(p, a); }]),
    ["novo-lancamento", "normal", async (p) => { await p.getByLabel("Novo lançamento").click(); await p.waitForTimeout(400); }],
  ],
};
