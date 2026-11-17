// Contas do Vyntem: funções puras (sem tela, sem armazenamento), por isso fáceis de testar.
import type { Categoria, Conta, Lancamento, Banco } from "./dados.ts";

// ------------------------------------------------------------ dinheiro
/** 123456 → "R$ 1.234,56" (formato brasileiro, sempre igual em qualquer aparelho). */
export function reais(centavos: number, sinal = false): string {
  const neg = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const inteiro = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cent = String(abs % 100).padStart(2, "0");
  return `${neg ? "-" : sinal && abs > 0 ? "+" : ""}R$ ${inteiro},${cent}`;
}
/** Versão curta para eixos e calendário: 1.250 → "1,3 mil". */
export function reaisCurto(centavos: number): string {
  const v = Math.abs(centavos) / 100;
  const s = centavos < 0 ? "-" : "";
  if (v >= 1_000_000) return `${s}${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 10_000) return `${s}${Math.round(v / 1000)} mil`;
  if (v >= 1000) return `${s}${(v / 1000).toFixed(1).replace(".", ",")} mil`;
  return `${s}${Math.round(v)}`;
}
/** Texto digitado pela pessoa → centavos. "45", "45,5", "1.234,56", "R$ 12,90", "1234.56". null se não for número. */
export function parseValor(texto: string): number | null {
  let t = texto.replace(/r\$/gi, "").replace(/\s+/g, "").trim();
  if (!/^\d[\d.,]*$/.test(t)) return null;
  const temPonto = t.includes("."), temVirgula = t.includes(",");
  if (temPonto && temVirgula) {
    const dec = t.lastIndexOf(",") > t.lastIndexOf(".") ? "," : ".";
    const mil = dec === "," ? "." : ",";
    t = t.split(mil).join("").replace(dec, ".");
  } else if (temVirgula) {
    if ((t.match(/,/g) ?? []).length > 1) t = t.split(",").join("");
    else t = t.replace(",", ".");
  } else if (temPonto) {
    if ((t.match(/\./g) ?? []).length > 1 || /^\d{1,3}\.\d{3}$/.test(t)) t = t.split(".").join("");
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) return null;
  return Math.round(n * 100);
}
/** Divide em parcelas que somam exatamente o total: os centavos que sobram vão para as primeiras. */
export function dividirEmParcelas(valor: number, n: number): number[] {
  const q = Math.max(1, Math.floor(n));
  const base = Math.floor(valor / q);
  const resto = valor - base * q;
  return Array.from({ length: q }, (_, i) => base + (i < resto ? 1 : 0));
}

// ------------------------------------------------------------ datas (AAAA-MM-DD, sem fuso)
const P2 = (n: number) => String(n).padStart(2, "0");
const utc = (iso: string) => { const [a, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(a!, m! - 1, d!)); };
const iso = (d: Date) => `${d.getUTCFullYear()}-${P2(d.getUTCMonth() + 1)}-${P2(d.getUTCDate())}`;
export const hojeISO = (d: Date = new Date()): string => `${d.getFullYear()}-${P2(d.getMonth() + 1)}-${P2(d.getDate())}`;
export const somarDias = (data: string, n: number): string => { const d = utc(data); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
export const diaDaSemana = (data: string): number => utc(data).getUTCDay();
export const mesDe = (data: string): string => data.slice(0, 7);
export const diasNoMes = (ano: number, mes: number): number => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
export const inicioDoMes = (data: string): string => `${data.slice(0, 7)}-01`;
export const fimDoMes = (data: string): string => `${data.slice(0, 7)}-${P2(diasNoMes(Number(data.slice(0, 4)), Number(data.slice(5, 7))))}`;
/** Soma meses mantendo o dia (ou o último dia do mês, se o mês de chegada for mais curto). */
export function somarMeses(data: string, n: number): string {
  const a = Number(data.slice(0, 4)), m = Number(data.slice(5, 7)), d = Number(data.slice(8, 10));
  const total = a * 12 + (m - 1) + n;
  const na = Math.floor(total / 12), nm = (total % 12) + 1;
  return `${na}-${P2(nm)}-${P2(Math.min(d, diasNoMes(na, nm)))}`;
}
export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"] as const;
export const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;
export const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
export const dataBonita = (data: string): string => `${Number(data.slice(8, 10))} de ${MESES[Number(data.slice(5, 7)) - 1]} de ${data.slice(0, 4)}`;

export type ModoPeriodo = "dia" | "semana" | "mes" | "ano";
export interface Intervalo { de: string; ate: string; rotulo: string }
/** O período (dia, semana de domingo a sábado, mês ou ano) que contém a data. */
export function intervalo(modo: ModoPeriodo, ref: string): Intervalo {
  if (modo === "dia") return { de: ref, ate: ref, rotulo: dataBonita(ref) };
  if (modo === "semana") {
    const de = somarDias(ref, -diaDaSemana(ref)), ate = somarDias(de, 6);
    const mesmo = de.slice(0, 7) === ate.slice(0, 7);
    return { de, ate, rotulo: mesmo ? `${Number(de.slice(8))}–${Number(ate.slice(8))} de ${MESES_CURTOS[Number(de.slice(5, 7)) - 1]}` : `${Number(de.slice(8))} ${MESES_CURTOS[Number(de.slice(5, 7)) - 1]} – ${Number(ate.slice(8))} ${MESES_CURTOS[Number(ate.slice(5, 7)) - 1]}` };
  }
  if (modo === "mes") return { de: inicioDoMes(ref), ate: fimDoMes(ref), rotulo: `${MESES[Number(ref.slice(5, 7)) - 1]} de ${ref.slice(0, 4)}` };
  return { de: `${ref.slice(0, 4)}-01-01`, ate: `${ref.slice(0, 4)}-12-31`, rotulo: ref.slice(0, 4) };
}
/** Anda para o período anterior (-1) ou seguinte (+1). */
export function moverPeriodo(modo: ModoPeriodo, ref: string, passo: number): string {
  if (modo === "dia") return somarDias(ref, passo);
  if (modo === "semana") return somarDias(ref, 7 * passo);
  if (modo === "mes") return somarMeses(inicioDoMes(ref), passo);
  return `${Number(ref.slice(0, 4)) + passo}-${ref.slice(5, 7)}-${P2(Math.min(Number(ref.slice(8, 10)), diasNoMes(Number(ref.slice(0, 4)) + passo, Number(ref.slice(5, 7)))))}`;
}

// ------------------------------------------------------------ filtros e totais
export interface Filtro { de?: string; ate?: string; contas?: string[]; categorias?: string[]; tipo?: Lancamento["tipo"]; texto?: string }
export function filtrar(lancs: readonly Lancamento[], f: Filtro = {}): Lancamento[] {
  const t = f.texto?.trim().toLowerCase();
  return lancs.filter((l) => {
    if (f.de && l.data < f.de) return false;
    if (f.ate && l.data > f.ate) return false;
    if (f.tipo && l.tipo !== f.tipo) return false;
    if (f.contas?.length && !f.contas.includes(l.contaId) && !(l.contaDestinoId && f.contas.includes(l.contaDestinoId))) return false;
    if (f.categorias?.length && !(l.categoriaId && f.categorias.includes(l.categoriaId))) return false;
    if (t && !l.nota.toLowerCase().includes(t)) return false;
    return true;
  });
}
export interface Totais { receita: number; despesa: number; saldo: number }
/** Transferência entre contas não é receita nem despesa: não entra aqui. */
export function totais(lancs: readonly Lancamento[]): Totais {
  let receita = 0, despesa = 0;
  for (const l of lancs) { if (l.tipo === "receita") receita += l.valor; else if (l.tipo === "despesa") despesa += l.valor; }
  return { receita, despesa, saldo: receita - despesa };
}
export const ordenar = (lancs: readonly Lancamento[]): Lancamento[] => [...lancs].sort((a, b) => (a.data === b.data ? b.criadoEm - a.criadoEm : a.data < b.data ? 1 : -1));

export interface Dia { data: string; itens: Lancamento[]; receita: number; despesa: number }
export function agruparPorDia(lancs: readonly Lancamento[]): Dia[] {
  const m = new Map<string, Dia>();
  for (const l of ordenar(lancs)) {
    const d = m.get(l.data) ?? { data: l.data, itens: [], receita: 0, despesa: 0 };
    d.itens.push(l);
    if (l.tipo === "receita") d.receita += l.valor; else if (l.tipo === "despesa") d.despesa += l.valor;
    m.set(l.data, d);
  }
  return [...m.values()].sort((a, b) => (a.data < b.data ? 1 : -1));
}

// ------------------------------------------------------------ contas e cartões
/** Saldo atual da conta. No cartão, o saldo é negativo: é o que ainda se deve. Pagar a fatura é uma transferência para o cartão. */
export function saldoDaConta(conta: Conta, lancs: readonly Lancamento[], ate?: string): number {
  let s = conta.saldoInicial;
  for (const l of lancs) {
    if (ate && l.data > ate) continue;
    if (l.contaId === conta.id) { if (l.tipo === "receita") s += l.valor; else s -= l.valor; }
    if (l.tipo === "transferencia" && l.contaDestinoId === conta.id) s += l.valor;
  }
  return s;
}
export interface ResumoContas { ativos: number; dividas: number; total: number }
/** Ativos (contas com saldo positivo), dívidas (cartões e saldos negativos) e total, como no quadro "Contas" dos apps de referência. */
export function resumoDasContas(contas: readonly Conta[], lancs: readonly Lancamento[]): ResumoContas {
  let ativos = 0, dividas = 0;
  for (const c of contas) { if (c.arquivada) continue; const s = saldoDaConta(c, lancs); if (s >= 0) ativos += s; else dividas += -s; }
  return { ativos, dividas, total: ativos - dividas };
}

export interface Fatura { chave: string; fechamento: string; vencimento: string; total: number; itens: Lancamento[] }
/** Mês (AAAA-MM) em que fecha a fatura que recebe uma compra feita em `data`. */
export function chaveDaFatura(data: string, diaFechamento: number): string {
  return Number(data.slice(8, 10)) <= diaFechamento ? mesDe(data) : mesDe(somarMeses(inicioDoMes(data), 1));
}
export function datasDaFatura(chave: string, diaFechamento: number, diaVencimento: number): { fechamento: string; vencimento: string } {
  const base = `${chave}-01`;
  const dia = (d: string, n: number) => `${d.slice(0, 7)}-${P2(Math.min(n, diasNoMes(Number(d.slice(0, 4)), Number(d.slice(5, 7)))))}`;
  const fechamento = dia(base, diaFechamento);
  const vencimento = diaVencimento > diaFechamento ? dia(base, diaVencimento) : dia(somarMeses(base, 1), diaVencimento);
  return { fechamento, vencimento };
}
export function faturaDoCartao(conta: Conta, lancs: readonly Lancamento[], chave: string): Fatura {
  const f = conta.diaFechamento ?? 5, v = conta.diaVencimento ?? 12;
  const itens = lancs.filter((l) => l.contaId === conta.id && l.tipo === "despesa" && chaveDaFatura(l.data, f) === chave);
  const { fechamento, vencimento } = datasDaFatura(chave, f, v);
  return { chave, fechamento, vencimento, total: itens.reduce((s, l) => s + l.valor, 0), itens: ordenar(itens) };
}
/** A fatura aberta hoje (a que ainda recebe compras). */
export const chaveDaFaturaAberta = (conta: Conta, hoje: string): string => chaveDaFatura(hoje, conta.diaFechamento ?? 5);
export const limiteDisponivel = (conta: Conta, lancs: readonly Lancamento[]): number => Math.max(0, (conta.limite ?? 0) + Math.min(0, saldoDaConta(conta, lancs)));
export const diasAte = (de: string, ate: string): number => Math.round((utc(ate).getTime() - utc(de).getTime()) / 86_400_000);

// ------------------------------------------------------------ categorias, calendário, séries
export interface FatiaDeCategoria { id: string; nome: string; cor: string; icone: string; total: number; pct: number }
export function porCategoria(lancs: readonly Lancamento[], tipo: "receita" | "despesa", categorias: readonly Categoria[]): FatiaDeCategoria[] {
  const soma = new Map<string, number>();
  for (const l of lancs) if (l.tipo === tipo) soma.set(l.categoriaId ?? "", (soma.get(l.categoriaId ?? "") ?? 0) + l.valor);
  const total = [...soma.values()].reduce((a, b) => a + b, 0);
  return [...soma.entries()].map(([id, valor]) => {
    const c = categorias.find((x) => x.id === id);
    return { id, nome: c?.nome ?? "Sem categoria", cor: c?.cor ?? "#94a3b8", icone: c?.icone ?? "outros", total: valor, pct: total ? (valor / total) * 100 : 0 };
  }).sort((a, b) => b.total - a.total);
}

export interface CelulaDoCalendario { data: string; doMes: boolean; receita: number; despesa: number; qtd: number }
/** Grade do mês começando no domingo; dias de fora do mês vêm marcados para aparecerem esmaecidos. */
export function calendarioDoMes(ano: number, mes: number, lancs: readonly Lancamento[]): CelulaDoCalendario[] {
  const primeiro = `${ano}-${P2(mes)}-01`;
  const inicio = somarDias(primeiro, -diaDaSemana(primeiro));
  const noMes = diasNoMes(ano, mes);
  const semanas = Math.ceil((diaDaSemana(primeiro) + noMes) / 7);
  const porDia = new Map<string, Dia>();
  for (const d of agruparPorDia(lancs)) porDia.set(d.data, d);
  return Array.from({ length: semanas * 7 }, (_, i) => {
    const data = somarDias(inicio, i);
    const d = porDia.get(data);
    return { data, doMes: data.slice(0, 7) === `${ano}-${P2(mes)}`, receita: d?.receita ?? 0, despesa: d?.despesa ?? 0, qtd: d?.itens.length ?? 0 };
  });
}

export interface LinhaDeSemana { de: string; ate: string; rotulo: string; receita: number; despesa: number }
/** As semanas (domingo a sábado) que tocam o mês, com os totais só do que cai dentro dele. */
export function semanasDoMes(ano: number, mes: number, lancs: readonly Lancamento[]): LinhaDeSemana[] {
  const primeiro = `${ano}-${P2(mes)}-01`, ultimo = fimDoMes(primeiro);
  const r: LinhaDeSemana[] = [];
  for (let ini = somarDias(primeiro, -diaDaSemana(primeiro)); ini <= ultimo; ini = somarDias(ini, 7)) {
    const de = ini < primeiro ? primeiro : ini, fim = somarDias(ini, 6), ate = fim > ultimo ? ultimo : fim;
    const t = totais(filtrar(lancs, { de, ate }));
    r.push({ de, ate, rotulo: `${Number(de.slice(8))} a ${Number(ate.slice(8))}`, receita: t.receita, despesa: t.despesa });
  }
  return r;
}
export interface LinhaDeMes { mes: string; rotulo: string; receita: number; despesa: number }
export function mesesDoAno(ano: number, lancs: readonly Lancamento[]): LinhaDeMes[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = `${ano}-${P2(i + 1)}`;
    const t = totais(filtrar(lancs, { de: `${mes}-01`, ate: fimDoMes(`${mes}-01`) }));
    return { mes, rotulo: MESES_CURTOS[i]!, receita: t.receita, despesa: t.despesa };
  });
}
export interface PontoMensal { mes: string; rotulo: string; receita: number; despesa: number; saldo: number; acumulado: number }
/** Últimos `n` meses até o mês de `ref`; `acumulado` é o resultado de tudo (receitas menos despesas) até o fim de cada mês. */
export function serieMensal(lancs: readonly Lancamento[], ref: string, n = 6): PontoMensal[] {
  const pontos: PontoMensal[] = [];
  const primeiro = somarMeses(inicioDoMes(ref), -(n - 1));
  let acumulado = totais(filtrar(lancs, { ate: somarDias(primeiro, -1) })).saldo;
  for (let i = 0; i < n; i++) {
    const m = somarMeses(primeiro, i);
    const t = totais(filtrar(lancs, { de: m, ate: fimDoMes(m) }));
    acumulado += t.saldo;
    pontos.push({ mes: mesDe(m), rotulo: MESES_CURTOS[Number(m.slice(5, 7)) - 1]!, receita: t.receita, despesa: t.despesa, saldo: t.saldo, acumulado });
  }
  return pontos;
}

// ------------------------------------------------------------ dicas locais (a IA, quando ligada, melhora estas)
export interface Dica { tom: "info" | "alerta" | "ok"; texto: string }
export function dicasDoMes(banco: Banco, hoje: string): Dica[] {
  const dicas: Dica[] = [];
  const mesAtual = intervalo("mes", hoje);
  const doMes = filtrar(banco.lancamentos, { de: mesAtual.de, ate: hoje });
  const dia = Number(hoje.slice(8));
  const passado = somarMeses(inicioDoMes(hoje), -1);
  const mesmoPeriodo = filtrar(banco.lancamentos, { de: passado, ate: `${mesDe(passado)}-${P2(Math.min(dia, diasNoMes(Number(passado.slice(0, 4)), Number(passado.slice(5, 7)))))}` });
  const g = totais(doMes).despesa, gp = totais(mesmoPeriodo).despesa;
  if (g > 0 && gp > 0) {
    const dif = Math.round(((g - gp) / gp) * 100);
    if (dif >= 10) dicas.push({ tom: "alerta", texto: `Você já gastou ${dif}% a mais do que no mesmo período do mês passado.` });
    else if (dif <= -10) dicas.push({ tom: "ok", texto: `Você está gastando ${-dif}% a menos do que no mesmo período do mês passado.` });
  }
  const topo = porCategoria(doMes, "despesa", banco.categorias)[0];
  if (topo && g > 0) dicas.push({ tom: "info", texto: `Sua maior despesa do mês é ${topo.nome}: ${reais(topo.total)} (${Math.round(topo.pct)}% do total).` });
  if (g > 0 && dia >= 5) {
    const projecao = Math.round((g / dia) * diasNoMes(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))));
    dicas.push({ tom: "info", texto: `No ritmo de hoje, você termina o mês com cerca de ${reais(projecao)} em despesas.` });
  }
  for (const c of banco.contas) {
    if (c.tipo !== "cartao" || c.arquivada) continue;
    const f = faturaDoCartao(c, banco.lancamentos, chaveDaFaturaAberta(c, hoje));
    const dias = diasAte(hoje, f.vencimento);
    if (f.total > 0 && dias >= 0 && dias <= 7) dicas.push({ tom: "alerta", texto: `A fatura do ${c.nome} vence ${dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`}: ${reais(f.total)}.` });
  }
  return dicas;
}

/** Cria as parcelas de uma compra parcelada: uma por mês, a partir da data da compra, com o mesmo grupo. */
export function criarParcelas(base: Omit<Lancamento, "id" | "valor" | "data" | "parcela" | "criadoEm">, valorTotal: number, n: number, dataInicial: string, novoId: () => string, agora = Date.now()): Lancamento[] {
  const grupo = novoId();
  const valores = dividirEmParcelas(valorTotal, n);
  return valores.map((valor, i) => ({ ...base, id: novoId(), valor, data: somarMeses(dataInicial, i), parcela: { grupo, n: i + 1, de: valores.length }, criadoEm: agora + i }));
}
