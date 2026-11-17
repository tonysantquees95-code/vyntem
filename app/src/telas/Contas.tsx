import { useState } from "react";
import { removerOuArquivarConta, salvarConta, useBanco } from "../banco";
import { chaveDaFaturaAberta, faturaDoCartao, hojeISO, limiteDisponivel, parseValor, resumoDasContas, saldoDaConta, dataBonita } from "../calculos";
import { novoId, type Conta, type TipoConta } from "../dados";
import { Icone } from "../icones";
import { Aviso, Botao, Cartao, Folha } from "../ui";
import { Dinheiro } from "../comuns";

const TIPOS: { id: TipoConta; rotulo: string }[] = [{ id: "dinheiro", rotulo: "Dinheiro" }, { id: "banco", rotulo: "Banco" }, { id: "poupanca", rotulo: "Poupança" }, { id: "cartao", rotulo: "Cartão de crédito" }];
const CORES = ["#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#fbbf24", "#f87171", "#22d3ee"];
const centavos = (v: number) => (v / 100).toFixed(2).replace(".", ",");

/** Contas (dinheiro, banco, poupança) e cartões com fatura, limite, fechamento e vencimento. */
export function Contas({ aoPagarFatura }: { aoPagarFatura: (cartaoId: string, valor: number) => void }) {
  const banco = useBanco();
  const hoje = hojeISO();
  const [edit, setEdit] = useState<Conta | "nova" | null>(null);
  const ativas = banco.contas.filter((c) => !c.arquivada);
  const res = resumoDasContas(ativas, banco.lancamentos);
  return (
    <div className="space-y-3">
      <Cartao>
        <div className="flex gap-2 text-center">
          {([["Ativos", res.ativos, "text-neon"], ["Dívidas", res.dividas, "text-[#f87171]"], ["Total", res.total, "text-texto"]] as const).map(([r, v, c]) => <div key={r} className="min-w-0 flex-1"><div className="text-[11px] uppercase tracking-wider text-suave">{r}</div><Dinheiro v={v} className={`block truncate text-sm font-semibold ${c}`} /></div>)}
        </div>
      </Cartao>
      {ativas.map((c) => {
        const saldo = saldoDaConta(c, banco.lancamentos);
        const fat = c.tipo === "cartao" ? faturaDoCartao(c, banco.lancamentos, chaveDaFaturaAberta(c, hoje)) : null;
        return (
          <Cartao key={c.id}>
            <div className="flex items-center gap-3">
              <span className="grid size-11 flex-none place-items-center rounded-2xl" style={{ background: `${c.cor}26`, color: c.cor }}><Icone nome={c.tipo === "cartao" ? "cartao" : "contas"} /></span>
              <div className="min-w-0 flex-1"><div className="truncate font-medium">{c.nome}</div><div className="text-xs text-suave">{TIPOS.find((t) => t.id === c.tipo)?.rotulo}</div></div>
              <div className="text-right"><Dinheiro v={saldo} className={`block font-semibold ${saldo < 0 ? "text-[#f87171]" : ""}`} /></div>
              <button onClick={() => setEdit(c)} aria-label={`Editar ${c.nome}`} className="grid size-10 flex-none place-items-center rounded-xl text-suave hover:bg-white/5"><Icone nome="editar" tam={18} /></button>
            </div>
            {fat && <div className="mt-3 space-y-1 rounded-xl border border-borda bg-fundo/60 p-3 text-sm">
              <div className="flex justify-between"><span className="text-suave">Fatura aberta</span><Dinheiro v={fat.total} className="font-semibold" /></div>
              <div className="flex justify-between text-xs text-suave"><span>Fecha em {dataBonita(fat.fechamento).replace(/ de \d{4}$/, "")}</span><span>Vence em {dataBonita(fat.vencimento).replace(/ de \d{4}$/, "")}</span></div>
              {!!c.limite && <div className="flex justify-between text-xs text-suave"><span>Limite disponível</span><Dinheiro v={limiteDisponivel(c, banco.lancamentos)} /></div>}
              {!!c.limite && <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-neon" style={{ width: `${Math.min(100, Math.max(0, (-Math.min(0, saldo) / c.limite) * 100))}%` }} /></div>}
              {saldo < 0 && <div className="pt-1"><Botao className="w-full" onClick={() => aoPagarFatura(c.id, Math.min(fat.total > 0 ? fat.total : -saldo, -saldo))}>Pagar fatura</Botao></div>}
            </div>}
          </Cartao>
        );
      })}
      <Botao className="w-full" onClick={() => setEdit("nova")}><Icone nome="mais" tam={18} />Nova conta ou cartão</Botao>
      <FormularioDeConta valor={edit} aoFechar={() => setEdit(null)} />
    </div>
  );
}

function FormularioDeConta({ valor, aoFechar }: { valor: Conta | "nova" | null; aoFechar: () => void }) {
  const editando = valor && valor !== "nova" ? valor : null;
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoConta>("banco");
  const [saldo, setSaldo] = useState("");
  const [cor, setCor] = useState(CORES[1]!);
  const [limite, setLimite] = useState("");
  const [fecha, setFecha] = useState("5");
  const [vence, setVence] = useState("12");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [chave, setChave] = useState<unknown>(null);
  if (chave !== valor) { // carrega o formulário quando abre
    setChave(valor); setErro(""); setAviso("");
    if (editando) { setNome(editando.nome); setTipo(editando.tipo); setSaldo(centavos(editando.saldoInicial)); setCor(editando.cor); setLimite(editando.limite ? centavos(editando.limite) : ""); setFecha(String(editando.diaFechamento ?? 5)); setVence(String(editando.diaVencimento ?? 12)); }
    else { setNome(""); setTipo("banco"); setSaldo(""); setCor(CORES[1]!); setLimite(""); setFecha("5"); setVence("12"); }
  }
  function salvar() {
    const n = nome.trim();
    if (!n) { setErro("Dê um nome para a conta."); return; }
    const s = saldo.trim() ? parseValor(saldo.replace("-", "")) : 0;
    if (s === null) { setErro("Saldo inicial inválido."); return; }
    const sinal = saldo.trim().startsWith("-") ? -1 : 1;
    const c: Conta = { id: editando?.id ?? novoId("a"), nome: n.slice(0, 40), tipo, saldoInicial: s * sinal, cor, arquivada: editando?.arquivada };
    if (tipo === "cartao") {
      const lim = limite.trim() ? parseValor(limite) : 0;
      const f = Math.round(Number(fecha)), v = Math.round(Number(vence));
      if (lim === null || !(f >= 1 && f <= 28) || !(v >= 1 && v <= 31)) { setErro("Confira o limite e os dias (fechamento de 1 a 28, vencimento de 1 a 31)."); return; }
      c.limite = lim; c.diaFechamento = f; c.diaVencimento = v;
    }
    const falha = salvarConta(c);
    if (falha) { setErro(falha); return; }
    aoFechar();
  }
  function remover() { if (!editando) return; const r = removerOuArquivarConta(editando.id); if (r === "arquivada") { setAviso(""); } aoFechar(); }
  return (
    <Folha aberta={!!valor} titulo={editando ? "Editar conta" : "Nova conta"} aoFechar={aoFechar}>
      <div className="space-y-3">
        <label className="block text-xs text-suave">Nome<input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} placeholder="Ex.: Nubank" className="mt-1 min-h-11 w-full rounded-xl border border-borda bg-transparent px-3 text-sm text-texto" /></label>
        <label className="block text-xs text-suave">Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value as TipoConta)} className="mt-1 min-h-11 w-full rounded-xl border border-borda bg-painel px-3 text-sm text-texto">{TIPOS.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}</select></label>
        <label className="block text-xs text-suave">{tipo === "cartao" ? "Dívida que já existia (opcional, use negativo)" : "Saldo inicial"}<input inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} placeholder="0,00" className="num mt-1 min-h-11 w-full rounded-xl border border-borda bg-transparent px-3 text-sm text-texto" /></label>
        {tipo === "cartao" && <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs text-suave">Limite<input inputMode="decimal" value={limite} onChange={(e) => setLimite(e.target.value)} className="num mt-1 min-h-11 w-full rounded-xl border border-borda bg-transparent px-3 text-sm text-texto" /></label>
          <label className="block text-xs text-suave">Fecha dia<input inputMode="numeric" value={fecha} onChange={(e) => setFecha(e.target.value)} className="num mt-1 min-h-11 w-full rounded-xl border border-borda bg-transparent px-3 text-sm text-texto" /></label>
          <label className="block text-xs text-suave">Vence dia<input inputMode="numeric" value={vence} onChange={(e) => setVence(e.target.value)} className="num mt-1 min-h-11 w-full rounded-xl border border-borda bg-transparent px-3 text-sm text-texto" /></label>
        </div>}
        <div><div className="mb-2 text-xs text-suave">Cor</div><div className="flex flex-wrap gap-2">{CORES.map((c) => <button key={c} onClick={() => setCor(c)} aria-label={`Cor ${c}`} aria-pressed={cor === c} className={`size-9 rounded-full ring-2 ${cor === c ? "ring-white" : "ring-transparent"}`} style={{ background: c }} />)}</div></div>
        {erro && <Aviso tom="erro">{erro}</Aviso>}{aviso && <Aviso>{aviso}</Aviso>}
        <div className="flex gap-2 pt-1">
          {editando && <Botao variante="perigo" onClick={remover} aria-label="Remover conta"><Icone nome="lixeira" tam={18} /></Botao>}
          <Botao variante="primario" className="flex-1" onClick={salvar}>Salvar</Botao>
        </div>
        {editando && <p className="text-xs text-suave">Se a conta já tem lançamentos, ela é arquivada (some das listas) para não perder o histórico.</p>}
      </div>
    </Folha>
  );
}
