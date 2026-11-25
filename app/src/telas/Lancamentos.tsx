import { Escolha } from "../seletores";
import { useMemo, useState } from "react";
import { useBancoDaVisao as useBanco } from "../banco";
import { agruparPorDia, calendarioDoMes, DIAS_CURTOS, filtrar, hojeISO, intervalo, mesesDoAno, moverPeriodo, reaisCurto, semanasDoMes, totais, type ModoPeriodo } from "../calculos";
import type { Lancamento } from "../dados";
import { Cartao } from "../ui";
import { Chips, Dinheiro, Linha, NavegadorDePeriodo, nomeDoDia, ResumoDoPeriodo, Vazio } from "../comuns";

type Aba = "diario" | "calendario" | "semana" | "mes" | "total";
const ABAS = [{ id: "diario", rotulo: "Diário" }, { id: "calendario", rotulo: "Calendário" }, { id: "semana", rotulo: "Semana" }, { id: "mes", rotulo: "Mês" }, { id: "total", rotulo: "Total" }] as const;
const MODO: Record<Aba, ModoPeriodo> = { diario: "mes", calendario: "mes", semana: "mes", mes: "ano", total: "mes" };

/** Lista de lançamentos no jeito dos apps de referência: abas Diário / Calendário / Semana / Mês / Total e navegação por período. */
export function Lancamentos({ aoEditar }: { aoEditar: (l: Lancamento) => void }) {
  const banco = useBanco();
  const hoje = hojeISO();
  const [aba, setAba] = useState<Aba>("diario");
  const [ref, setRef] = useState(hoje);
  const [conta, setConta] = useState("");
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const modo = MODO[aba];
  const per = intervalo(modo, ref);
  const contas = banco.contas.filter((c) => !c.arquivada);
  const filtro = conta ? [conta] : undefined;
  const doPeriodo = useMemo(() => filtrar(banco.lancamentos, { de: per.de, ate: per.ate, contas: filtro }), [banco.lancamentos, per.de, per.ate, conta]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = totais(doPeriodo);
  const ano = Number(ref.slice(0, 4)), mes = Number(ref.slice(5, 7));
  const todos = useMemo(() => filtrar(banco.lancamentos, { contas: filtro }), [banco.lancamentos, conta]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <Chips itens={ABAS} valor={aba} aoMudar={(a) => { setAba(a); setDiaAberto(null); }} rotulo="Visão" />
      {aba !== "total" && <NavegadorDePeriodo rotulo={per.rotulo} aoMudar={(p) => { setRef(moverPeriodo(modo, ref, p)); setDiaAberto(null); }} aoHoje={() => setRef(hoje)} />}
      {contas.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-suave">Conta
          <Escolha className="flex-1" rotulo="Conta" titulo="Filtrar por conta" valor={conta} aoMudar={setConta} opcoes={[{ id: "", rotulo: "Todas as contas" }, ...contas.map((c) => ({ id: c.id, rotulo: c.nome }))]} /></div>
      )}
      <ResumoDoPeriodo receita={aba === "total" ? totais(todos).receita : t.receita} despesa={aba === "total" ? totais(todos).despesa : t.despesa} />

      {aba === "diario" && (doPeriodo.length === 0 ? <Vazio>Nenhum lançamento neste mês. Toque em + para começar.</Vazio> : <div className="space-y-3">{agruparPorDia(doPeriodo).map((d) => (
        <Cartao key={d.data} titulo={nomeDoDia(d.data, hoje)} acao={<span className="text-xs text-suave"><Dinheiro v={d.despesa} /></span>}>
          <div className="-mx-2">{d.itens.map((l) => <Linha key={l.id} l={l} banco={banco} aoTocar={aoEditar} />)}</div>
        </Cartao>))}</div>)}

      {aba === "calendario" && (() => {
        const celulas = calendarioDoMes(ano, mes, banco.lancamentos.filter((l) => !conta || l.contaId === conta || l.contaDestinoId === conta));
        const doDia = diaAberto ? doPeriodo.filter((l) => l.data === diaAberto) : [];
        return <>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-suave">{DIAS_CURTOS.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{celulas.map((c) => (
            <button key={c.data} disabled={!c.doMes} onClick={() => setDiaAberto(diaAberto === c.data ? null : c.data)} aria-label={`Dia ${Number(c.data.slice(8))}`}
              className={`flex min-h-16 flex-col items-center rounded-xl border p-1 text-[11px] transition ${!c.doMes ? "border-transparent opacity-0" : diaAberto === c.data ? "border-neon bg-neon/10" : c.data === hoje ? "border-neon/60" : "border-borda"}`}>
              <span className="text-xs font-semibold">{Number(c.data.slice(8))}</span>
              {c.receita > 0 && <span className="valor num w-full truncate text-neon">{reaisCurto(c.receita)}</span>}
              {c.despesa > 0 && <span className="valor num w-full truncate text-[#f87171]">{reaisCurto(c.despesa)}</span>}
            </button>))}</div>
          {diaAberto && <Cartao titulo={nomeDoDia(diaAberto, hoje)}>{doDia.length ? <div className="-mx-2">{doDia.map((l) => <Linha key={l.id} l={l} banco={banco} aoTocar={aoEditar} />)}</div> : <p className="text-sm text-suave">Nada neste dia.</p>}</Cartao>}
        </>;
      })()}

      {aba === "semana" && <div className="space-y-2">{semanasDoMes(ano, mes, banco.lancamentos.filter((l) => !conta || l.contaId === conta || l.contaDestinoId === conta)).map((s) => (
        <Cartao key={s.de}><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{s.rotulo}</span><span className="text-right text-xs"><Dinheiro v={s.receita} className="block text-neon" /><Dinheiro v={s.despesa} className="block text-[#f87171]" /></span></div></Cartao>))}</div>}

      {aba === "mes" && <div className="space-y-2">{mesesDoAno(ano, banco.lancamentos.filter((l) => !conta || l.contaId === conta || l.contaDestinoId === conta)).map((m) => (
        <button key={m.mes} onClick={() => { setRef(`${m.mes}-01`); setAba("diario"); }} className="block w-full text-left"><Cartao><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium capitalize">{m.rotulo}</span><span className="text-right text-xs"><Dinheiro v={m.receita} className="block text-neon" /><Dinheiro v={m.despesa} className="block text-[#f87171]" /></span></div></Cartao></button>))}</div>}

      {aba === "total" && (todos.length === 0 ? <Vazio>Ainda não há lançamentos.</Vazio> : <Cartao titulo="Desde o começo"><div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-suave">Lançamentos</span><b className="num">{todos.length}</b></div>
        <div className="flex justify-between"><span className="text-suave">Primeiro lançamento</span><b className="num">{todos.reduce((m, l) => (l.data < m ? l.data : m), "9999-99-99").split("-").reverse().join("/")}</b></div>
        <div className="flex justify-between"><span className="text-suave">Receitas</span><Dinheiro v={totais(todos).receita} className="font-semibold text-neon" /></div>
        <div className="flex justify-between"><span className="text-suave">Despesas</span><Dinheiro v={totais(todos).despesa} className="font-semibold text-[#f87171]" /></div>
        <div className="flex justify-between border-t border-borda pt-2"><span className="text-suave">Saldo dos lançamentos</span><Dinheiro v={totais(todos).saldo} className="font-bold" /></div></div></Cartao>)}
    </div>
  );
}
