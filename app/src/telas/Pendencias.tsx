import { useEffect, useMemo, useState } from "react";
import { desfazerPagamentoDaPendencia, pagarPendencia, removerPendencia, salvarPendencia, useBanco, useBancoDaVisao, useVisao } from "../banco";
import { hojeISO, parseValor, reais } from "../calculos";
import { novoId, type Categoria, type Escopo, type Pendencia } from "../dados";
import { agrupar, quandoVence, resumo } from "../pendencias";
import { Aviso, Botao, Cartao, Folha } from "../ui";
import { Bolinha, Dinheiro, Vazio } from "../comuns";
import { Escolha, SeletorDeData, dataCurta } from "../seletores";
import { Icone } from "../icones";

const ROTULO_ESCOPO: Record<Escopo, string> = { pessoal: "Pessoal", negocio: "Negócio" };

/** Contas a pagar e a receber: o que vence, o que está atrasado, e o botão "Paguei" que já lança no caixa. */
export function Pendencias({ aviso }: { aviso?: string }) {
  const banco = useBanco(), visivel = useBancoDaVisao(), visao = useVisao();
  const hoje = hojeISO();
  const g = useMemo(() => agrupar(visivel.pendencias, hoje), [visivel.pendencias, hoje]);
  const r = useMemo(() => resumo(visivel.pendencias, hoje), [visivel.pendencias, hoje]);
  const [editando, setEditando] = useState<Pendencia | "nova" | null>(null);
  const [pagando, setPagando] = useState<Pendencia | null>(null);
  const categoriaDe = (id?: string): Categoria | undefined => banco.categorias.find((c) => c.id === id);

  const curta = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
  const Item = ({ p }: { p: Pendencia }) => {
    const atrasada = !p.pagoEm && p.vencimento < hoje;
    return (
      <div className="py-2">
        <button onClick={() => setEditando(p)} className="flex min-h-12 w-full items-center gap-3 text-left" aria-label={`Editar ${p.nota || "conta"}`}>
          <Bolinha cat={categoriaDe(p.categoriaId)} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">{p.nota || (p.tipo === "receita" ? "Receber" : "Pagar")}</div>
            <div className={`text-xs ${atrasada ? "text-red-400" : "text-suave"}`}>{quandoVence(p, hoje)} · {curta(p.pagoEm ?? p.vencimento)}</div>
          </div>
          <div className="flex-none text-right">
            <Dinheiro v={p.tipo === "receita" ? p.valor : -p.valor} className="block text-sm font-semibold" />
            {visao === "tudo" && <span className="text-[11px] text-suave">{ROTULO_ESCOPO[p.escopo]}</span>}
          </div>
        </button>
        <div className="mt-1 flex justify-end">
          {p.pagoEm
            ? <Botao onClick={() => desfazerPagamentoDaPendencia(p.id)} className="min-h-11 px-4 text-xs">Desfazer</Botao>
            : <Botao variante="primario" onClick={() => setPagando(p)} className="min-h-11 px-5 text-xs">{p.tipo === "receita" ? "Recebi" : "Paguei"}</Botao>}
        </div>
      </div>
    );
  };
  const Grupo = ({ titulo, itens, tom }: { titulo: string; itens: Pendencia[]; tom?: "alerta" }) => itens.length === 0 ? null : (
    <Cartao titulo={titulo} className={tom === "alerta" ? "border-red-400/40" : ""}><div className="-my-1 divide-y divide-white/5">{itens.map((p) => <Item key={p.id} p={p} />)}</div></Cartao>
  );

  return (
    <div className="space-y-3">
      <Cartao>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div><div className="text-[11px] uppercase tracking-wider text-suave">A pagar (7 dias)</div><Dinheiro v={-r.aPagarAte7} className="block whitespace-nowrap text-lg font-bold sm:text-xl" /></div>
          <div><div className="text-[11px] uppercase tracking-wider text-suave">A receber (7 dias)</div><Dinheiro v={r.aReceberAte7} className="block whitespace-nowrap text-lg font-bold sm:text-xl" /></div>
        </div>
        {r.atrasadasQtd > 0 && <div className="mt-3 text-center text-xs text-red-400">{r.atrasadasQtd} {r.atrasadasQtd === 1 ? "conta atrasada" : "contas atrasadas"}{r.atrasadasTotal > 0 ? ` · ${reais(r.atrasadasTotal)} a pagar` : ""}</div>}
      </Cartao>
      {aviso && <Aviso>{aviso}</Aviso>}
      <Botao variante="primario" className="w-full" onClick={() => setEditando("nova")}><Icone nome="mais" tam={18} /> Nova conta a pagar ou receber</Botao>
      {visivel.pendencias.length === 0 && <Vazio>Nenhuma conta ainda. Cadastre o que vai vencer (aluguel, fornecedor, uma venda a receber) e o Vyntem avisa na véspera e no dia.</Vazio>}
      <Grupo titulo="Atrasadas" itens={g.atrasadas} tom="alerta" />
      <Grupo titulo="Hoje" itens={g.hoje} />
      <Grupo titulo="Próximos 7 dias" itens={g.semana} />
      <Grupo titulo="Mais para frente" itens={g.depois} />
      <Grupo titulo="Pagas e recebidas" itens={g.pagas.slice(0, 10)} />
      <FormularioDePendencia aberto={editando !== null} pendencia={editando && editando !== "nova" ? editando : null} aoFechar={() => setEditando(null)} escopoPadrao={visao === "negocio" ? "negocio" : "pessoal"} />
      <FolhaDePagamento pendencia={pagando} aoFechar={() => setPagando(null)} />
    </div>
  );
}

