// Entende frases em português ("gastei 45 no mercado ontem", "recebi 1.500 de salário") sem precisar de internet.
// A IA do servidor faz o mesmo e melhor; este é o plano A (rápido, privado) e o plano B (sem internet).
import type { Banco } from "./dados.ts";
import { parseValor, somarDias, somarMeses, diasNoMes, inicioDoMes } from "./calculos.ts";

export interface Rascunho { tipo: "receita" | "despesa"; valor: number; data: string; nota: string; categoriaId?: string; contaId?: string; parcelas?: number }

export const semAcento = (t: string): string => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PALAVRAS_DE_RECEITA = ["recebi", "ganhei", "entrou", "salario", "deposito", "vendi", "venda", "rendimento", "dividendo", "reembolso", "freela"];

/** categoria padrão → palavras que indicam. A palavra vale se começa um termo do texto (mercado, mercadinho…). */
const PALAVRAS_DE_CATEGORIA: [string, string[]][] = [
  ["c-mercado", ["mercado", "supermercado", "feira", "padaria", "hortifruti", "acougue", "atacadao", "compras do mes"]],
  ["c-restaurante", ["restaurante", "lanche", "ifood", "pizza", "hamburguer", "cafe", "almoco", "jantar", "sorvete", "pastel", "marmita", "bar "]],
  ["c-transporte", ["uber", "99", "onibus", "gasolina", "combustivel", "estacionamento", "pedagio", "metro", "taxi", "passagem", "etanol"]],
  ["c-contas", ["luz", "energia", "agua", "internet", "telefone", "condominio", "gas "]],
  ["c-saude", ["farmacia", "remedio", "medico", "consulta", "dentista", "exame", "plano de saude", "hospital"]],
  ["c-lazer", ["cinema", "netflix", "spotify", "jogo", "show", "balada", "streaming", "ingresso", "viagem"]],
  ["c-roupas", ["roupa", "camisa", "tenis", "sapato", "calca", "vestido", "camiseta"]],
  ["c-educacao", ["curso", "escola", "faculdade", "livro", "mensalidade"]],
  ["c-presente", ["presente"]],
  ["c-casa", ["aluguel", "reforma", "movel", "moveis", "limpeza", "casa"]],
  ["c-salario", ["salario", "pagamento do mes", "13o", "decimo terceiro"]],
  ["c-vendas", ["venda", "vendi", "cliente", "pedido da loja"]],
  ["c-invest", ["rendimento", "dividendo", "juros", "investimento", "cdb", "tesouro"]],
];

