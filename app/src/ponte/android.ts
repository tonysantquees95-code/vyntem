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
    // câmera pelo plugin oficial do Capacitor: pede a permissão na hora e abre o app de câmera (o seletor de arquivos do WebView não abre a câmera)
    tirarFoto: async () => {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      try {
        const f = await Camera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.Uri, quality: 80, width: 1600, correctOrientation: true, saveToGallery: false });
        if (!f.webPath) return null;
        return await (await fetch(f.webPath)).blob();
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        if (/cancel/i.test(m)) return null;
        if (/denied|permission/i.test(m)) throw new Error("O Vyntem não tem permissão para usar a câmera. Libere em Configurações do Android › Apps › Vyntem › Permissões.");
        throw new Error("Não consegui abrir a câmera.");
      }
    },
    instalarAtualizacao: (url, sha256) => Vyntem.instalarAtualizacao({ url, sha256 }),
    baixarAtualizacao: (url, sha256, tamanho) => Vyntem.baixarAtualizacao({ url, sha256, tamanho }),
    progressoAtualizacao: () => Vyntem.progressoAtualizacao(),
    instalarBaixada: () => Vyntem.instalarBaixada(),
  };
}
