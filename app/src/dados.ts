// Modelo de dados do Vyntem. Todo dinheiro é guardado em CENTAVOS (número inteiro): nada de erro de arredondamento.
export type TipoConta = "dinheiro" | "banco" | "poupanca" | "cartao";
export type TipoLancamento = "receita" | "despesa" | "transferencia";
export type OrigemLancamento = "manual" | "texto" | "foto" | "voz";

export interface Conta {
  id: string; nome: string; tipo: TipoConta; saldoInicial: number; cor: string;
  /** só cartão: limite, dia em que a fatura fecha e dia em que vence */
  limite?: number; diaFechamento?: number; diaVencimento?: number;
  arquivada?: boolean;
}
export interface Categoria { id: string; nome: string; tipo: "receita" | "despesa"; icone: string; cor: string }
export interface Parcela { grupo: string; n: number; de: number }
export interface Lancamento {
  id: string; tipo: TipoLancamento;
  /** centavos, sempre positivo */
  valor: number;
  /** AAAA-MM-DD */
  data: string; hora?: string;
  contaId: string; contaDestinoId?: string; categoriaId?: string;
  nota: string; temFoto?: boolean; origem: OrigemLancamento; parcela?: Parcela; criadoEm: number;
}
export interface Banco { versao: 1; contas: Conta[]; categorias: Categoria[]; lancamentos: Lancamento[] }

export const CORES_DE_CATEGORIA = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399", "#22d3ee", "#60a5fa", "#a78bfa", "#e879f9", "#f472b6", "#94a3b8"] as const;

/** Nomes dos ícones de categoria (o desenho fica em icones.tsx). */
export const ICONES_DE_CATEGORIA = [
  "mercado", "restaurante", "casa", "transporte", "saude", "presente", "viagem", "pet", "luz", "carro", "beleza", "esporte",
  "educacao", "lazer", "roupas", "celular", "salario", "investimento", "freela", "outros",
] as const;

export const CATEGORIAS_PADRAO: Categoria[] = [
  { id: "c-mercado", nome: "Mercado", tipo: "despesa", icone: "mercado", cor: "#60a5fa" },
  { id: "c-restaurante", nome: "Restaurantes", tipo: "despesa", icone: "restaurante", cor: "#fbbf24" },
  { id: "c-casa", nome: "Casa", tipo: "despesa", icone: "casa", cor: "#f472b6" },
  { id: "c-contas", nome: "Contas da casa", tipo: "despesa", icone: "luz", cor: "#22d3ee" },
  { id: "c-transporte", nome: "Transporte", tipo: "despesa", icone: "transporte", cor: "#34d399" },
  { id: "c-saude", nome: "Saúde", tipo: "despesa", icone: "saude", cor: "#f87171" },
  { id: "c-lazer", nome: "Lazer", tipo: "despesa", icone: "lazer", cor: "#a78bfa" },
  { id: "c-roupas", nome: "Roupas", tipo: "despesa", icone: "roupas", cor: "#e879f9" },
  { id: "c-educacao", nome: "Educação", tipo: "despesa", icone: "educacao", cor: "#a3e635" },
  { id: "c-presente", nome: "Presentes", tipo: "despesa", icone: "presente", cor: "#fb923c" },
  { id: "c-outros-d", nome: "Outros", tipo: "despesa", icone: "outros", cor: "#94a3b8" },
  { id: "c-salario", nome: "Salário", tipo: "receita", icone: "salario", cor: "#34d399" },
  { id: "c-vendas", nome: "Vendas", tipo: "receita", icone: "freela", cor: "#22d3ee" },
  { id: "c-invest", nome: "Investimentos", tipo: "receita", icone: "investimento", cor: "#a78bfa" },
  { id: "c-outros-r", nome: "Outros", tipo: "receita", icone: "outros", cor: "#94a3b8" },
];

export const CONTAS_PADRAO: Conta[] = [
  { id: "a-carteira", nome: "Carteira", tipo: "dinheiro", saldoInicial: 0, cor: "#34d399" },
  { id: "a-banco", nome: "Conta do banco", tipo: "banco", saldoInicial: 0, cor: "#60a5fa" },
];

export const bancoVazio = (): Banco => ({ versao: 1, contas: CONTAS_PADRAO.map((c) => ({ ...c })), categorias: CATEGORIAS_PADRAO.map((c) => ({ ...c })), lancamentos: [] });

const ehObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const txt = (v: unknown, max = 80): string => (typeof v === "string" ? v.slice(0, max) : "");
const inteiro = (v: unknown, padrao = 0): number => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : padrao);
const corOk = (v: unknown, padrao: string): string => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : padrao);
export const dataValida = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** Aceita qualquer coisa vinda do disco (ou de um backup colado) e devolve um banco válido. Item estragado é descartado, não derruba o app. */
export function limparBanco(v: unknown): Banco {
  if (!ehObj(v)) return bancoVazio();
  const contas: Conta[] = [];
  for (const c of Array.isArray(v.contas) ? v.contas : []) {
    if (!ehObj(c) || !txt(c.id) || !txt(c.nome)) continue;
    const tipo: TipoConta = ["dinheiro", "banco", "poupanca", "cartao"].includes(c.tipo as string) ? (c.tipo as TipoConta) : "banco";
    const conta: Conta = { id: txt(c.id), nome: txt(c.nome, 40), tipo, saldoInicial: inteiro(c.saldoInicial), cor: corOk(c.cor, "#60a5fa") };
    if (tipo === "cartao") {
      conta.limite = Math.max(0, inteiro(c.limite));
      conta.diaFechamento = Math.min(28, Math.max(1, inteiro(c.diaFechamento, 5)));
      conta.diaVencimento = Math.min(28, Math.max(1, inteiro(c.diaVencimento, 12)));
    }
    if (c.arquivada === true) conta.arquivada = true;
    contas.push(conta);
  }
  const categorias: Categoria[] = [];
  for (const c of Array.isArray(v.categorias) ? v.categorias : []) {
    if (!ehObj(c) || !txt(c.id) || !txt(c.nome)) continue;
    categorias.push({ id: txt(c.id), nome: txt(c.nome, 30), tipo: c.tipo === "receita" ? "receita" : "despesa", icone: (ICONES_DE_CATEGORIA as readonly string[]).includes(c.icone as string) ? (c.icone as string) : "outros", cor: corOk(c.cor, "#94a3b8") });
  }
  const ids = new Set(contas.map((c) => c.id));
  const lancamentos: Lancamento[] = [];
  for (const l of Array.isArray(v.lancamentos) ? v.lancamentos : []) {
    if (!ehObj(l) || !txt(l.id) || !dataValida(l.data) || !ids.has(txt(l.contaId))) continue;
    const tipo: TipoLancamento = l.tipo === "receita" || l.tipo === "transferencia" ? l.tipo : "despesa";
    const valor = Math.abs(inteiro(l.valor));
    if (valor <= 0) continue;
    if (tipo === "transferencia" && (!ids.has(txt(l.contaDestinoId)) || l.contaDestinoId === l.contaId)) continue;
    const novo: Lancamento = { id: txt(l.id), tipo, valor, data: l.data, contaId: txt(l.contaId), nota: txt(l.nota, 200), origem: ["manual", "texto", "foto", "voz"].includes(l.origem as string) ? (l.origem as OrigemLancamento) : "manual", criadoEm: inteiro(l.criadoEm) };
    if (typeof l.hora === "string" && /^\d{2}:\d{2}$/.test(l.hora)) novo.hora = l.hora;
    if (tipo === "transferencia") novo.contaDestinoId = txt(l.contaDestinoId);
    else if (txt(l.categoriaId)) novo.categoriaId = txt(l.categoriaId);
    if (l.temFoto === true) novo.temFoto = true;
    if (ehObj(l.parcela) && txt(l.parcela.grupo) && inteiro(l.parcela.n) >= 1 && inteiro(l.parcela.de) >= inteiro(l.parcela.n)) novo.parcela = { grupo: txt(l.parcela.grupo), n: inteiro(l.parcela.n), de: inteiro(l.parcela.de) };
    lancamentos.push(novo);
  }
  const base = bancoVazio();
  return { versao: 1, contas: contas.length ? contas : base.contas, categorias: categorias.length ? categorias : base.categorias, lancamentos };
}

let semente = 0;
/** Identificador curto e único o bastante para uso local. */
export const novoId = (prefixo = "x"): string => `${prefixo}-${Date.now().toString(36)}${(semente++ % 1296).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
