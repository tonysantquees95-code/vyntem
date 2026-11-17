import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { instalarVoltar, registrarVoltar } from "./voltar";
import { useMotor } from "./estado";
import { AtualizacaoAviso } from "./AtualizacaoAviso";
import { BUILD, haNovaVersao, precisaConferir, procurarVersao, type InfoVersao } from "./atualizacao";
import { SERVIDOR } from "./servidor";
import { aparelhoLocal, ErroConta, gravarVisto, guardarSessao, lerVisto, sair, sessaoGuardada, verificar, type Sessao } from "./conta";
import { avaliar } from "./trava";
import { Conta } from "./telas/Conta";
import { MinhaConta } from "./telas/MinhaConta";
import { TelaConfirmando, TelaTesteAcabou } from "./telas/Trava";
import { useAjustes } from "./usarAjustes";
import { Icone, type NomeIcone } from "./icones";
import { Aviso } from "./ui";
import { LogoVivo } from "./logo";
import { precisaApresentar } from "./apresentacao";
import { lerVisto as lerNovidadesVistas, novasDesde, type Novidade } from "./novidades";
import { Apresentacao } from "./telas/Apresentacao";
import { Novidades } from "./telas/Novidades";
import { AjustesTela } from "./telas/Ajustes";
import { Inicio } from "./telas/Inicio";
import { Lancamentos } from "./telas/Lancamentos";
import { Graficos } from "./telas/Graficos";
import { Contas } from "./telas/Contas";
import { Categorias } from "./telas/Categorias";
import { Assistente } from "./telas/Assistente";
import { NovoLancamento, type PedidoDeLancamento } from "./telas/NovoLancamento";
import { erroDeGravacao, useBanco } from "./banco";

const ABAS = [
  { id: "inicio", rotulo: "Início", icone: "inicio" },
  { id: "lancamentos", rotulo: "Lançamentos", icone: "lancamentos" },
  { id: "graficos", rotulo: "Gráficos", icone: "graficos" },
  { id: "contas", rotulo: "Contas", icone: "contas" },
  { id: "categorias", rotulo: "Categorias", icone: "categorias" },
  { id: "assistente", rotulo: "Assistente", icone: "assistente" },
  { id: "ajustes", rotulo: "Ajustes", icone: "ajustes" },
  { id: "conta", rotulo: "Conta", icone: "conta" },
] as const satisfies readonly { id: string; rotulo: string; icone: NomeIcone }[];
type IdAba = (typeof ABAS)[number]["id"];
const ATALHOS: readonly IdAba[] = ["inicio", "lancamentos", "graficos", "assistente"];

