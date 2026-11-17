import { useRef, useState } from "react";
import { useMotor } from "./estado";
import { Icone } from "./icones";
import { Aviso, Botao } from "./ui";

/** Duas maneiras de trazer a foto de uma nota: tirar agora (câmera, onde existe) ou escolher uma que já está no aparelho. */
export function OpcoesDeFoto({ aoFoto }: { aoFoto: (f: Blob) => void }) {
  const motor = useMotor();
  const galeria = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");
  const [abrindo, setAbrindo] = useState(false);
  async function tirar() {
    setErro(""); setAbrindo(true);
    try { const f = await motor.tirarFoto?.(); if (f) aoFoto(f); } catch (e) { setErro(e instanceof Error ? e.message : "Não consegui abrir a câmera."); } finally { setAbrindo(false); }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {motor.tirarFoto && <Botao onClick={() => void tirar()} disabled={abrindo}><Icone nome="camera" tam={18} />Tirar foto</Botao>}
        <Botao onClick={() => galeria.current?.click()}><Icone nome="lancamentos" tam={18} />{motor.tirarFoto ? "Escolher da galeria" : "Escolher foto"}</Botao>
      </div>
      <input ref={galeria} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) aoFoto(f); e.target.value = ""; }} />
      {erro && <Aviso tom="erro">{erro}</Aviso>}
    </div>
  );
}
