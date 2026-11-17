import { useCallback, useEffect, useRef, useState } from "react";
import { useMotor } from "./estado";
import { bytes } from "./formato";
import type { InfoVersao } from "./atualizacao";
import { Aviso, Botao } from "./ui";

/**
 * Atualização no jeito da Vênus: avisa da versão nova, mostra a barra do download e deixa a pessoa escolher a hora de instalar.
 * `baixarSozinho`: começa a baixar assim que aparece (ajuste "Atualizar sozinho"); a instalação continua sendo escolha da pessoa.
 */
export function AtualizacaoAviso({ nova, baixarSozinho, aoSemSuporte }: { nova: InfoVersao; baixarSozinho: boolean; aoSemSuporte: () => void }) {
  const motor = useMotor();
  const [fase, setFase] = useState<"nova" | "baixando" | "pronta" | "erro">("nova");
  const [feitos, setFeitos] = useState(0);
  const [total, setTotal] = useState(nova.tamanho);
  const [erro, setErro] = useState("");
  const comecou = useRef(0);

  const baixar = useCallback(async () => {
    if (!motor.recursos.atualizaSozinho) { aoSemSuporte(); return; }
    setErro(""); setFase("baixando"); setFeitos(0);
    try { await motor.baixarAtualizacao(nova.url, nova.sha256, nova.tamanho); }
    catch (e) { setFase("erro"); setErro(e instanceof Error ? e.message : typeof e === "string" ? e : "Não consegui baixar agora."); }
  }, [motor, nova, aoSemSuporte]);

  useEffect(() => {
    if (baixarSozinho && motor.recursos.atualizaSozinho && comecou.current !== nova.numero) { comecou.current = nova.numero; void baixar(); }
  }, [baixarSozinho, nova.numero, baixar, motor]);

  useEffect(() => {
    if (fase !== "baixando") return;
    let vivo = true;
    const t = window.setInterval(() => {
      void motor.progressoAtualizacao().then((p) => {
        if (!vivo) return;
        setFeitos(p.feitos); if (p.total > 0) setTotal(p.total);
        if (p.estado === "pronta") setFase("pronta");
        else if (p.estado === "erro") { setFase("erro"); setErro(p.erro || "Não consegui baixar a atualização."); }
      }).catch(() => undefined);
    }, 500);
    return () => { vivo = false; window.clearInterval(t); };
  }, [fase, motor]);

  async function instalar() {
    setErro("");
    try { await motor.instalarBaixada(); }
    catch (e) { setFase("erro"); setErro(e instanceof Error ? e.message : typeof e === "string" ? e : "Não consegui instalar agora."); }
  }

  const pct = fase === "pronta" ? 100 : total > 0 ? Math.min(100, Math.round((feitos / total) * 100)) : null;
  return (
    <div className="mb-3 space-y-2">
      <Aviso>
        {fase === "nova" && <>Tem versão nova do Vyntem (1.{nova.numero}). <button className="ml-1 underline" onClick={() => void baixar()}>Baixar</button></>}
        {fase === "baixando" && <>Baixando o Vyntem 1.{nova.numero}{pct !== null ? ` · ${pct}%` : "…"}{total > 0 ? ` (${bytes(feitos)} de ${bytes(total)})` : ""}</>}
        {fase === "pronta" && <>O Vyntem 1.{nova.numero} está pronto para instalar. {motor.plataforma === "android" ? "O Android vai pedir a sua confirmação." : "O Vyntem fecha, atualiza e abre de novo sozinho."}</>}
        {fase === "erro" && <>{erro || "Não consegui atualizar agora."} <button className="ml-1 underline" onClick={() => void baixar()}>Tentar de novo</button></>}
      </Aviso>
      {(fase === "baixando" || fase === "pronta") && (
        <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full bg-neon transition-all ${pct === null ? "w-1/3 animate-pulse" : ""}`} style={pct === null ? undefined : { width: `${pct}%` }} />
        </div>
      )}
      {fase === "pronta" && <Botao variante="primario" onClick={() => void instalar()}>Instalar agora</Botao>}
    </div>
  );
}
