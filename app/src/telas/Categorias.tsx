import { useState } from "react";
import { removerCategoria, salvarCategoria, useBanco } from "../banco";
import { CORES_DE_CATEGORIA, ICONES_DE_CATEGORIA, novoId, type Categoria } from "../dados";
import { Icone } from "../icones";
import { Aviso, Botao, Cartao, Folha } from "../ui";
import { Bolinha, Chips } from "../comuns";

/** Categorias próprias: nome, ícone e cor, separadas em despesas e receitas. */
export function Categorias() {
  const banco = useBanco();
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [edit, setEdit] = useState<Categoria | "nova" | null>(null);
  const lista = banco.categorias.filter((c) => c.tipo === tipo);
  return (
    <div className="space-y-3">
      <Chips itens={[{ id: "despesa", rotulo: "Despesas" }, { id: "receita", rotulo: "Receitas" }] as const} valor={tipo} aoMudar={setTipo} rotulo="Tipo" />
      <Cartao><ul className="-mx-2">{lista.map((c) => <li key={c.id}><button onClick={() => setEdit(c)} className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 text-left hover:bg-white/5"><Bolinha cat={c} /><span className="flex-1 truncate text-sm">{c.nome}</span><Icone nome="editar" tam={16} className="text-suave" /></button></li>)}</ul></Cartao>
      <Botao className="w-full" onClick={() => setEdit("nova")}><Icone nome="mais" tam={18} />Nova categoria</Botao>
      <Formulario valor={edit} tipo={tipo} aoFechar={() => setEdit(null)} />
    </div>
  );
}

function Formulario({ valor, tipo, aoFechar }: { valor: Categoria | "nova" | null; tipo: "despesa" | "receita"; aoFechar: () => void }) {
  const editando = valor && valor !== "nova" ? valor : null;
  const banco = useBanco();
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState<string>("outros");
  const [cor, setCor] = useState<string>(CORES_DE_CATEGORIA[5]);
  const [subs, setSubs] = useState<string[]>([]);
  const [novaSub, setNovaSub] = useState("");
  const [erro, setErro] = useState("");
  const [chave, setChave] = useState<unknown>(null);
  if (chave !== valor) { setChave(valor); setErro(""); if (editando) { setNome(editando.nome); setIcone(editando.icone); setCor(editando.cor); setSubs(editando.subs ?? []); } else { setNome(""); setIcone("outros"); setCor(CORES_DE_CATEGORIA[5]); setSubs([]); } setNovaSub(""); }
  const usos = editando ? banco.lancamentos.filter((l) => l.categoriaId === editando.id).length : 0;
  function juntarSub() {
    const s = novaSub.trim().slice(0, 30);
    if (!s) return;
    if (!subs.some((x) => x.toLowerCase() === s.toLowerCase()) && subs.length < 30) setSubs([...subs, s]);
    setNovaSub("");
  }
  function salvar() {
    const n = nome.trim();
    if (!n) { setErro("Dê um nome para a categoria."); return; }
    const t = editando?.tipo ?? tipo;
    if (banco.categorias.some((c) => c.tipo === t && c.id !== editando?.id && c.nome.toLowerCase() === n.toLowerCase())) { setErro("Já existe uma categoria com esse nome."); return; }
    const falha = salvarCategoria({ id: editando?.id ?? novoId("c"), nome: n.slice(0, 30), tipo: t, icone, cor, subs: (novaSub.trim() && !subs.some((x) => x.toLowerCase() === novaSub.trim().toLowerCase()) ? [...subs, novaSub.trim().slice(0, 30)] : subs).slice(0, 30) });
    if (falha) { setErro(falha); return; }
    aoFechar();
  }
  return (
    <Folha aberta={!!valor} titulo={editando ? "Editar categoria" : "Nova categoria"} aoFechar={aoFechar}>
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Bolinha cat={{ icone, cor }} tam={52} /><input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={30} placeholder="Nome da categoria" aria-label="Nome" className="min-h-11 flex-1 rounded-xl border border-borda bg-transparent px-3 text-sm" /></div>
        <div><div className="mb-2 text-xs text-suave">Ícone</div><div className="grid grid-cols-5 gap-2">{ICONES_DE_CATEGORIA.map((i) => <button key={i} onClick={() => setIcone(i)} aria-label={i} aria-pressed={icone === i} className={`grid h-11 place-items-center rounded-xl border ${icone === i ? "border-neon bg-neon/10" : "border-borda text-suave"}`}><Icone nome={i} tam={22} /></button>)}</div></div>
        <div><div className="mb-2 text-xs text-suave">Cor</div><div className="flex flex-wrap gap-2">{CORES_DE_CATEGORIA.map((c) => <button key={c} onClick={() => setCor(c)} aria-label={`Cor ${c}`} aria-pressed={cor === c} className={`size-9 rounded-full ring-2 ${cor === c ? "ring-white" : "ring-transparent"}`} style={{ background: c }} />)}</div></div>
        <div>
          <div className="mb-2 text-xs text-suave">Subcategorias <span className="opacity-70">(aparecem para escolher com um toque ao lançar)</span></div>
          {subs.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{subs.map((s) => <button key={s} onClick={() => setSubs(subs.filter((x) => x !== s))} aria-label={`Tirar ${s}`} className="flex min-h-9 items-center gap-1 rounded-full border border-borda px-3 text-xs text-texto">{s}<span className="text-suave">✕</span></button>)}</div>}
          <div className="flex gap-2"><input value={novaSub} onChange={(e) => setNovaSub(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); juntarSub(); } }} maxLength={30} placeholder="Ex.: Gasolina" aria-label="Nova subcategoria" className="min-h-11 min-w-0 flex-1 rounded-xl border border-borda bg-transparent px-3 text-sm text-texto" /><Botao onClick={juntarSub} aria-label="Adicionar subcategoria"><Icone nome="mais" tam={18} /></Botao></div>
        </div>
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <div className="flex gap-2">
          {editando && <Botao variante="perigo" onClick={() => { removerCategoria(editando.id); aoFechar(); }} aria-label="Apagar categoria"><Icone nome="lixeira" tam={18} /></Botao>}
          <Botao variante="primario" className="flex-1" onClick={salvar}>Salvar</Botao>
        </div>
        {editando && usos > 0 && <p className="text-xs text-suave">{usos} lançamento(s) usam esta categoria; se apagar, eles ficam “Sem categoria”.</p>}
      </div>
    </Folha>
  );
}
