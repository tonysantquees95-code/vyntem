// O que o app precisa do aparelho: abrir links e se atualizar. O resto (dados, contas, gráficos) é da própria interface.
export interface ProgressoAtualizacao { estado: "parada" | "baixando" | "pronta" | "erro"; feitos: number; total: number; erro: string }

export interface Recursos {
  /** o app se atualiza baixando o instalador e abrindo a instalação */
  atualizaSozinho: boolean;
}

export interface LembreteDoAparelho { numero: number; quando: number; titulo: string; corpo: string }

export interface Motor {
  plataforma: "windows" | "android" | "demonstracao";
  recursos: Recursos;
  abrirLink(url: string): Promise<void>;
  /** Abre a câmera do aparelho e devolve a foto (null = a pessoa desistiu). Só existe onde há câmera de verdade (Android). */
  tirarFoto?(): Promise<Blob | null>;
  /** Lembretes de contas a vencer (notificações do próprio aparelho, sem internet). Só existe no Android; pede a permissão na hora. */
  agendarLembretes?(lista: LembreteDoAparelho[]): Promise<"ok" | "negado">;
  /** Entrega um arquivo à pessoa: no Android abre o "Compartilhar" (WhatsApp, e-mail, Drive…); no computador baixa. */
  entregarArquivo(nome: string, bytes: Uint8Array, tipo: string): Promise<"compartilhado" | "baixado">;
  /** Atualização em duas etapas: baixa com andamento e só instala quando a pessoa escolher. */
  baixarAtualizacao(url: string, sha256: string, tamanho: number): Promise<void>;
  progressoAtualizacao(): Promise<ProgressoAtualizacao>;
  instalarBaixada(): Promise<void>;
  /** Baixa e instala de uma vez (usado quando a pessoa toca em "Atualizar" nos Ajustes). */
  instalarAtualizacao(url: string, sha256: string): Promise<void>;
}
