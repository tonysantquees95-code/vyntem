import type { Motor } from "./tipos";

/** Windows: fala com os comandos em Rust do Tauri (desktop/src-tauri/src/main.rs). */
export async function motorTauri(): Promise<Motor> {
  const { invoke } = await import("@tauri-apps/api/core");
  return {
    plataforma: "windows",
    recursos: { atualizaSozinho: true },
    abrirLink: (url) => invoke("abrir_link", { url }),
    instalarAtualizacao: (url, sha256) => invoke("instalar_atualizacao", { url, sha256 }),
    baixarAtualizacao: (url, sha256, tamanho) => invoke("baixar_atualizacao", { url, sha256, tamanho }),
    progressoAtualizacao: () => invoke("progresso_atualizacao"),
    instalarBaixada: () => invoke("instalar_atualizacao_baixada"),
  };
}
