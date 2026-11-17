import { useState } from "react";
import { useBanco } from "../banco";
import { filtrar, hojeISO, intervalo, mesesDoAno, moverPeriodo, porCategoria, reais, serieMensal, totais, type ModoPeriodo } from "../calculos";
import { BarrasMensais, Cartao, LinhaDoSaldo, Rosca } from "../ui";
import { Bolinha, Chips, Dinheiro, NavegadorDePeriodo, Vazio } from "../comuns";

const PERIODOS = [{ id: "semana", rotulo: "Semana" }, { id: "mes", rotulo: "Mês" }, { id: "ano", rotulo: "Ano" }] as const;

/** Rosca por categoria, linha do saldo e barras mensais (como nos apps de referência). */
export function Graficos() {
  const banco = useBanco();
  const hoje = hojeISO();
  const [modo, setModo] = useState<Exclude<ModoPeriodo, "dia">>("mes");
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [ref, setRef] = useState(hoje);
  const per = intervalo(modo, ref);
  const doPeriodo = filtrar(banco.lancamentos, { de: per.de, ate: per.ate });
  const fatias = porCategoria(doPeriodo, tipo, banco.categorias);
  const total = fatias.reduce((s, f) => s + f.total, 0);
  const meses = mesesDoAno(Number(ref.slice(0, 4)), banco.lancamentos);
  const t = totais(doPeriodo);
  return (
    <div className="space-y-3">
      <Chips itens={PERIODOS} valor={modo} aoMudar={setModo} rotulo="Período" />
      <NavegadorDePeriodo rotulo={per.rotulo} aoMudar={(p) => setRef(moverPeriodo(modo, ref, p))} aoHoje={() => setRef(hoje)} />
      <Cartao>
        <div role="tablist" aria-label="Tipo" className="mb-3 grid grid-cols-2 gap-2">
          {([["despesa", "Despesas"], ["receita", "Receitas"]] as const).map(([id, r]) => <button key={id} role="tab" aria-selected={tipo === id} onClick={() => setTipo(id)} className={`min-h-10 rounded-xl text-sm ${tipo === id ? "bg-neon/15 text-neon" : "border border-borda text-suave"}`}>{r}</button>)}
        </div>
        {fatias.length === 0 ? <Vazio>Sem {tipo === "despesa" ? "despesas" : "receitas"} neste período.</Vazio> : <>
          <Rosca fatias={fatias} centro={reais(total)} sub={tipo === "despesa" ? "gasto no período" : "recebido no período"} />
          <ul className="mt-4 space-y-1">{fatias.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <Bolinha cat={f} tam={34} /><span className="min-w-0 flex-1 truncate text-sm">{f.nome}</span>
              <span className="num w-12 text-right text-xs text-suave">{f.pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</span>
              <Dinheiro v={f.total} className="w-24 text-right text-sm font-semibold" />
            </li>))}</ul>
        </>}
      </Cartao>
      <Cartao titulo="Saldo ao longo do tempo"><LinhaDoSaldo pontos={serieMensal(banco.lancamentos, ref, 6)} /></Cartao>
      <Cartao titulo={`Receitas e despesas em ${ref.slice(0, 4)}`}>
        <BarrasMensais pontos={meses.map((m) => ({ rotulo: m.rotulo.slice(0, 3), receita: m.receita, despesa: m.despesa }))} />
        <div className="mt-2 flex justify-center gap-4 text-xs text-suave"><span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-neon" />Receitas</span><span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-[#f87171]" />Despesas</span></div>
      </Cartao>
      <p className="px-1 text-center text-xs text-suave">No período: <Dinheiro v={t.receita} className="text-neon" /> recebidos e <Dinheiro v={t.despesa} className="text-[#f87171]" /> gastos.</p>
    </div>
  );
}
