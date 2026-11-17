import { useState, type FormEvent } from "react";
import { ErroConta, SITE_DA_CONTA, type Aparelho, type ErroDeLimite, type Sessao, criarConta, entrar } from "../conta";
import { Aviso, Botao, Cartao } from "../ui";

const campo = "min-h-11 w-full rounded-xl border border-borda bg-black/20 px-3 text-[15px]";

/** Login com o Vetorial ID, a mesma conta da Vênus. Mostra o limite de aparelhos do servidor e deixa trocar. */
export function Conta({ aparelho, aoEntrar }: { aparelho: Aparelho; aoEntrar: (s: Sessao) => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [criar, setCriar] = useState(false);
  const [erro, setErro] = useState("");
  const [limite, setLimite] = useState<ErroDeLimite | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(extra: { encerrar?: string; remover?: string } = {}) {
    setOcupado(true); setErro("");
    try {
      aoEntrar(criar && !extra.encerrar && !extra.remover ? await criarConta(nome.trim(), email.trim(), senha, aparelho) : await entrar(email.trim(), senha, aparelho, extra));
      setLimite(null);
    } catch (e) {
      if (e instanceof ErroConta && e.limite) setLimite(e.limite);
      else setErro(e instanceof Error ? e.message : "Não deu certo.");
    }
    setOcupado(false);
  }
  const aoEnviar = (ev: FormEvent) => { ev.preventDefault(); void enviar(); };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-8">
      <div className="text-center"><img src={`${import.meta.env.BASE_URL}vyntem.png`} alt="" width={72} height={72} className="mx-auto size-[72px] rounded-2xl brilho" /><h1 className="mt-3 text-2xl font-semibold">Vyntem</h1><p className="text-xs uppercase tracking-[0.2em] text-neon">Finanças com IA</p><p className="text-sm text-suave">Entre com o seu Vetorial ID, o mesmo da Vênus.</p></div>
      {limite ? (
        <Cartao titulo={limite.tipo === "sessoes" ? "Limite de aparelhos ao mesmo tempo" : "Limite de aparelhos vinculados"}>
          <p className="mb-3 text-sm text-suave">{limite.tipo === "sessoes" ? "Encerre uma sessão para entrar neste aparelho." : "Remova um aparelho para vincular este."}</p>
          <div className="space-y-2">{limite.itens.map((i) => <Botao key={i.id} className="w-full justify-between" disabled={ocupado} onClick={() => void enviar(limite.tipo === "sessoes" ? { encerrar: i.id } : { remover: i.id })}><span>{i.titulo}</span><span className="text-xs text-suave">{limite.tipo === "sessoes" ? "encerrar" : "remover"}</span></Botao>)}<Botao className="w-full" onClick={() => setLimite(null)}>Cancelar</Botao></div>
        </Cartao>
      ) : (
        <Cartao>
          <form onSubmit={aoEnviar} className="space-y-3" aria-label={criar ? "Criar conta" : "Entrar"}>
            {criar && <label className="block text-sm"><span className="text-suave">Seu nome</span><input className={campo} autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required /></label>}
            <label className="block text-sm"><span className="text-suave">E-mail do Vetorial ID</span><input className={campo} type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label className="block text-sm"><span className="text-suave">Senha</span><input className={campo} type="password" autoComplete={criar ? "new-password" : "current-password"} minLength={criar ? 8 : undefined} value={senha} onChange={(e) => setSenha(e.target.value)} required /></label>
            {erro && <Aviso tom="erro">{erro}</Aviso>}
            <Botao type="submit" variante="primario" className="w-full" disabled={ocupado}>{ocupado ? (criar ? "Criando…" : "Entrando…") : criar ? "Criar conta grátis" : "Entrar"}</Botao>
            <button type="button" onClick={() => { setCriar((v) => !v); setErro(""); }} className="min-h-11 w-full text-sm text-neon underline">{criar ? "Já tenho conta: entrar" : "Não tenho conta: criar agora (grátis)"}</button>
          </form>
        </Cartao>
      )}
      <p className="text-center text-xs text-suave">O Vyntem é grátis. O Vetorial ID é a sua conta única da Vetorial Tech: criar leva um minuto e vale para todos os apps. Esqueceu a senha? Recupere <a className="underline" href={SITE_DA_CONTA} target="_blank" rel="noopener noreferrer">no site</a>.</p>
    </main>
  );
}
