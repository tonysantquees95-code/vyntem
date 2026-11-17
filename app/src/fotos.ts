// Fotos de notas e comprovantes: ficam num armazenamento do navegador do app (IndexedDB), reduzidas para não pesar.
const BANCO = "vyntem-fotos";
const LOJA = "fotos";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(LOJA); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error ?? new Error("Sem armazenamento de fotos."));
  });
}
async function usar<T>(modo: IDBTransactionMode, f: (l: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const r = f(db.transaction(LOJA, modo).objectStore(LOJA));
    r.onsuccess = () => { ok(r.result); db.close(); };
    r.onerror = () => { erro(r.error ?? new Error("Falha ao usar as fotos.")); db.close(); };
  });
}
export const guardarFoto = (id: string, blob: Blob): Promise<IDBValidKey> => usar("readwrite", (l) => l.put(blob, id));
export const lerFoto = (id: string): Promise<Blob | undefined> => usar("readonly", (l) => l.get(id) as IDBRequest<Blob | undefined>);
export const apagarFoto = (id: string): Promise<undefined> => usar("readwrite", (l) => l.delete(id) as IDBRequest<undefined>);

function carregarImagem(arquivo: Blob): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error("Não consegui abrir essa imagem.")); };
    img.src = url;
  });
}
/** Reduz a foto para caber no máximo em `lado` pixels e devolve JPEG. */
export async function reduzirFoto(arquivo: Blob, lado: number, qualidade: number): Promise<Blob> {
  const img = await carregarImagem(arquivo);
  const k = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok, erro) => c.toBlob((b) => (b ? ok(b) : erro(new Error("Não consegui reduzir a foto."))), "image/jpeg", qualidade));
}
/** Foto em texto (base64) para a IA ler a nota. Sem o prefixo "data:". */
export async function fotoParaIA(arquivo: Blob): Promise<string> {
  const b = await reduzirFoto(arquivo, 1400, 0.72);
  const bytes = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
/** Apaga todas as fotos guardadas (usado em "Apagar todos os dados"). */
export const limparFotos = (): Promise<undefined> => usar("readwrite", (l) => l.clear() as IDBRequest<undefined>);
