import { Icone } from "../icones";
import { useRef, useState } from "react";
import { aceitarTermos, marcarTourVisto, TERMOS, TOUR } from "../apresentacao";
import { marcarVisto, ultimoId } from "../novidades";
import { LogoVivo } from "../logo";

type Fase = "tour" | "permissoes" | "termos";

/** Primeira abertura: conhecer as funções, entender as permissões e aceitar os termos. */
export function Apresentacao({ aoConcluir }: { aoConcluir: () => void }) {
  const [fase, setFase] = useState<Fase>("tour");
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-fundo">
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-5 pb-4 pt-6">
        {fase === "tour" && <Tour aoTerminar={() => setFase("permissoes")} />}
        {fase === "permissoes" && <Permissoes aoVoltar={() => setFase("tour")} aoContinuar={() => setFase("termos")} />}
        {fase === "termos" && <Termos aoVoltar={() => setFase("permissoes")} aoAceitar={() => { aceitarTermos(); marcarTourVisto(); marcarVisto(ultimoId()); aoConcluir(); }} />}
      </div>
    </div>
  );
}

/** Telas passando (deslize ou botões): cada função e como usar. Também abre pelos Ajustes. */
export function Tour({ aoTerminar, rotuloFinal = "Continuar", aoFechar }: { aoTerminar: () => void; rotuloFinal?: string; aoFechar?: () => void }) {
  const [i, setI] = useState(0);
  const inicio = useRef<number | null>(null);
  const p = TOUR[i]!;
  const ultimo = i === TOUR.length - 1;
  const ir = (d: number) => setI((x) => Math.max(0, Math.min(TOUR.length - 1, x + d)));
  return (
    <div className="flex min-h-0 flex-1 flex-col" onTouchStart={(e) => { inicio.current = e.touches[0]!.clientX; }} onTouchEnd={(e) => { if (inicio.current === null) return; const dx = e.changedTouches[0]!.clientX - inicio.current; inicio.current = null; if (Math.abs(dx) > 60) ir(dx < 0 ? 1 : -1); }}>
      <div className="flex items-center justify-between"><LogoVivo tam={32} />{aoFechar ? <button onClick={aoFechar} aria-label="Fechar" className="grid min-h-10 min-w-10 place-items-center text-xl text-suave">✕</button> : <button onClick={aoTerminar} className="min-h-10 px-3 text-sm text-suave underline">Pular</button>}</div>
      <div className="rolagem flex min-h-0 flex-1 flex-col items-center [justify-content:safe_center] gap-4 overflow-y-auto text-center">
        <div className="shrink-0 grid h-24 w-24 place-items-center rounded-3xl border border-borda bg-painel text-neon shadow-[0_0_40px_-10px_var(--color-neon)]" aria-hidden><Icone nome={p.icone} tam={48} /></div>
        <h1 className="text-2xl font-extrabold">{p.titulo}</h1>
        <p className="text-suave">{p.texto}</p>
        {p.como && <ul className="w-full space-y-2 rounded-2xl border border-borda bg-painel p-4 text-left text-sm">{p.como.map((c) => <li key={c} className="flex gap-2"><span className="text-neon">›</span><span>{c}</span></li>)}</ul>}
      </div>
      <div className="mb-4 flex justify-center gap-2" aria-label={`Tela ${i + 1} de ${TOUR.length}`}>{TOUR.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-neon" : "w-3 bg-white/20"}`} />)}</div>
      <div className="flex gap-3">
        <button disabled={i === 0} onClick={() => ir(-1)} className="rounded-xl border border-borda px-5 py-3 disabled:opacity-30">‹ Voltar</button>
        <button onClick={() => (ultimo ? aoTerminar() : ir(1))} className="flex-1 rounded-xl bg-neon py-3 font-extrabold text-[#04121c]">{ultimo ? rotuloFinal : "Próximo ›"}</button>
      </div>
    </div>
  );
}

function Permissoes({ aoVoltar, aoContinuar }: { aoVoltar: () => void; aoContinuar: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div><h1 className="text-2xl font-extrabold">Permissões</h1><p className="mt-1 text-sm text-suave">O Vyntem só pede o que precisa. Veja o que é usado e por quê:</p></div>
      <div className="rolagem min-h-0 flex-1 space-y-3 overflow-y-auto">
        <div className="rounded-2xl border border-borda bg-painel p-4"><b><Icone nome="camera" tam={18} className="mr-2 inline-block align-[-0.2em] text-neon" />Câmera <span className="ml-1 rounded-full bg-neon/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neon">opcional</span></b><p className="mt-1 text-sm text-suave">Só para fotografar uma nota ou comprovante e deixar a IA lançar o gasto. O Android pergunta na primeira vez que você tocar em tirar foto. Sem ela, você ainda pode escolher uma imagem da galeria ou lançar à mão.</p></div>
        <div className="rounded-2xl border border-borda bg-painel p-4"><b><Icone nome="sino" tam={18} className="mr-2 inline-block align-[-0.2em] text-neon" />Notificações <span className="ml-1 rounded-full bg-neon/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neon">opcional</span></b><p className="mt-1 text-sm text-suave">Só para avisar na véspera e no dia do vencimento das contas a pagar e a receber que você cadastrar. O Android pergunta na primeira vez que houver uma conta para avisar. Sem ela, as contas continuam aparecendo dentro do app. Dá para desligar em Ajustes.</p></div>
        <div className="rounded-2xl border border-borda bg-painel p-4"><b><Icone nome="internet" tam={18} className="mr-2 inline-block align-[-0.2em] text-neon" />Internet</b><p className="mt-1 text-sm text-suave">Para procurar atualizações e usar a inteligência artificial (ler fotos e responder perguntas). Os seus lançamentos não são enviados para lugar nenhum.</p></div>
        <div className="rounded-2xl border border-borda bg-painel p-4"><b><Icone nome="baixar" tam={18} className="mr-2 inline-block align-[-0.2em] text-neon" />Instalar atualizações <span className="ml-1 rounded-full bg-neon/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neon">opcional</span></b><p className="mt-1 text-sm text-suave">Quando sai versão nova, o Vyntem baixa e você toca em instalar. O Android pode pedir para liberar a instalação por este app, uma vez.</p></div>
      </div>
      <div className="flex gap-3">
        <button onClick={aoVoltar} className="rounded-xl border border-borda px-5 py-3">‹ Voltar</button>
        <button onClick={aoContinuar} className="flex-1 rounded-xl bg-neon py-3 font-extrabold text-[#04121c]">Continuar</button>
      </div>
    </div>
  );
}

/** Termos de uso: na primeira vez é preciso aceitar; depois dá para reler pelos Ajustes. */
export function Termos({ aoAceitar, aoVoltar, aoFechar }: { aoAceitar?: () => void; aoVoltar?: () => void; aoFechar?: () => void }) {
  const [ok, setOk] = useState(false);
  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${aoFechar ? "fixed inset-0 z-50 bg-fundo p-5" : ""}`}>
      <h1 className="text-2xl font-extrabold">Termos de uso</h1>
      <div className="rolagem min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-borda bg-painel p-4 text-sm text-suave" tabIndex={0}>
        {TERMOS.map((t) => <section key={t.titulo}><h2 className="mb-1 font-bold text-texto">{t.titulo}</h2><p>{t.texto}</p></section>)}
      </div>
      {aoAceitar ? (
        <>
          <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-cyan-300" checked={ok} onChange={(e) => setOk(e.target.checked)} />Li e aceito os termos de uso do Vyntem.</label>
          <div className="flex gap-3">
            {aoVoltar && <button onClick={aoVoltar} className="rounded-xl border border-borda px-5 py-3">‹ Voltar</button>}
            <button disabled={!ok} onClick={aoAceitar} className="flex-1 rounded-xl bg-neon py-3 font-extrabold text-[#04121c] disabled:opacity-40">Aceitar e continuar</button>
          </div>
        </>
      ) : <button onClick={aoFechar} className="rounded-xl bg-neon py-3 font-extrabold text-[#04121c]">Fechar</button>}
    </div>
  );
}