export function App() {
  const motor = useMotor();
  const demo = motor.plataforma === "demonstracao";
  const [ajustes, definirAjustes] = useAjustes();
  useBanco();
  const [sessao, setSessao] = useState<Sessao | null>(sessaoGuardada);
  const [relogio, setRelogio] = useState(() => Date.now());
  const definirSessao = (s: Sessao | null) => { guardarSessao(s); setSessao(s); };
  // Ao abrir: confere de novo o login e a licença no servidor (sem internet, vale o recibo assinado).
  useEffect(() => {
    if (!sessao) return;
    verificar(sessao.token).then((licenca) => definirSessao({ ...sessao, licenca })).catch((e) => { if (e instanceof ErroConta && e.status === 401) definirSessao(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { const i = setInterval(() => setRelogio(Date.now()), 60_000); return () => clearInterval(i); }, []);
  const estadoTrava = sessao ? avaliar(sessao.licenca.selo, relogio, lerVisto()) : null;
  useEffect(() => { if (estadoTrava && estadoTrava.tipo !== "validar_online") gravarVisto(relogio); }, [estadoTrava?.tipo, relogio]); // eslint-disable-line react-hooks/exhaustive-deps
  const revalidar = async () => { if (!sessao) return; try { definirSessao({ ...sessao, licenca: await verificar(sessao.token) }); setRelogio(Date.now()); } catch (e) { if (e instanceof ErroConta && e.status === 401) definirSessao(null); } };
  const sairDaConta = () => { if (sessao) void sair(sessao.token); definirSessao(null); };
  const [aba, setAba] = useState<IdAba>("inicio");
  const [menu, setMenu] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [pedido, setPedido] = useState<PedidoDeLancamento | null>(null);
  const [apresentar, setApresentar] = useState(() => precisaApresentar());
  const [novidades, setNovidades] = useState<Novidade[]>(() => { const v = lerNovidadesVistas(); return v === null ? [] : novasDesde(v); });
  const [nova, setNova] = useState<InfoVersao | null>(null);
  const [baixarAgora, setBaixarAgora] = useState(0);
  const [avisoAtualizacao, setAvisoAtualizacao] = useState("");
  const [espiar, setEspiar] = useState(false);
  const inicioToque = useRef<number | null>(null);

  useEffect(() => { instalarVoltar(() => { setSaindo(true); window.setTimeout(() => setSaindo(false), 2500); }); }, []);
  useEffect(() => registrarVoltar(1, () => { if (aba !== "inicio") { setAba("inicio"); return true; } return false; }), [aba]);
  useEffect(() => (menu ? registrarVoltar(3, () => { setMenu(false); return true; }) : undefined), [menu]);
  useEffect(() => { document.documentElement.dataset.privado = ajustes.esconderValores && !espiar ? "1" : "0"; }, [ajustes.esconderValores, espiar]);

  const atualizar = useCallback(async (v: InfoVersao) => {
    setAvisoAtualizacao(motor.recursos.atualizaSozinho ? "Baixando a versão nova…" : "");
    try {
      if (motor.recursos.atualizaSozinho) { await motor.instalarAtualizacao(v.url, v.sha256); setAvisoAtualizacao(motor.plataforma === "android" ? "Pronto: toque em Instalar na tela do Android que abriu." : "Baixando a versão nova: o Vyntem vai fechar, atualizar e abrir de novo sozinho."); }
      else await motor.abrirLink(v.url);
    } catch (e) { setAvisoAtualizacao(e instanceof Error ? e.message : typeof e === "string" ? e : "Não consegui atualizar agora."); }
  }, [motor]);

  // Procura versão nova ao abrir e a cada 6 horas.
  useEffect(() => {
    if (demo || !BUILD) return;
    let vivo = true;
    const ciclo = async () => {
      let ultimo = 0;
      try { ultimo = Number(localStorage.getItem("vyntem.atualizacao.ultima") ?? 0); } catch { /* ok */ }
      if (!precisaConferir(ultimo, Date.now()) && !nova) return;
      try {
        const v = await procurarVersao(SERVIDOR, motor.plataforma === "android" ? "vyntem-android" : "vyntem-windows");
        try { localStorage.setItem("vyntem.atualizacao.ultima", String(Date.now())); } catch { /* ok */ }
        if (vivo && v && haNovaVersao(BUILD, v.numero)) setNova(v);
      } catch { /* sem internet: tenta no próximo ciclo */ }
    };
    void ciclo();
    const t = setInterval(() => void ciclo(), 30 * 60_000);
    return () => { vivo = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, demo, ajustes.autoAtualizar]);

  if (apresentar) return <Apresentacao aoConcluir={() => { setNovidades([]); setApresentar(false); }} />;
  if (!sessao) return <Conta aparelho={aparelhoLocal(motor.plataforma)} aoEntrar={definirSessao} />;
  if (estadoTrava?.tipo === "validar_online") return <TelaConfirmando motivo={estadoTrava.motivo} aoVerificar={revalidar} aoSair={sairDaConta} />;
  if (estadoTrava?.tipo === "teste_acabou" || !sessao.licenca.acesso || sessao.licenca.apps?.vyntem === false) return <TelaTesteAcabou sessao={sessao} semPlano={sessao.licenca.acesso && sessao.licenca.apps?.vyntem === false} aoVerificar={revalidar} aoSair={sairDaConta} />;

  const ir = (id: string) => { setAba(id as IdAba); setMenu(false); };
  const telas: Record<IdAba, ReactNode> = {
    inicio: <Inicio ir={ir} aoEditar={(l) => setPedido({ editar: l })} />,
    lancamentos: <Lancamentos aoEditar={(l) => setPedido({ editar: l })} />,
    graficos: <Graficos />,
    contas: <Contas aoPagarFatura={(id, valor) => setPedido({ transferencia: { destinoId: id, valor } })} />,
    categorias: <Categorias />,
    assistente: <Assistente aoLancar={(p) => setPedido(p)} />,
    ajustes: <AjustesTela aoAtualizar={async (v) => { setNova(v); setBaixarAgora(v.numero); }} nova={nova} />,
    conta: <MinhaConta sessao={sessao} aoAtualizar={definirSessao} aoSair={sairDaConta} />,
  };
  const aoTocar = (e: TouchEvent) => { const t = e.touches[0]; inicioToque.current = t && t.clientX < 24 ? t.clientX : null; };
  const aoSoltar = (e: TouchEvent) => { const t = e.changedTouches[0]; const i = inicioToque.current; inicioToque.current = null; if (t && i != null && t.clientX - i > 60) setMenu(true); };
  const falha = erroDeGravacao();
  const Marca = ({ tam }: { tam: number }) => <><LogoVivo tam={tam} /><div><div className="text-lg font-semibold leading-tight tracking-wide">Vyntem</div><div className="text-[11px] text-suave">Finanças com IA</div></div></>;
  return (
    <div onTouchStart={aoTocar} onTouchEnd={aoSoltar} className="mx-auto flex min-h-dvh max-w-7xl">
      {novidades.length > 0 && <Novidades itens={novidades} aoFechar={() => setNovidades([])} />}
      <aside className="sticky top-0 hidden h-dvh w-56 flex-none flex-col border-r border-white/10 px-3 pb-3 pt-4 sm:flex">
        <div className="mb-4 flex items-center gap-2 px-1"><Marca tam={44} /></div>
        <nav aria-label="Seções" className="flex-1 space-y-1 overflow-y-auto pr-1">{ABAS.map((a) => <button key={a.id} onClick={() => setAba(a.id)} aria-current={aba === a.id ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition ${aba === a.id ? "bg-neon/15 text-neon shadow-[0_0_18px_-6px_var(--color-neon)]" : "text-suave hover:bg-white/5 hover:text-texto"}`}><Icone nome={a.icone} tam={20} />{a.rotulo}</button>)}</nav>
        <div className="px-2 pt-3 text-[11px] text-suave">{BUILD ? `Versão 1.${BUILD}` : "Versão de desenvolvimento"}</div>
      </aside>
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col px-4 pb-28 pt-4 sm:pb-10">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:hidden">
            <button onClick={() => setMenu(true)} aria-label="Abrir menu" className="grid size-11 flex-none place-items-center rounded-xl text-suave hover:text-texto"><Icone nome="menu" /></button>
            <Marca tam={40} />
          </div>
          <h1 className="hidden text-xl font-bold sm:block">{ABAS.find((a) => a.id === aba)?.rotulo}</h1>
          {ajustes.esconderValores ? <button onClick={() => setEspiar((v) => !v)} aria-label={espiar ? "Esconder valores" : "Mostrar valores"} className="grid size-11 place-items-center rounded-xl text-suave hover:text-texto"><Icone nome={espiar ? "olho" : "olho_off"} /></button> : <button onClick={() => definirAjustes({ esconderValores: true })} aria-label="Esconder valores" className="grid size-11 place-items-center rounded-xl text-suave hover:text-texto"><Icone nome="olho" /></button>}
        </header>
        {demo && <div className="mb-3"><Aviso>Você está no navegador: tudo funciona, só não há atualização automática. Instale o Vyntem no Android ou no Windows.</Aviso></div>}
        {falha && <div className="mb-3"><Aviso tom="erro">{falha}</Aviso></div>}
        {nova && <AtualizacaoAviso nova={nova} baixarSozinho={baixarAgora === nova.numero || ajustes.autoAtualizar} aoSemSuporte={() => void atualizar(nova)} />}
        {avisoAtualizacao && <div className="mb-3"><Aviso tom="ok">{avisoAtualizacao}</Aviso></div>}
        <main className="flex min-h-0 flex-1 flex-col">{telas[aba]}</main>
      </div>

      {/* botão + e barra de baixo (celular) */}
      {aba !== "assistente" && <button onClick={() => setPedido({})} aria-label="Novo lançamento" className="btn-primario brilho fixed bottom-20 right-4 z-30 grid size-14 place-items-center rounded-[var(--raio-botao,1rem)] bg-neon text-fundo shadow-xl sm:bottom-6 sm:right-6"><Icone nome="mais" tam={28} /></button>}
      <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-fundo/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {ATALHOS.map((id) => { const a = ABAS.find((x) => x.id === id)!; return <button key={id} onClick={() => setAba(id)} aria-current={aba === id ? "page" : undefined} className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${aba === id ? "text-neon" : "text-suave"}`}><Icone nome={a.icone} tam={22} />{a.rotulo}</button>; })}
        <button onClick={() => setMenu(true)} className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-suave"><Icone nome="menu" tam={22} />Mais</button>
      </nav>

      <NovoLancamento pedido={pedido} aoFechar={() => setPedido(null)} />
      {saindo && <div role="status" className="fixed inset-x-0 bottom-24 z-50 mx-auto w-max max-w-[90%] rounded-full border border-white/10 bg-black/80 px-4 py-2 text-sm text-texto backdrop-blur">Toque em voltar de novo para sair</div>}
      <div className={`fixed inset-0 z-40 sm:hidden ${menu ? "" : "pointer-events-none"}`} aria-hidden={!menu}>
        <div onClick={() => setMenu(false)} className={`absolute inset-0 bg-black/60 transition-opacity ${menu ? "opacity-100" : "opacity-0"}`} />
        <nav aria-label="Menu" className={`absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-borda bg-fundo p-3 pt-[max(12px,env(safe-area-inset-top))] shadow-2xl transition-transform duration-200 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="mb-3 flex items-center gap-2 px-1"><LogoVivo tam={36} /><div className="flex-1 text-base font-semibold">Vyntem</div><button onClick={() => setMenu(false)} aria-label="Fechar menu" className="grid size-10 place-items-center rounded-xl text-suave"><Icone nome="fechar" tam={20} /></button></div>
          <div className="flex-1 space-y-1 overflow-y-auto">{ABAS.map((a) => <button key={a.id} onClick={() => ir(a.id)} aria-current={aba === a.id ? "page" : undefined} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] ${aba === a.id ? "bg-neon/15 text-neon" : "text-texto hover:bg-white/5"}`}><Icone nome={a.icone} />{a.rotulo}</button>)}</div>
          <div className="px-2 pb-2 pt-3 text-[11px] text-suave">{BUILD ? `Versão 1.${BUILD}` : "Versão de desenvolvimento"}</div>
        </nav>
      </div>
    </div>
  );
}
