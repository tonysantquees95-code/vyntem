import type { ReactNode } from "react";
import type { Banco, Categoria, Conta, Lancamento } from "./dados";
import { IconeDeCategoria, Icone } from "./icones";
import { dataBonita, DIAS_CURTOS, reais, diaDaSemana, hojeISO, somarDias } from "./calculos";

/** Valor em reais; recebe a classe "valor" para poder ser borrado no modo "esconder valores". */
export function Dinheiro({ v, sinal = false, className = "" }: { v: number; sinal?: boolean; className?: string }) {
  return <span className={`valor num ${className}`}>{reais(v, sinal)}</span>;
}

/** Ícone de categoria dentro de uma bolinha com a cor dela. */
export function Bolinha({ cat, tam = 40 }: { cat?: Pick<Categoria, "icone" | "cor">; tam?: number }) {
  const cor = cat?.cor ?? "#94a3b8";
  return <span className="grid flex-none place-items-center rounded-full" style={{ width: tam, height: tam, background: `${cor}26`, color: cor }}><IconeDeCategoria nome={cat?.icone ?? "outros"} tam={Math.round(tam * 0.55)} /></span>;
}

export const nomeDoDia = (data: string, hoje = hojeISO()): string => {
  if (data === hoje) return "Hoje";
  if (data === somarDias(hoje, -1)) return "Ontem";
  return `${DIAS_CURTOS[diaDaSemana(data)]}, ${dataBonita(data).replace(/ de \d{4}$/, "")}`;
};

export const contaPorId = (b: Banco, id?: string): Conta | undefined => b.contas.find((c) => c.id === id);
export const categoriaPorId = (b: Banco, id?: string): Categoria | undefined => b.categorias.find((c) => c.id === id);

/** Uma linha de lançamento (categoria, nota, conta, valor). */
export function Linha({ l, banco, aoTocar }: { l: Lancamento; banco: Banco; aoTocar: (l: Lancamento) => void }) {
  const cat = categoriaPorId(banco, l.categoriaId);
  const conta = contaPorId(banco, l.contaId);
  const dest = contaPorId(banco, l.contaDestinoId);
  const titulo = l.tipo === "transferencia" ? "Transferência" : cat?.nome ?? "Sem categoria";
  const detalhe = l.tipo === "transferencia" ? `${conta?.nome ?? "?"} → ${dest?.nome ?? "?"}` : `${l.nota ? `${l.nota} · ` : ""}${conta?.nome ?? ""}`;
  const cor = l.tipo === "receita" ? "text-neon" : l.tipo === "despesa" ? "text-[#f87171]" : "text-suave";
  return (
    <button onClick={() => aoTocar(l)} className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-white/5">
      {l.tipo === "transferencia" ? <span className="grid size-10 flex-none place-items-center rounded-full bg-white/10 text-suave"><Icone nome="seta_d" tam={20} /></span> : <Bolinha cat={cat} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{titulo}{l.parcela && <span className="ml-1 text-xs font-normal text-suave">{l.parcela.n}/{l.parcela.de}</span>}</span>
        <span className="flex items-center gap-1 truncate text-xs text-suave">{l.temFoto && <Icone nome="camera" tam={12} />}{detalhe}</span>
      </span>
      <Dinheiro v={l.valor} className={`flex-none text-sm font-semibold ${cor}`} />
    </button>
  );
}

/** Setas de ‹ período › com o nome do período no meio. */
export function NavegadorDePeriodo({ rotulo, aoMudar, aoHoje }: { rotulo: string; aoMudar: (passo: number) => void; aoHoje?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <button onClick={() => aoMudar(-1)} aria-label="Período anterior" className="grid size-11 place-items-center rounded-xl text-suave hover:bg-white/5 hover:text-texto"><Icone nome="seta_e" /></button>
      <button onClick={aoHoje} className="min-h-11 flex-1 rounded-xl px-2 text-center text-base font-semibold capitalize hover:bg-white/5" aria-label={`${rotulo}. Voltar para hoje`}>{rotulo}</button>
      <button onClick={() => aoMudar(1)} aria-label="Próximo período" className="grid size-11 place-items-center rounded-xl text-suave hover:bg-white/5 hover:text-texto"><Icone nome="seta_d" /></button>
    </div>
  );
}

/** Receitas, despesas e saldo do período, no estilo dos apps de referência. */
export function ResumoDoPeriodo({ receita, despesa }: { receita: number; despesa: number }) {
  const Item = ({ r, v, c }: { r: string; v: number; c: string }) => <div className="min-w-0 flex-1 text-center"><div className="text-[11px] uppercase tracking-wider text-suave">{r}</div><Dinheiro v={v} className={`block truncate text-sm font-semibold ${c}`} /></div>;
  return <div className="flex gap-2 rounded-2xl border border-borda bg-painel/60 px-2 py-2.5"><Item r="Receitas" v={receita} c="text-neon" /><Item r="Despesas" v={despesa} c="text-[#f87171]" /><Item r="Saldo" v={receita - despesa} c="text-texto" /></div>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-borda px-4 py-8 text-center text-sm text-suave">{children}</div>;
}

export function Chips<T extends string>({ itens, valor, aoMudar, rotulo }: { itens: readonly { id: T; rotulo: string }[]; valor: T; aoMudar: (v: T) => void; rotulo: string }) {
  return (
    <div role="tablist" aria-label={rotulo} className="rolagem -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {itens.map((i) => <button key={i.id} role="tab" aria-selected={valor === i.id} onClick={() => aoMudar(i.id)} className={`min-h-10 flex-none rounded-full px-4 text-sm transition ${valor === i.id ? "bg-neon/15 text-neon" : "border border-borda text-suave"}`}>{i.rotulo}</button>)}
    </div>
  );
}
