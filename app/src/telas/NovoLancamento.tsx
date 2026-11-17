import { useEffect, useRef, useState } from "react";
import { adicionarLancamentos, atualizarLancamento, removerGrupo, removerLancamento, useBanco } from "../banco";
import { criarParcelas, hojeISO, parseValor, reais } from "../calculos";
import { novoId, type Lancamento, type TipoLancamento } from "../dados";
import { apagarFoto, guardarFoto, lerFoto, reduzirFoto } from "../fotos";
import { Icone } from "../icones";
import { Aviso, Botao, Folha } from "../ui";
import { Bolinha } from "../comuns";
import type { Rascunho } from "../parser";

const ROTULOS: { id: TipoLancamento; rotulo: string }[] = [{ id: "despesa", rotulo: "Despesa" }, { id: "receita", rotulo: "Receita" }, { id: "transferencia", rotulo: "Transferência" }];

export interface PedidoDeLancamento { /** pagar fatura: transferência da conta de onde sai o dinheiro para o cartão */ transferencia?: { destinoId: string; valor: number }; editar?: Lancamento; rascunho?: Rascunho & { fotoId?: string; origem?: Lancamento["origem"] }; fotoNova?: Blob }

/** Folha de novo lançamento / edição: tipo, valor grande, conta, categoria, data, nota, foto e parcelas. */
export function NovoLancamento({ pedido, aoFechar }: { pedido: PedidoDeLancamento | null; aoFechar: () => void }) {
  const banco = useBanco();
  const contas = banco.contas.filter((c) => !c.arquivada);
  const e = pedido?.editar;
  const r = pedido?.rascunho;
  const [tipo, setTipo] = useState<TipoLancamento>("despesa");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [nota, setNota] = useState("");
  const [contaId, setContaId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | undefined>();
  const [parcelas, setParcelas] = useState(1);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [fotoUrl, setFotoUrl] = useState("");
  const [removerFoto, setRemoverFoto] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmaApagar, setConfirmaApagar] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  // Preenche o formulário toda vez que a folha abre.
  useEffect(() => {
    if (!pedido) return;
    setErro(""); setConfirmaApagar(false); setRemoverFoto(false); setParcelas(1);
    const padraoConta = contas.find((c) => c.tipo !== "cartao")?.id ?? contas[0]?.id ?? "";
    if (e) {
      setTipo(e.tipo); setValor((e.valor / 100).toFixed(2).replace(".", ",")); setData(e.data); setNota(e.nota); setContaId(e.contaId); setDestinoId(e.contaDestinoId ?? ""); setCategoriaId(e.categoriaId); setFoto(null);
    } else if (pedido.transferencia) {
      setTipo("transferencia"); setValor((pedido.transferencia.valor / 100).toFixed(2).replace(".", ",")); setData(hojeISO()); setNota("Pagamento da fatura"); setContaId(padraoConta); setDestinoId(pedido.transferencia.destinoId); setCategoriaId(undefined); setFoto(null);
    } else {
      setTipo(r?.tipo ?? "despesa"); setValor(r ? (r.valor / 100).toFixed(2).replace(".", ",") : ""); setData(r?.data ?? hojeISO()); setNota(r?.nota ?? ""); setContaId(r?.contaId ?? padraoConta); setDestinoId(""); setCategoriaId(r?.categoriaId); setParcelas(r?.parcelas ?? 1); setFoto(pedido.fotoNova ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  // Mostra a foto (nova ou já guardada).
  useEffect(() => {
    let url = ""; let vivo = true;
    const mostrar = (b: Blob | undefined) => { if (b && vivo) { url = URL.createObjectURL(b); setFotoUrl(url); } else if (vivo) setFotoUrl(""); };
    if (foto) mostrar(foto); else if (e?.temFoto && !removerFoto) void lerFoto(e.id).then(mostrar).catch(() => mostrar(undefined)); else setFotoUrl("");
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [foto, e, removerFoto]);

  // Se a categoria escolhida não serve ao tipo, limpa.
  useEffect(() => { if (tipo === "transferencia") setCategoriaId(undefined); else if (categoriaId && banco.categorias.find((c) => c.id === categoriaId)?.tipo !== tipo) setCategoriaId(undefined); }, [tipo, categoriaId, banco.categorias]);

  const categorias = banco.categorias.filter((c) => c.tipo === tipo);
  const conta = banco.contas.find((c) => c.id === contaId);
  const podeParcelar = !e && tipo === "despesa" && conta?.tipo === "cartao";

  async function salvar() {
    const v = parseValor(valor);
    if (v === null || v <= 0) { setErro("Digite um valor maior que zero."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { setErro("Escolha a data."); return; }
    if (!contaId) { setErro("Escolha a conta."); return; }
    if (tipo === "transferencia" && (!destinoId || destinoId === contaId)) { setErro("Escolha duas contas diferentes."); return; }
    const base = { tipo, contaId, contaDestinoId: tipo === "transferencia" ? destinoId : undefined, categoriaId: tipo === "transferencia" ? undefined : categoriaId, nota: nota.trim().slice(0, 120), origem: e?.origem ?? r?.origem ?? "manual" } as const;
    let idDaFoto = e?.id;
    try {
      if (e) {
        const novo: Lancamento = { ...e, ...base, valor: v, data, temFoto: removerFoto ? false : foto ? true : e.temFoto };
        const falha = atualizarLancamento(novo);
        if (falha) { setErro(falha); return; }
        if (removerFoto) { await apagarFoto(e.id).catch(() => undefined); }
      } else if (podeParcelar && parcelas > 1) {
        const lista = criarParcelas({ ...base, nota: base.nota, temFoto: !!foto }, v, parcelas, data, () => novoId("l"));
        idDaFoto = lista[0]!.id;
        const falha = adicionarLancamentos(lista);
        if (falha) { setErro(falha); return; }
      } else {
        const novo: Lancamento = { ...base, id: novoId("l"), valor: v, data, temFoto: !!foto, criadoEm: Date.now() };
        idDaFoto = novo.id;
        const falha = adicionarLancamentos([novo]);
        if (falha) { setErro(falha); return; }
      }
      if (foto && idDaFoto) await guardarFoto(idDaFoto, await reduzirFoto(foto, 1280, 0.7)).catch(() => { setErro("O lançamento foi salvo, mas a foto não coube no armazenamento."); throw new Error("foto"); });
      aoFechar();
    } catch { /* erro da foto já mostrado; o lançamento ficou salvo */ }
  }

  async function apagar() {
    if (!e) return;
    if (e.parcela && confirmaApagar) { removerGrupo(e.parcela.grupo); } else removerLancamento(e.id);
    await apagarFoto(e.id).catch(() => undefined);
    aoFechar();
  }

  return (
    <Folha aberta={!!pedido} titulo={e ? "Editar lançamento" : "Novo lançamento"} aoFechar={aoFechar}>
      <div className="space-y-4">
        <div role="tablist" aria-label="Tipo" className="grid grid-cols-3 gap-2">
          {ROTULOS.map((t) => <button key={t.id} role="tab" aria-selected={tipo === t.id} onClick={() => setTipo(t.id)} className={`min-h-11 rounded-xl text-sm transition ${tipo === t.id ? (t.id === "receita" ? "bg-neon/15 text-neon" : t.id === "despesa" ? "bg-[#f87171]/15 text-[#f87171]" : "bg-white/10 text-texto") : "border border-borda text-suave"}`}>{t.rotulo}</button>)}
        </div>

        <label className="block text-center">
          <span className="text-xs uppercase tracking-wider text-suave">Valor</span>
          <div className="mt-1 flex items-baseline justify-center gap-2"><span className="text-xl text-suave">R$</span>
            <input inputMode="decimal" value={valor} onChange={(ev) => setValor(ev.target.value)} placeholder="0,00" aria-label="Valor em reais" autoFocus={!e} className="num w-44 bg-transparent text-center text-4xl font-bold outline-none" /></div>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-suave">Data<input type="date" value={data} onChange={(ev) => setData(ev.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-borda bg-transparent px-3 text-sm text-texto [color-scheme:dark]" /></label>
          <label className="block text-xs text-suave">{tipo === "transferencia" ? "Sai de" : "Conta"}
            <select value={contaId} onChange={(ev) => setContaId(ev.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-borda bg-painel px-3 text-sm text-texto">{contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        </div>
        {tipo === "transferencia" && <label className="block text-xs text-suave">Vai para
          <select value={destinoId} onChange={(ev) => setDestinoId(ev.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-borda bg-painel px-3 text-sm text-texto"><option value="">Escolha…</option>{contas.filter((c) => c.id !== contaId).map((c) => <option key={c.id} value={c.id}>{c.nome}{c.tipo === "cartao" ? " (pagar fatura)" : ""}</option>)}</select></label>}

        {tipo !== "transferencia" && (
          <div>
            <div className="mb-2 text-xs text-suave">Categoria</div>
            <div className="grid grid-cols-4 gap-2">
              {categorias.map((c) => <button key={c.id} onClick={() => setCategoriaId(c.id)} aria-pressed={categoriaId === c.id} className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] transition ${categoriaId === c.id ? "border-neon bg-neon/10 text-texto" : "border-borda text-suave"}`}><Bolinha cat={c} tam={34} /><span className="w-full truncate text-center">{c.nome}</span></button>)}
            </div>
          </div>
        )}

        <label className="block text-xs text-suave">Nota<input value={nota} onChange={(ev) => setNota(ev.target.value)} maxLength={120} placeholder="Ex.: mercado do mês" className="mt-1 min-h-11 w-full rounded-xl border border-borda bg-transparent px-3 text-sm text-texto" /></label>

        {podeParcelar && <label className="block text-xs text-suave">Parcelas
          <select value={parcelas} onChange={(ev) => setParcelas(Number(ev.target.value))} className="mt-1 min-h-11 w-full rounded-xl border border-borda bg-painel px-3 text-sm text-texto">
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? "À vista" : `${n}x${parseValor(valor) ? ` de ${reais(Math.floor((parseValor(valor) ?? 0) / n))}` : ""}`}</option>)}</select></label>}

        <div>
          <div className="mb-2 text-xs text-suave">Foto da nota ou do comprovante</div>
          {fotoUrl ? <div className="flex items-center gap-3"><img src={fotoUrl} alt="Foto anexada" className="size-20 rounded-xl border border-borda object-cover" /><Botao onClick={() => { setFoto(null); setRemoverFoto(true); }}>Remover foto</Botao></div>
            : <Botao onClick={() => entrada.current?.click()}><Icone nome="camera" tam={18} />Tirar ou escolher foto</Botao>}
          <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={(ev) => { const f = ev.target.files?.[0]; if (f) { setFoto(f); setRemoverFoto(false); } ev.target.value = ""; }} />
        </div>

        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <div className="flex gap-2 pt-1">
          {e && !confirmaApagar && <Botao variante="perigo" onClick={() => (e.parcela ? setConfirmaApagar(true) : void apagar())} aria-label="Apagar lançamento"><Icone nome="lixeira" tam={18} /></Botao>}
          <Botao variante="primario" className="flex-1" onClick={() => void salvar()}>Salvar</Botao>
        </div>
        {e?.parcela && confirmaApagar && <div className="space-y-2"><Aviso>Esta compra tem {e.parcela.de} parcelas. Apagar só esta ou todas?</Aviso><div className="flex gap-2"><Botao variante="perigo" onClick={() => { removerLancamento(e.id); void apagarFoto(e.id).catch(() => undefined); aoFechar(); }}>Só esta</Botao><Botao variante="perigo" onClick={() => void apagar()}>Todas</Botao></div></div>}
      </div>
    </Folha>
  );
}
