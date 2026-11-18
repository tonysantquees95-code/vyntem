import { useBanco } from "../banco";
import { dicasDoMes, filtrar, hojeISO, intervalo, ordenar, porCategoria, resumoDasContas, totais } from "../calculos";
import { Cartao, Rosca } from "../ui";
import { Bolinha, Dinheiro, Linha, ResumoDoPeriodo, Vazio } from "../comuns";
import type { Lancamento } from "../dados";
import { reais } from "../calculos";

/** Resumo do mês: o que entrou e saiu, rosca por categoria, dicas e os últimos lançamentos. */
export function Inicio({ ir, aoEditar }: { ir: (id: string) => void; aoEditar: (l: Lancamento) => void }) {
  const banco = useBanco();
  const hoje = hojeISO();
  const per = intervalo("mes", hoje);
  const doMes = filtrar(banco.lancamentos, { de: per.de, ate: per.ate });
  const t = totais(doMes);
  const fatias = porCategoria(doMes, "despesa", banco.categorias);
  const total = fatias.reduce((s, f) => s + f.total, 0);
  const res = resumoDasContas(banco.contas.filter((c) => !c.arquivada), banco.lancamentos);
  const dicas = dicasDoMes(banco, hoje);
  const recentes = ordenar(banco.lancamentos).slice(0, 5);
  return (
    <div className="space-y-3">
      <Cartao>
        <div className="text-center"><div className="text-[11px] uppercase tracking-[0.18em] text-suave">Patrimônio nas contas</div><Dinheiro v={res.total} className="block text-3xl font-bold" /></div>
        <div className="mt-3"><ResumoDoPeriodo receita={t.receita} despesa={t.despesa} /></div>
        <div className="mt-1 text-center text-xs capitalize text-suave">{per.rotulo}</div>
      </Cartao>
      {dicas.length > 0 && <Cartao titulo="Dicas" acao={<button onClick={() => ir("assistente")} className="text-xs text-neon">Falar com o assistente</button>}><ul className="space-y-2 text-sm">{dicas.slice(0, 2).map((d, i) => <li key={i} className={d.tom === "alerta" ? "text-aviso" : d.tom === "ok" ? "text-ok" : "text-suave"}>{d.texto}</li>)}</ul></Cartao>}
      <Cartao titulo="Gastos por categoria" acao={<button onClick={() => ir("graficos")} className="min-h-10 px-2 text-xs text-neon">Ver gráficos</button>}>
        {fatias.length === 0 ? <Vazio>Sem despesas neste mês ainda.</Vazio> : <>
          <Rosca fatias={fatias} centro={reais(total)} sub="gasto no mês" tam={170} />
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">{fatias.slice(0, 4).map((f) => <span key={f.id} className="flex items-center gap-1.5 text-xs text-suave"><Bolinha cat={f} tam={20} />{f.nome} {f.pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</span>)}</div></>}
      </Cartao>
      <Cartao titulo="Últimos lançamentos" acao={<button onClick={() => ir("lancamentos")} className="min-h-10 px-2 text-xs text-neon">Ver todos</button>}>
        {recentes.length === 0 ? <Vazio>Toque em + para fazer o primeiro lançamento, ou fale com o assistente.</Vazio> : <div className="-mx-2">{recentes.map((l) => <Linha key={l.id} l={l} banco={banco} aoTocar={aoEditar} />)}</div>}
      </Cartao>
    </div>
  );
}
