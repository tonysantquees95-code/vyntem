// O que o app precisa do aparelho: abrir links e se atualizar. O resto (dados, contas, gráficos) é da própria interface.
export interface ProgressoAtualizacao { estado: "parada" | "baixando" | "pronta" | "erro"; feitos: number; total: number; erro: string }

export interface Recursos {
  /** o app se atualiza baixando o instalador e abrindo a instalação */
  atualizaSozinho: boolean;
}

export interface Motor {
  plataforma: "windows" | "android" | "demonstracao";
  recursos: Recursos;
  abrirLink(url: string): Promise<void>;
  /** Atualização em duas etapas: baixa com andamento e só instala quando a pessoa escolher. */
  baixarAtualizacao(url: string, sha256: string, tamanho: number): Promise<void>;
  progressoAtualizacao(): Promise<ProgressoAtualizacao>;
  instalarBaixada(): Promise<void>;
  /** Baixa e instala de uma vez (usado quando a pessoa toca em "Atualizar" nos Ajustes). */
  instalarAtualizacao(url: string, sha256: string): Promise<void>;
}
