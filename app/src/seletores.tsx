import { useState } from "react";
import { Icone } from "./icones";
import { Folha } from "./ui";

const campo = "mt-1 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-borda bg-transparent px-3 text-left text-sm text-texto";
const Seta = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="flex-none text-suave" style={{ strokeWidth: "var(--icone-traco, 1.7)", strokeLinecap: "round", strokeLinejoin: "round" }} aria-hidden><path d="m6 9 6 6 6-6" /></svg>;

export interface OpcaoDeEscolha { id: string; rotulo: string; detalhe?: string }

/** Caixa de escolha no visual do app (no lugar da lista cinza do sistema): toca, abre uma folha com as opções e um ✓ na escolhida. */
export function Escolha({ rotulo, valor, opcoes, aoMudar, titulo, vazio = "Escolha…", className = "" }: { rotulo: string; valor: string; opcoes: OpcaoDeEscolha[]; aoMudar: (id: string) => void; titulo?: string; vazio?: string; className?: string }) {
  const [aberta, setAberta] = useState(false);
  const atual = opcoes.find((o) => o.id === valor);
  return (
    <div className={className}>
      <button type="button" onClick={() => setAberta(true)} aria-haspopup="dialog" aria-label={`${rotulo}: ${atual?.rotulo ?? vazio}`} className={campo}>
        <span className={`min-w-0 flex-1 truncate ${atual ? "" : "text-suave"}`}>{atual?.rotulo ?? vazio}</span><Seta />
      </button>
      <Folha aberta={aberta} titulo={titulo ?? rotulo} aoFechar={() => setAberta(false)}>
        <ul className="-mx-2 space-y-1">
          {opcoes.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => { aoMudar(o.id); setAberta(false); }} aria-pressed={o.id === valor} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 text-left text-sm transition ${o.id === valor ? "border-neon bg-neon/10 text-texto" : "border-transparent text-suave hover:bg-white/5"}`}>
                <span className="min-w-0 flex-1"><span className="block truncate">{o.rotulo}</span>{o.detalhe && <span className="block truncate text-xs text-suave">{o.detalhe}</span>}</span>
                {o.id === valor && <span className="text-neon"><Icone nome="check" tam={18} /></span>}
              </button>
            </li>
          ))}
        </ul>
      </Folha>
    </div>
  );
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const dois = (n: number) => String(n).padStart(2, "0");
const iso = (a: number, m: number, d: number) => `${a}-${dois(m + 1)}-${dois(d)}`;
export const dataCurta = (v: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : "Escolha");

/** Escolha de data num calendário do app (no lugar do seletor do sistema). Datas sempre AAAA-MM-DD, sem fuso. */
export function SeletorDeData({ valor, aoMudar, hoje, rotulo = "Data" }: { valor: string; aoMudar: (v: string) => void; hoje: string; rotulo?: string }) {
  const [aberta, setAberta] = useState(false);
  const base = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : hoje;
  const [ano, setAno] = useState(Number(base.slice(0, 4)));
  const [mes, setMes] = useState(Number(base.slice(5, 7)) - 1);
  const abrir = () => { const b = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : hoje; setAno(Number(b.slice(0, 4))); setMes(Number(b.slice(5, 7)) - 1); setAberta(true); };
  const mover = (d: number) => { const n = mes + d; if (n < 0) { setMes(11); setAno(ano - 1); } else if (n > 11) { setMes(0); setAno(ano + 1); } else setMes(n); };
  const vazios = new Date(ano, mes, 1).getDay();
  const dias = new Date(ano, mes + 1, 0).getDate();
  const escolher = (v: string) => { aoMudar(v); setAberta(false); };
  return (
    <div>
      <button type="button" onClick={abrir} aria-haspopup="dialog" aria-label={`${rotulo}: ${dataCurta(valor)}`} className={campo}><span className="num">{dataCurta(valor)}</span><Icone nome="calendario" tam={16} /></button>
      <Folha aberta={aberta} titulo={rotulo} aoFechar={() => setAberta(false)}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => mover(-1)} aria-label="Mês anterior" className="grid size-11 place-items-center rounded-xl border border-borda text-suave"><Icone nome="seta_e" tam={18} /></button>
            <div className="text-sm font-semibold">{MESES[mes]} de {ano}</div>
            <button type="button" onClick={() => mover(1)} aria-label="Próximo mês" className="grid size-11 place-items-center rounded-xl border border-borda text-suave"><Icone nome="seta_d" tam={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-suave">{DIAS.map((d, i) => <div key={i}>{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: vazios }, (_, i) => <div key={`v${i}`} />)}
            {Array.from({ length: dias }, (_, i) => {
              const v = iso(ano, mes, i + 1);
              return <button type="button" key={v} onClick={() => escolher(v)} aria-pressed={v === valor} className={`num grid aspect-square place-items-center rounded-xl text-sm transition ${v === valor ? "bg-neon font-bold text-fundo" : v === hoje ? "border border-neon text-neon" : "text-texto hover:bg-white/5"}`}>{i + 1}</button>;
            })}
          </div>
          <button type="button" onClick={() => escolher(hoje)} className="min-h-11 w-full rounded-xl border border-borda text-sm text-suave">Hoje</button>
        </div>
      </Folha>
    </div>
  );
}
