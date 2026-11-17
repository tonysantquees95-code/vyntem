import { useRef, useState } from "react";
import { adicionarLancamentos, removerLancamento, useBanco } from "../banco";
import { novoId, type Lancamento } from "../dados";
import { dicasDoMes, hojeISO, intervalo, filtrar, totais } from "../calculos";
import { interpretar, type Rascunho } from "../parser";
import { responder } from "../perguntas";
import { apagarFoto, fotoParaIA, guardarFoto, reduzirFoto } from "../fotos";
import { interpretarComIA, lerNotaComIA, perguntarComIA } from "../ia";
import { Icone } from "../icones";
import { Aviso, Botao, Cartao, Folha } from "../ui";
import { OpcoesDeFoto } from "../fotoEntrada";
import { Dinheiro } from "../comuns";
import type { PedidoDeLancamento } from "./NovoLancamento";

interface Mensagem { de: "eu" | "vyntem"; texto: string; rascunho?: PedidoDeLancamento["rascunho"]; foto?: Blob; lancado?: Lancamento; desfeito?: boolean }

const SUGESTOES = ["gastei 45 no mercado", "quanto gastei este mês?", "como está minha fatura?", "me dá dicas"];

/** Assistente: entende frases de lançamento, responde perguntas e lê fotos de notas. A IA entra quando há internet; sem ela, o entendimento local resolve o básico. */
export function Assistente({ aoLancar }: { aoLancar: (p: PedidoDeLancamento) => void }) {
  const banco = useBanco();
  const hoje = hojeISO();
  const [texto, setTexto] = useState("");
  const [msgs, setMsgs] = useState<Mensagem[]>([{ de: "vyntem", texto: "Oi! Escreva um gasto (“gastei 45 no mercado ontem”), faça uma pergunta (“quanto gastei com comida este mês?”) ou mande a foto de uma nota." }]);
  const [ocupado, setOcupado] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const add = (m: Mensagem) => { setMsgs((x) => [...x, m]); setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth" }), 30); };

  /** Salva na hora, sem tela de conferência: quem escreveu "gastei 45 no mercado" já quer o gasto lançado. Dá para editar ou desfazer na própria conversa. */
  async function lancar(r: NonNullable<PedidoDeLancamento["rascunho"]>, origem: Lancamento["origem"], foto?: Blob, prefixo = ""): Promise<boolean> {
    const conta = r.contaId ?? banco.contas.find((c) => c.tipo !== "cartao")?.id ?? banco.contas[0]?.id;
    if (!conta) return false;
    const cat = banco.categorias.find((c) => c.id === r.categoriaId && c.tipo === r.tipo);
    const nota = (r.sub && r.nota.toLowerCase() === r.sub.toLowerCase() ? "" : r.nota).trim().slice(0, 120);
    const l: Lancamento = { id: novoId("l"), tipo: r.tipo, valor: r.valor, data: r.data, contaId: conta, categoriaId: cat?.id, sub: cat && r.sub && (cat.subs ?? []).includes(r.sub) ? r.sub : undefined, nota, origem, temFoto: !!foto, criadoEm: Date.now() };
    if (adicionarLancamentos([l])) return false; // não coube / erro: cai na tela de conferência
    let aviso = "";
    if (foto) { try { await guardarFoto(l.id, await reduzirFoto(foto, 1280, 0.7)); } catch { aviso = " A foto não coube no armazenamento, então ficou só o lançamento."; } }
    add({ de: "vyntem", texto: `${prefixo}${r.tipo === "receita" ? "Receita" : "Despesa"} lançada${cat ? ` em ${cat.nome}${l.sub ? ` › ${l.sub}` : ""}` : ""}.${aviso}`, lancado: aviso ? { ...l, temFoto: false } : l });
    return true;
  }

  function desfazer(i: number) {
    const l = msgs[i]?.lancado; if (!l) return;
    removerLancamento(l.id); if (l.temFoto) void apagarFoto(l.id).catch(() => undefined);
    setMsgs((x) => x.map((m, k) => (k === i ? { ...m, desfeito: true } : m)));
  }

  async function enviar(frase: string) {
    const f = frase.trim();
    if (!f || ocupado) return;
    setTexto(""); add({ de: "eu", texto: f }); setOcupado(true);
    try {
      // 1) lançamento por frase: primeiro o entendimento local (instantâneo e grátis); a IA só entra se o local não achou.
      let r: PedidoDeLancamento["rascunho"] | null = interpretar(f, banco, hoje);
      let viaIA = false;
      if (!r) {
        const perguntaLocal = responder(f, banco, hoje);
        if (perguntaLocal) { add({ de: "vyntem", texto: perguntaLocal }); return; }
        try { const ia = await interpretarComIA(f, banco, hoje); if (ia && ia.valor) { r = { tipo: ia.tipo ?? "despesa", valor: ia.valor, data: ia.data ?? hoje, nota: ia.nota ?? "", categoriaId: ia.categoriaId, contaId: ia.contaId }; viaIA = true; } } catch { /* sem IA: segue */ }
        if (!r) {
          try {
            const per = intervalo("mes", hoje);
            const resp = await perguntarComIA(f, { mes: per.rotulo, ...totais(filtrar(banco.lancamentos, { de: per.de, ate: per.ate })), categorias: banco.categorias.length });
            if (resp) { add({ de: "vyntem", texto: resp }); return; }
          } catch { /* sem IA */ }
          add({ de: "vyntem", texto: "Não entendi. Tente algo como “gastei 30 no almoço”, “recebi 1500 de salário” ou “quanto gastei este mês?”." });
          return;
        }
      }
      if (await lancar(r, "texto", undefined, viaIA ? "(Entendi com IA) " : "")) return;
      add({ de: "vyntem", texto: `Entendi: ${r.tipo === "receita" ? "receita" : "despesa"}${viaIA ? " (com IA)" : ""}. Confira e salve.`, rascunho: { ...r, origem: "texto" } });
    } finally { setOcupado(false); }
  }

  async function foto(arq: Blob) {
    add({ de: "eu", texto: "📷 Foto da nota", foto: arq }); setOcupado(true);
    try {
      const l = await lerNotaComIA(await fotoParaIA(arq), banco, hoje);
      if (!l) { add({ de: "vyntem", texto: "Não consegui ler um valor nessa foto. Você pode lançar à mão e anexar a foto.", rascunho: { tipo: "despesa", valor: 0, data: hoje, nota: "", origem: "foto" }, foto: arq }); return; }
      if (await lancar({ tipo: "despesa", valor: l.valor, data: l.data, nota: l.loja, categoriaId: l.categoriaId }, "foto", arq, `Li a nota${l.loja ? ` de ${l.loja}` : ""}. `)) return;
      add({ de: "vyntem", texto: `Li a nota${l.loja ? ` de ${l.loja}` : ""}. Confira os dados antes de salvar.`, rascunho: { tipo: "despesa", valor: l.valor, data: l.data, nota: l.loja, categoriaId: l.categoriaId, origem: "foto" }, foto: arq });
    } catch (e) {
      add({ de: "vyntem", texto: `${e instanceof Error && e.message ? e.message : "Não consegui ler a foto agora."} Lance à mão e anexe a foto.`, rascunho: { tipo: "despesa", valor: 0, data: hoje, nota: "", origem: "foto" }, foto: arq });
    } finally { setOcupado(false); }
  }

  const dicas = dicasDoMes(banco, hoje);
  const [fotoAberta, setFotoAberta] = useState(false);
  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-1 flex-col gap-3">
      {dicas.length > 0 && <Cartao titulo="Dicas do mês"><ul className="space-y-2 text-sm">{dicas.slice(0, 3).map((d, i) => <li key={i} className={d.tom === "alerta" ? "text-aviso" : d.tom === "ok" ? "text-ok" : "text-suave"}>{d.texto}</li>)}</ul></Cartao>}
      <div className="flex-1 space-y-3">
        <Aviso tom="ok">A leitura de fotos e as perguntas livres usam IA pela internet; frases de lançamento simples funcionam até sem internet.</Aviso>
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.de === "eu" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] space-y-2 rounded-2xl px-4 py-3 text-sm ${m.de === "eu" ? "bg-neon/15 text-texto" : "border border-borda bg-painel"}`}>
              <p className="whitespace-pre-line">{m.texto}</p>
              {m.lancado && (m.desfeito
                ? <p className="text-xs text-suave">Desfeito: este lançamento foi removido.</p>
                : <div className="space-y-2">
                    <div className="rounded-xl border border-ok/40 bg-ok/10 p-3 text-xs text-suave"><Dinheiro v={m.lancado.valor} className="block text-lg font-bold text-texto" />{m.lancado.nota && <span>{m.lancado.nota} · </span>}{m.lancado.data.split("-").reverse().join("/")}</div>
                    <div className="flex gap-2"><Botao variante="suave" onClick={() => aoLancar({ editar: m.lancado })}>Editar</Botao><Botao variante="suave" onClick={() => desfazer(i)}>Desfazer</Botao></div>
                  </div>)}
              {m.rascunho && <div className="space-y-2">
                {m.rascunho.valor > 0 && <div className="rounded-xl border border-borda bg-fundo/60 p-3 text-xs text-suave"><Dinheiro v={m.rascunho.valor} className="block text-lg font-bold text-texto" />{m.rascunho.nota && <span>{m.rascunho.nota} · </span>}{m.rascunho.data.split("-").reverse().join("/")}</div>}
                <Botao variante="primario" onClick={() => aoLancar({ rascunho: m.rascunho, fotoNova: m.foto })}>{m.rascunho.valor > 0 ? "Conferir e salvar" : "Lançar à mão"}</Botao>
              </div>}
            </div>
          </div>
        ))}
        {ocupado && <div className="text-sm text-suave" role="status">Pensando…</div>}
        <div ref={fim} />
      </div>
      <div className="rolagem -mx-1 flex gap-2 overflow-x-auto px-1">{SUGESTOES.map((s) => <button key={s} onClick={() => void enviar(s)} className="min-h-9 flex-none rounded-full border border-borda px-3 text-xs text-suave hover:text-texto">{s}</button>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); void enviar(texto); }} className="sticky bottom-2 flex items-center gap-2 rounded-2xl border border-borda bg-painel p-2">
        <button type="button" onClick={() => setFotoAberta(true)} aria-label="Foto da nota" className="grid size-11 flex-none place-items-center rounded-xl text-suave hover:bg-white/5"><Icone nome="camera" /></button>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Gastei 45 no mercado…" aria-label="Mensagem" className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" />
        <button type="submit" disabled={!texto.trim() || ocupado} aria-label="Enviar" className="btn-primario grid size-11 flex-none place-items-center rounded-xl bg-neon text-fundo disabled:opacity-40"><Icone nome="enviar" /></button>
      </form>
      <Folha aberta={fotoAberta} titulo="Foto da nota" aoFechar={() => setFotoAberta(false)}>
        <div className="space-y-3"><p className="text-sm text-suave">O Vyntem lê o valor, a data e a loja da nota e já lança o gasto; se algo estiver errado, toque em Editar.</p><OpcoesDeFoto aoFoto={(f) => { setFotoAberta(false); void foto(f); }} /></div>
      </Folha>
    </div>
  );
}
