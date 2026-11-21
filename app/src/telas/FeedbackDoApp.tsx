import { useMotor } from "../estado";
import { SERVIDOR } from "../servidor";
import { BUILD } from "../atualizacao";
import { Botao } from "../ui";

/** Feedback, relato de erro e pesquisa rápida: a página do servidor aberta aqui dentro, com o app, a versão e a plataforma. */
export function FeedbackDoApp({ aoFechar }: { aoFechar: () => void }) {
  const motor = useMotor();
  const endereco = `${SERVIDOR}/feedback?app=vyntem&v=${BUILD > 0 ? `1.${BUILD}` : ""}&p=${motor.plataforma === "android" ? "android" : "windows"}`;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-fundo">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 py-3">
        <span className="text-sm font-semibold tracking-wide text-suave">FEEDBACK · Vyntem</span>
        <Botao onClick={aoFechar}>Fechar</Botao>
      </div>
      <iframe title="Feedback e relato de erro" src={endereco} className="mx-auto min-h-0 w-full max-w-2xl flex-1 border-0 bg-[#070a1c]" />
    </div>
  );
}
