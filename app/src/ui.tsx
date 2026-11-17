import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { registrarVoltar } from "./voltar";
import { reaisCurto, type PontoMensal } from "./calculos";

export function Cartao({ titulo, acao, children, className = "" }: { titulo?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset] backdrop-blur ${className}`}>
      {(titulo || acao) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {titulo && <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-suave">{titulo}</h2>}
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export function Botao({ variante = "suave", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "suave" | "perigo" }) {
  const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--raio-botao,0.75rem)] px-4 text-sm font-medium transition disabled:opacity-40";
  const v = variante === "primario" ? "btn-primario bg-neon/90 text-fundo hover:bg-neon" : variante === "perigo" ? "border border-erro/40 text-erro hover:bg-erro/10" : "border border-borda text-texto hover:bg-white/5";
  return <button className={`${base} ${v} ${className}`} {...p} />;
}

export function Aviso({ tom = "aviso", children }: { tom?: "ok" | "aviso" | "erro"; children: ReactNode }) {
  const t = tom === "ok" ? "border-ok/30 bg-ok/10 text-ok" : tom === "erro" ? "border-erro/30 bg-erro/10 text-erro" : "border-aviso/30 bg-aviso/10 text-aviso";
  return <div role={tom === "erro" ? "alert" : "status"} className={`rounded-xl border px-3 py-2 text-sm ${t}`}>{children}</div>;
}

/** Interruptor: o botão redondo anda de uma ponta à outra, sempre dentro da trilha. */
export function Interruptor({ ligado, aoMudar, rotulo }: { ligado: boolean; aoMudar: (v: boolean) => void; rotulo: string }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} aria-label={rotulo} onClick={() => aoMudar(!ligado)}
      className={`relative block h-8 w-14 flex-none overflow-hidden rounded-full border transition-colors ${ligado ? "border-neon bg-neon" : "border-borda bg-white/15"}`}>
      <span className={`absolute left-0 top-1/2 block size-6 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 ${ligado ? "translate-x-[1.7rem]" : "translate-x-[0.2rem]"}`} />
    </button>
  );
}

/** Janela que sobe de baixo (no celular) ou aparece no meio (no computador), no visual do app. O botão voltar do aparelho fecha. */
export function Folha({ aberta, titulo, aoFechar, children }: { aberta: boolean; titulo: string; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => (aberta ? registrarVoltar(5, () => { aoFechar(); return true; }) : undefined), [aberta, aoFechar]);
  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div onClick={aoFechar} className="absolute inset-0" />
      <div className="relative flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl border border-borda bg-painel sm:rounded-3xl">
        <header className="flex items-center justify-between gap-2 px-5 pb-2 pt-4">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button onClick={aoFechar} aria-label="Fechar" className="grid size-10 place-items-center rounded-xl text-suave hover:text-texto">✕</button>
        </header>
        <div className="rolagem min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ gráficos (SVG simples, sem biblioteca)
export interface FatiaDaRosca { id: string; cor: string; total: number }
/** Rosca: cada fatia é um traço redondo num círculo. O meio mostra o total. */
export function Rosca({ fatias, centro, sub, tam = 190 }: { fatias: FatiaDaRosca[]; centro: string; sub?: string; tam?: number }) {
  const total = fatias.reduce((s, f) => s + f.total, 0);
  const R = 70, C = 2 * Math.PI * R;
  let acumulado = 0;
  return (
    <svg viewBox="0 0 200 200" width={tam} height={tam} role="img" aria-label={`Gastos por categoria. ${centro}`} className="mx-auto block">
      <circle cx="100" cy="100" r={R} fill="none" stroke="#1c1630" strokeWidth="22" />
      {total > 0 && <g transform="rotate(-90 100 100)" fill="none" strokeWidth="22">
        {fatias.map((f) => {
          const comp = (f.total / total) * C;
          const el = <circle key={f.id} cx="100" cy="100" r={R} stroke={f.cor} strokeDasharray={`${Math.max(0, comp - (fatias.length > 1 ? 2 : 0))} ${C}`} strokeDashoffset={-acumulado} />;
          acumulado += comp;
          return el;
        })}
      </g>}
      <text x="100" y={sub ? 98 : 106} textAnchor="middle" fill="#e9e6f5" fontSize="22" fontWeight="700" className="num valor">{centro}</text>
      {sub && <text x="100" y="120" textAnchor="middle" fill="#9a93b8" fontSize="11">{sub}</text>}
    </svg>
  );
}

/** Linha do saldo acumulado mês a mês (como o "Asset Graphs" dos apps de referência). */
export function LinhaDoSaldo({ pontos }: { pontos: PontoMensal[] }) {
  if (pontos.length < 2) return null;
  const W = 320, H = 150, ex = 34, ey = 14, baixo = 24;
  const vals = pontos.map((p) => p.acumulado);
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals);
  const faixa = max - min || 1;
  const x = (i: number) => ex + (i / (pontos.length - 1)) * (W - ex - 8);
  const y = (v: number) => ey + (1 - (v - min) / faixa) * (H - ey - baixo);
  const linha = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.acumulado).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(pontos.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Saldo acumulado nos últimos meses">
      <line x1={ex} x2={W - 8} y1={y(0)} y2={y(0)} stroke="#2c2447" strokeDasharray="3 4" />
      <text x={ex - 4} y={y(max) + 4} textAnchor="end" fill="#9a93b8" fontSize="9" className="valor">{reaisCurto(max)}</text>
      {min < 0 && <text x={ex - 4} y={y(min) + 4} textAnchor="end" fill="#9a93b8" fontSize="9" className="valor">{reaisCurto(min)}</text>}
      <path d={area} fill="var(--color-neon)" opacity="0.12" />
      <path d={linha} fill="none" stroke="var(--color-neon)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((p, i) => <g key={p.mes}><circle cx={x(i)} cy={y(p.acumulado)} r={i === pontos.length - 1 ? 4.5 : 3} fill={i === pontos.length - 1 ? "#05030b" : "var(--color-neon)"} stroke="var(--color-neon)" strokeWidth="2" /><text x={x(i)} y={H - 6} textAnchor="middle" fill="#9a93b8" fontSize="10">{p.rotulo}</text></g>)}
    </svg>
  );
}

/** Barras de receita (verde-azulado) e despesa (vermelho) lado a lado, por mês. */
export function BarrasMensais({ pontos }: { pontos: { rotulo: string; receita: number; despesa: number }[] }) {
  const W = 320, H = 150, ex = 8, baixo = 22;
  const max = Math.max(1, ...pontos.flatMap((p) => [p.receita, p.despesa]));
  const larg = (W - ex * 2) / pontos.length;
  const alt = (v: number) => (v / max) * (H - baixo - 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Receitas e despesas por mês">
      {pontos.map((p, i) => {
        const x0 = ex + i * larg + larg * 0.14, w = larg * 0.34;
        return <g key={p.rotulo + i}>
          <rect x={x0} y={H - baixo - alt(p.receita)} width={w} height={Math.max(alt(p.receita), p.receita ? 2 : 0)} rx="3" fill="var(--color-neon)" />
          <rect x={x0 + w + 3} y={H - baixo - alt(p.despesa)} width={w} height={Math.max(alt(p.despesa), p.despesa ? 2 : 0)} rx="3" fill="#f87171" />
          <text x={ex + i * larg + larg / 2} y={H - 6} textAnchor="middle" fill="#9a93b8" fontSize="10">{p.rotulo}</text>
        </g>;
      })}
    </svg>
  );
}