const tem = (texto: string, palavra: string): boolean => (palavra.endsWith(" ") ? ` ${texto} `.includes(` ${palavra}`) : new RegExp(`(^|[^a-z0-9])${palavra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(texto));

/** Acha a data dita no texto e devolve o texto sem ela. */
function lerData(t: string, hoje: string): { data: string; resto: string } {
  let m: RegExpMatchArray | null;
  if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const d = Number(m[1]), mes = Number(m[2]);
    let a = m[3] ? Number(m[3]) : Number(hoje.slice(0, 4));
    if (a < 100) a += 2000;
    if (mes >= 1 && mes <= 12 && d >= 1 && d <= diasNoMes(a, mes)) return { data: `${a}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`, resto: t.replace(m[0], " ") };
  }
  if ((m = t.match(/\banteontem\b/))) return { data: somarDias(hoje, -2), resto: t.replace(m[0], " ") };
  if ((m = t.match(/\bontem\b/))) return { data: somarDias(hoje, -1), resto: t.replace(m[0], " ") };
  if ((m = t.match(/\bhoje\b/))) return { data: hoje, resto: t.replace(m[0], " ") };
  if ((m = t.match(/\bdia (\d{1,2})\b/))) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 31) {
      let base = inicioDoMes(hoje);
      if (d > Number(hoje.slice(8))) base = somarMeses(base, -1);
      if (d <= diasNoMes(Number(base.slice(0, 4)), Number(base.slice(5, 7)))) return { data: `${base.slice(0, 7)}-${String(d).padStart(2, "0")}`, resto: t.replace(m[0], " ") };
    }
  }
  return { data: hoje, resto: t };
}

export function interpretar(textoOriginal: string, banco: Banco, hoje: string): Rascunho | null {
  let t = ` ${semAcento(textoOriginal)} `.replace(/\s+/g, " ");
  // parcelas: "em 3x", "3x", "parcelado em 3 vezes"
  let parcelas: number | undefined;
  const pm = t.match(/\b(?:em |parcelad[oa] em )?(\d{1,2}) ?(?:x|vezes)\b/);
  if (pm) { const n = Number(pm[1]); if (n >= 2 && n <= 48) parcelas = n; t = t.replace(pm[0], " "); }
  const { data, resto } = lerData(t, hoje);
  t = resto;
  // valor: o primeiro número; vale mais o que vem com R$ ou "reais"
  const comMoeda = t.match(/r\$ ?(\d[\d.,]*)|(\d[\d.,]*) ?(?:reais|real|conto|pila|pilas)\b/);
  const bruto = comMoeda ? (comMoeda[1] ?? comMoeda[2]) : t.match(/\d[\d.,]*/)?.[0];
  if (!bruto) return null;
  const valor = parseValor(bruto.replace(/[.,]+$/, ""));
  if (!valor || valor <= 0) return null;
  const sem = t.replace(comMoeda ? comMoeda[0] : bruto, " ");

  const tipo: Rascunho["tipo"] = PALAVRAS_DE_RECEITA.some((p) => tem(sem, p)) ? "receita" : "despesa";
  const doTipo = banco.categorias.filter((c) => c.tipo === tipo);
  let categoriaId = doTipo.find((c) => c.nome.length >= 3 && tem(sem, semAcento(c.nome)))?.id;
  if (!categoriaId) {
    for (const [id, palavras] of PALAVRAS_DE_CATEGORIA) {
      if (!palavras.some((p) => tem(sem, p))) continue;
      const padrao = doTipo.find((c) => c.id === id);
      if (padrao) { categoriaId = padrao.id; break; }
    }
  }
  // conta: nome dito no texto; "cartão" sozinho vale se só existe um; "dinheiro" é a carteira
  const contas = banco.contas.filter((c) => !c.arquivada);
  let contaId = contas.find((c) => semAcento(c.nome).length >= 3 && tem(sem, semAcento(c.nome)))?.id;
  if (!contaId && /\bcartao\b|\bcredito\b/.test(sem)) { const cartoes = contas.filter((c) => c.tipo === "cartao"); if (cartoes.length === 1) contaId = cartoes[0]!.id; }
  if (!contaId && /\bdinheiro\b|\bem especie\b/.test(sem)) contaId = contas.find((c) => c.tipo === "dinheiro")?.id;

  const nota = limparNota(textoOriginal, bruto);
  return { tipo, valor, data, nota, ...(categoriaId ? { categoriaId } : {}), ...(contaId ? { contaId } : {}), ...(parcelas ? { parcelas } : {}) };
}

/** "Gastei R$ 45,00 no mercado ontem" → "Mercado": tira verbos, valor e data, e deixa o que descreve a compra. */
function limparNota(original: string, bruto: string): string {
  let t = original.replace(/r\$ ?/gi, "").replace(bruto, " ");
  t = t.replace(/\b(\d{1,2}\/\d{1,2}(\/\d{2,4})?|anteontem|ontem|hoje|dia \d{1,2}|em \d{1,2} ?x|\d{1,2} ?x|\d{1,2} vezes|reais|real|conto|pila|pilas)\b/gi, " ");
  t = t.replace(/\b(gastei|gasto|paguei|comprei|recebi|ganhei|entrou|pago|compra|de|do|da|dos|das|no|na|nos|nas|em|com|para|pra|um|uma|o|a|os|as|por|que|e|foi|fui|cartao|cartão)\b/gi, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1, 60) : "";
}
