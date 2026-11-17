import { useState, type FormEvent } from "react";
import { perguntaSecreta, recuperarPorSegredo } from "../conta";
import { Aviso, Botao, Cartao } from "../ui";

const campo = "min-h-11 w-full rounded-xl border border-borda bg-black/20 px-3 text-[15px]";

/** Esqueci a senha: escolhe entre a senha de 6 números e a pergunta secreta, depois define a senha nova. */
export function RecuperarSenha({ emailInicial, aoVoltar }: { emailInicial: string; aoVoltar: (emailTrocado?: string) => void }) {
  const [email, setEmail] = useState(emailInicial);
  const [info, setInfo] = useState<{ configurada: boolean; pergunta: string } | null>(null);
  const [metodo, setMetodo] = useState<"pin" | "pergunta" | null>(null);
  const [valor, setValor] = useState("");
  const [nova, setNova] = useState(""); const [nova2, setNova2] = useState("");
  const [erro, setErro] = useState(""); const [ocupado, setOcupado] = useState(false);

  async function buscar(ev: FormEvent) {
    ev.preventDefault(); setErro(""); setOcupado(true);
    try {
      const r = await perguntaSecreta(email.trim());
      if (!r.existe) setErro("Não encontramos uma conta com esse e-mail.");
      else if (!r.configurada) setErro("Essa conta foi criada antes da recuperação por senha de 6 números. Entre com a senha e cadastre a recuperação em Minha conta.");
      else setInfo(r);
    } catch (e) { setErro(e instanceof Error ? e.message : "Não deu certo."); }
    setOcupado(false);
  }
  async function trocar(ev: FormEvent) {
    ev.preventDefault(); setErro("");
    if (nova.length < 8) { setErro("A senha nova precisa ter pelo menos 8 caracteres."); return; }
    if (nova !== nova2) { setErro("As duas senhas novas não são iguais."); return; }
    setOcupado(true);
    try { await recuperarPorSegredo(email.trim(), metodo!, valor, nova); aoVoltar(email.trim()); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não deu certo."); }
    setOcupado(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-center text-2xl font-semibold">Recuperar a senha</h1>
      <Cartao>
        {!info ? (
          <form onSubmit={buscar} className="space-y-3">
            <label className="block text-sm"><span className="text-suave">E-mail da sua conta</span><input className={campo} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            {erro && <Aviso tom="erro">{erro}</Aviso>}
            <Botao type="submit" variante="primario" className="w-full" disabled={ocupado}>Continuar</Botao>
          </form>
        ) : !metodo ? (
          <div className="space-y-2">
            <p className="text-sm text-suave">Como você quer provar que é você?</p>
            <Botao className="w-full" onClick={() => setMetodo("pin")}>Usar a senha de recuperação (6 números)</Botao>
            <Botao className="w-full" onClick={() => setMetodo("pergunta")}>Responder a pergunta secreta</Botao>
          </div>
        ) : (
          <form onSubmit={trocar} className="space-y-3">
            {metodo === "pergunta" && <p className="text-sm">{info.pergunta}</p>}
            <label className="block text-sm"><span className="text-suave">{metodo === "pin" ? "Senha de recuperação (6 números)" : "Sua resposta"}</span>
              <input className={campo} type={metodo === "pin" ? "password" : "text"} inputMode={metodo === "pin" ? "numeric" : "text"} maxLength={metodo === "pin" ? 6 : 80} autoComplete="off" value={valor} onChange={(e) => setValor(metodo === "pin" ? e.target.value.replace(/\D/g, "") : e.target.value)} required /></label>
            <label className="block text-sm"><span className="text-suave">Senha nova (mínimo 8 caracteres)</span><input className={campo} type="password" autoComplete="new-password" minLength={8} value={nova} onChange={(e) => setNova(e.target.value)} required /></label>
            <label className="block text-sm"><span className="text-suave">Repita a senha nova</span><input className={campo} type="password" autoComplete="new-password" minLength={8} value={nova2} onChange={(e) => setNova2(e.target.value)} required /></label>
            {erro && <Aviso tom="erro">{erro}</Aviso>}
            <Botao type="submit" variante="primario" className="w-full" disabled={ocupado}>Trocar a senha</Botao>
            <Botao type="button" className="w-full" onClick={() => { setMetodo(null); setValor(""); setErro(""); }}>Escolher outro jeito</Botao>
          </form>
        )}
      </Cartao>
      <button type="button" onClick={() => aoVoltar()} className="min-h-11 text-sm text-neon underline">Voltar ao login</button>
    </main>
  );
}
