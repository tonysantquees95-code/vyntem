/** Baixa um arquivo pelo navegador (computador e modo de demonstração). */
export async function baixarArquivo(nome: string, bytes: Uint8Array, tipo: string): Promise<"baixado"> {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: tipo }));
  const a = document.createElement("a"); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "baixado";
}