function FormularioDePendencia({ aberto, pendencia, aoFechar, escopoPadrao }: { aberto: boolean; pendencia: Pendencia | null; aoFechar: () => void; escopoPadrao: Escopo }) {
  const banco = useBanco();
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [valor, setValor] = useState("");
  const [venc, setVenc] = useState(hojeISO());
  const [nota, setNota] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | undefined>();
  const [escopo, setEscopo] = useState<Escopo>("pessoal");
  const [erro, setErro] = useState("");
  const [apagar, setApagar] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    setErro(""); setApagar(false);
    if (pendencia) { setTipo(pendencia.tipo); setValor((pendencia.valor / 100).toFixed(2).replace(".", ",")); setVenc(pendencia.vencimento); setNota(pendencia.nota); setCategoriaId(pendencia.categoriaId); setEscopo(pendencia.escopo); }
    else { setTipo("despesa"); setValor(""); setVenc(hojeISO()); setNota(""); setCategoriaId(undefined); setEscopo(escopoPadrao); }
  }, [aberto, pendencia, escopoPadrao]);
  const categorias = banco.categorias.filter((c) => c.tipo === tipo);
  useEffect(() => { if (categoriaId && !banco.categorias.some((c) => c.id === categoriaId && c.tipo === tipo)) setCategoriaId(undefined); }, [tipo, categoriaId, banco.categorias]);
  const salvar = () => {
    const v = parseValor(valor);
    if (!v || v <= 0) { setErro("Informe o valor."); return; }
    const p: Pendencia = { id: pendencia?.id ?? novoId("pd"), tipo, valor: v, vencimento: venc, nota: nota.trim().slice(0, 120), escopo, ...(categoriaId ? { categoriaId } : {}), ...(pendencia?.contaId ? { contaId: pendencia.contaId } : {}), ...(pendencia?.pagoEm ? { pagoEm: pendencia.pagoEm } : {}) };
    const falha = salvarPendencia(p);
    if (falha) { setErro(falha); return; }
    aoFechar();
  };
  return (
    <Folha aberta={aberto} titulo={pendencia ? "Editar conta" : "Nova conta"} aoFechar={aoFechar}>
      <div className="space-y-4">
        <div role="tablist" aria-label="Tipo" className="grid grid-cols-2 gap-2">
          {([["despesa", "A pagar"], ["receita", "A receber"]] as const).map(([id, rot]) => <button key={id} role="tab" aria-selected={tipo === id} onClick={() => setTipo(id)} className={`min-h-11 rounded-xl text-sm transition ${tipo === id ? (id === "receita" ? "bg-neon/15 text-neon" : "bg-red-400/15 text-red-300") : "border border-borda text-suave"}`}>{rot}</button>)}
        </div>
        <label className="block text-center">
          <span className="text-xs uppercase tracking-wider text-suave">Valor</span>
          <div className="mt-1 flex items-baseline justify-center gap-2"><span className="text-xl text-suave">R$</span>
            <input inputMode="decimal" value={valor} onChange={(ev) => setValor(ev.target.value)} placeholder="0,00" aria-label="Valor em reais" autoFocus={!pendencia} className="num w-44 bg-transparent text-center text-4xl font-bold outline-none" /></div>
        </label>
        <label className="block text-xs text-suave">Descrição<input value={nota} onChange={(ev) => setNota(ev.target.value)} maxLength={120} placeholder={tipo === "despesa" ? "Ex.: aluguel da loja" : "Ex.: venda parcelada da Maria"} className="mt-1 min-h-11 w-full rounded-xl border border-borda bg-transparent px-3 text-sm text-texto outline-none focus:border-neon" /></label>
        <div className="block text-xs text-suave">{tipo === "despesa" ? "Vence em" : "Recebe em"}<SeletorDeData valor={venc} aoMudar={setVenc} hoje={hojeISO()} rotulo={tipo === "despesa" ? "Vencimento" : "Data de recebimento"} /></div>
        <div>
          <div className="mb-2 text-xs text-suave">É do quê?</div>
          <div role="radiogroup" aria-label="É do quê" className="grid grid-cols-2 gap-2">
            {(["pessoal", "negocio"] as const).map((e) => <button key={e} role="radio" aria-checked={escopo === e} onClick={() => setEscopo(e)} className={`min-h-11 rounded-xl border text-sm transition ${escopo === e ? "border-neon bg-neon/10 text-texto" : "border-borda text-suave"}`}>{ROTULO_ESCOPO[e]}</button>)}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs text-suave">Categoria <span className="opacity-70">(opcional)</span></div>
          <div className="grid grid-cols-4 gap-2">
            {categorias.map((c) => <button key={c.id} onClick={() => setCategoriaId(categoriaId === c.id ? undefined : c.id)} aria-pressed={categoriaId === c.id} className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] transition ${categoriaId === c.id ? "border-neon bg-neon/10 text-texto" : "border-borda text-suave"}`}><Bolinha cat={c} tam={28} /><span className="line-clamp-1">{c.nome}</span></button>)}
          </div>
        </div>
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <div className="flex gap-2 pt-1">
          {pendencia && !apagar && <Botao variante="perigo" onClick={() => setApagar(true)} aria-label="Apagar conta"><Icone nome="lixeira" tam={18} /></Botao>}
          <Botao variante="primario" className="flex-1" onClick={salvar}>Salvar</Botao>
        </div>
        {pendencia && apagar && <div className="space-y-2"><Aviso>Apagar esta conta? {pendencia.pagoEm ? "O lançamento que ela gerou continua nos seus lançamentos." : ""}</Aviso><div className="flex gap-2"><Botao variante="perigo" className="flex-1" onClick={() => { removerPendencia(pendencia.id); aoFechar(); }}>Apagar</Botao><Botao className="flex-1" onClick={() => setApagar(false)}>Cancelar</Botao></div></div>}
      </div>
    </Folha>
  );
}

/** "Paguei" / "Recebi": escolhe a conta e o dia, e o Vyntem faz o lançamento. */
function FolhaDePagamento({ pendencia, aoFechar }: { pendencia: Pendencia | null; aoFechar: () => void }) {
  const banco = useBanco();
  const contas = banco.contas.filter((c) => !c.arquivada);
  const [contaId, setContaId] = useState("");
  const [data, setData] = useState(hojeISO());
  useEffect(() => {
    if (!pendencia) return;
    setData(hojeISO());
    const doLado = contas.filter((c) => (c.escopo ?? "pessoal") === pendencia.escopo && c.tipo !== "cartao");
    setContaId(pendencia.contaId && contas.some((c) => c.id === pendencia.contaId) ? pendencia.contaId : doLado[0]?.id ?? contas.find((c) => c.tipo !== "cartao")?.id ?? contas[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendencia]);
  if (!pendencia) return <Folha aberta={false} titulo="" aoFechar={aoFechar}>{null}</Folha>;
  const receita = pendencia.tipo === "receita";
  return (
    <Folha aberta titulo={receita ? "Recebi" : "Paguei"} aoFechar={aoFechar}>
      <div className="space-y-4">
        <div className="text-center"><div className="text-sm text-suave">{pendencia.nota || (receita ? "Receber" : "Pagar")}</div><Dinheiro v={receita ? pendencia.valor : -pendencia.valor} className="block text-3xl font-bold" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="block text-xs text-suave">Dia<SeletorDeData valor={data} aoMudar={setData} hoje={hojeISO()} /></div>
          <div className="block text-xs text-suave">{receita ? "Entrou em" : "Saiu de"}<Escolha rotulo={receita ? "Entrou em" : "Saiu de"} valor={contaId} aoMudar={setContaId} opcoes={contas.map((c) => ({ id: c.id, rotulo: c.nome, detalhe: c.tipo === "cartao" ? "Cartão de crédito" : (c.escopo ?? "pessoal") === "negocio" ? "Negócio" : undefined }))} /></div>
        </div>
        <Aviso tom="ok">O Vyntem faz o lançamento {receita ? "de entrada" : "de saída"} nessa conta e tira a conta da lista.</Aviso>
        <Botao variante="primario" className="w-full" onClick={() => { if (contaId) { pagarPendencia(pendencia.id, contaId, data); aoFechar(); } }}>{receita ? "Confirmar recebimento" : "Confirmar pagamento"}</Botao>
      </div>
    </Folha>
  );
}
