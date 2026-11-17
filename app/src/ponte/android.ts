import { registerPlugin } from "@capacitor/core";
import type { Motor, ProgressoAtualizacao } from "./tipos";

/** Plugin Kotlin/Java do Vyntem (android/src/VyntemPlugin.java): só a atualização do próprio app. */
interface PluginVyntem {
  instalarAtualizacao(o: { url: string; sha256: string }): Promise<void>;
  baixarAtualizacao(o: { url: string; sha256: string; tamanho: number }): Promise<void>;
  progressoAtualizacao(): Promise<ProgressoAtualizacao>;
  instalarBaixada(): Promise<void>;
}
export const Vyntem = registerPlugin<PluginVyntem>("Vyntem");

export function motorAndroid(): Motor {
  return {
    plataforma: "android",
    recursos: { atualizaSozinho: true },
    abrirLink: async (url) => { window.open(url, "_blank"); },
    instalarAtualizacao: (url, sha256) => Vyntem.instalarAtualizacao({ url, sha256 }),
    baixarAtualizacao: (url, sha256, tamanho) => Vyntem.baixarAtualizacao({ url, sha256, tamanho }),
    progressoAtualizacao: () => Vyntem.progressoAtualizacao(),
    instalarBaixada: () => Vyntem.instalarBaixada(),
  };
}
