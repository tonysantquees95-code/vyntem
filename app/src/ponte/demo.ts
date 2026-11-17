import type { Motor } from "./tipos";

/** Navegador comum (sem app instalado): tudo funciona, só não há atualização automática. */
export function motorDemo(): Motor {
  const semApp = async (): Promise<never> => { throw new Error("A atualização automática só existe no app instalado."); };
  return {
    plataforma: "demonstracao",
    recursos: { atualizaSozinho: false },
    abrirLink: async (url) => { window.open(url, "_blank", "noopener"); },
    instalarAtualizacao: semApp,
    baixarAtualizacao: semApp,
    progressoAtualizacao: async () => ({ estado: "parada", feitos: 0, total: 0, erro: "" }),
    instalarBaixada: semApp,
  };
}
