import type { CSSProperties, ReactElement, SVGProps } from "react";

/** Ícones de linha, no mesmo padrão da suíte Vetorial: traço, ponta, junta e preenchimento vêm do pacote escolhido em Ajustes › Personalizar. */
const estilo: CSSProperties = {
  strokeWidth: "var(--icone-traco, 1.7)",
  strokeLinecap: "var(--icone-ponta, round)" as CSSProperties["strokeLinecap"],
  strokeLinejoin: "var(--icone-junta, round)" as CSSProperties["strokeLinejoin"],
  fillOpacity: "var(--icone-preench, 0)" as unknown as number,
};

function Svg({ children, tam = 24, style, ...r }: SVGProps<SVGSVGElement> & { tam?: number }) {
  return <svg width={tam} height={tam} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" aria-hidden {...r} style={{ ...estilo, ...style }}>{children}</svg>;
}
const L = { fill: "none" } as const;

const MENU = ["inicio", "lancamentos", "calendario", "graficos", "contas", "categorias", "assistente", "ajustes", "menu", "fechar", "atualizar", "mais", "camera", "seta_e", "seta_d", "cartao", "lixeira", "editar", "check", "buscar", "filtro", "enviar", "olho", "olho_off"] as const;
export const NOMES_DE_CATEGORIA = ["mercado", "restaurante", "casa", "transporte", "saude", "presente", "viagem", "pet", "luz", "carro", "beleza", "esporte", "educacao", "lazer", "roupas", "celular", "salario", "investimento", "freela", "outros"] as const;
export type NomeIcone = (typeof MENU)[number] | (typeof NOMES_DE_CATEGORIA)[number];

const DESENHOS: Record<NomeIcone, ReactElement> = {
  inicio: <path d="M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1z" />,
  lancamentos: <path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" {...L} />,
  calendario: <g><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" {...L} /></g>,
  graficos: <g><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z" /><path d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15z" {...L} /></g>,
  contas: <g><path d="M4 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1.5H15a2.5 2.5 0 0 0 0 5h4V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="15.5" cy="12" r=".8" {...L} /></g>,
  categorias: <g><path d="M3.5 12.3V5.5a2 2 0 0 1 2-2h6.8l8 8a2 2 0 0 1 0 2.8l-6.5 6.5a2 2 0 0 1-2.8 0z" /><circle cx="8" cy="8" r="1.3" {...L} /></g>,
  assistente: <g><path d="M11 4.5 12.8 10l5.7 1.8-5.7 1.8L11 19l-1.8-5.4L3.5 11.8 9.2 10z" /><path d="M19 3v4M17 5h4" {...L} /></g>,
  ajustes: <g {...L}><path d="M10.32 5.00 L10.87 2.47 L13.13 2.47 L13.68 5.00 L15.76 5.86 L17.94 4.46 L19.54 6.06 L18.14 8.24 L19.00 10.32 L21.53 10.87 L21.53 13.13 L19.00 13.68 L18.14 15.76 L19.54 17.94 L17.94 19.54 L15.76 18.14 L13.68 19.00 L13.13 21.53 L10.87 21.53 L10.32 19.00 L8.24 18.14 L6.06 19.54 L4.46 17.94 L5.86 15.76 L5.00 13.68 L2.47 13.13 L2.47 10.87 L5.00 10.32 L5.86 8.24 L4.46 6.06 L6.06 4.46 L8.24 5.86 Z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3.1" /></g>,
  menu: <path d="M4 7h16M4 12h16M4 17h10" {...L} />,
  fechar: <path d="M6 6l12 12M18 6 6 18" {...L} />,
  atualizar: <g {...L}><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v4.6h-4.6" /></g>,
  mais: <path d="M12 5v14M5 12h14" {...L} />,
  camera: <g><path d="M4 8.5a2 2 0 0 1 2-2h1.6l1.2-2h6.4l1.2 2H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.4" {...L} /></g>,
  seta_e: <path d="m14.5 5-7 7 7 7" {...L} />,
  seta_d: <path d="m9.5 5 7 7-7 7" {...L} />,
  cartao: <g><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M6.5 15h3" {...L} /></g>,
  lixeira: <path d="M5 7h14M10 3.5h4M7 7l1 12.5h8L17 7M10.5 11v5M13.5 11v5" {...L} />,
  editar: <path d="M5 19l1-4L16.5 4.5a2 2 0 0 1 3 3L9 18z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" {...L} />,
  buscar: <g {...L}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></g>,
  filtro: <path d="M4 6h16M7 12h10M10 18h4" {...L} />,
  enviar: <g><path d="M4 12 20 4l-4 16-4.5-6z" /><path d="m11.5 14 8.5-10" {...L} /></g>,
  olho: <g {...L}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></g>,
  olho_off: <g {...L}><path d="M4 4l16 16M9.6 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.3 7.7A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.7-.3 3.8-.8" /></g>,
  // categorias
  mercado: <g><path d="M4 9h16l-1.6 9a2 2 0 0 1-2 1.7H7.6a2 2 0 0 1-2-1.7z" /><path d="M8.5 9 11 4M15.5 9 13 4" {...L} /></g>,
  restaurante: <g {...L}><path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 21V3c-2 1.5-3 4-3 7v3h3" /></g>,
  casa: <g><path d="M4 11 12 4l8 7v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" /><path d="M10 20.5V15h4v5.5" {...L} /></g>,
  transporte: <g><rect x="5" y="4" width="14" height="13" rx="3" /><path d="M5 11h14M8 20v-3M16 20v-3" {...L} /></g>,
  saude: <g><path d="M12 20s-7.5-4.6-7.5-10a4.2 4.2 0 0 1 7.5-2.5A4.2 4.2 0 0 1 19.5 10C19.5 15.4 12 20 12 20z" /><path d="M7.5 12h2l1.3-2.3 2 4 1.2-1.7h2" {...L} /></g>,
  presente: <g><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M12 9v11M3.5 9h17M12 9C9 9 7.5 7.8 8 6.4S10.5 4.5 12 9c1.5-4.5 3.5-3.6 4 -2.6S15 9 12 9" {...L} /></g>,
  viagem: <g><path d="M3 13.5 21 4l-4.5 16-4.2-5.3L8 17.5l.8-4.6z" /></g>,
  pet: <g><circle cx="7" cy="10" r="1.7" /><circle cx="11" cy="6.5" r="1.7" /><circle cx="16" cy="7" r="1.7" /><circle cx="19" cy="11.5" r="1.7" /><path d="M12.5 12.5c3 0 5 2.8 4.2 5.2-.8 2.3-3 1.5-4.7 1.2-1.7.3-3.9 1.1-4.7-1.2-.8-2.4 2.2-5.2 5.2-5.2z" /></g>,
  luz: <path d="M13 2.8 5.5 13.2h5.2L9.9 21.2 18.5 10h-5.4z" />,
  carro: <g><path d="M4.5 15v-3l2-5a2 2 0 0 1 1.9-1.3h7.2A2 2 0 0 1 17.5 7l2 5v3a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" /><path d="M5 12h14M7 16v2.5M17 16v2.5" {...L} /></g>,
  beleza: <g><path d="M9 21v-6h6v6z" /><path d="M10 15v-4h4v4zM10.5 11 12 4l1.5 7" {...L} /></g>,
  esporte: <path d="M3.5 9.5v5M6.5 7v10M17.5 7v10M20.5 9.5v5M6.5 12h11" {...L} />,
  educacao: <g><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H6a2 2 0 0 0-2 2z" /><path d="M4 20a2 2 0 0 1 2-2h13v2.5H6" {...L} /></g>,
  lazer: <g><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="M9.5 6v2M9.5 11v2M9.5 16v2" {...L} /></g>,
  roupas: <path d="M8 4 3.5 7l2 3.5L8 9.5V20h8V9.5l2.5 1 2-3.5L16 4c-.5 1.3-2 2-4 2S8.5 5.3 8 4z" />,
  celular: <g><rect x="7" y="3.5" width="10" height="17" rx="2.5" /><path d="M11 17.5h2" {...L} /></g>,
  salario: <g><rect x="3" y="6.5" width="18" height="11" rx="2" /><circle cx="12" cy="12" r="2.6" {...L} /></g>,
  investimento: <g {...L}><path d="M4 17 9.5 11.5l3.5 3.5L20 8" /><path d="M15 8h5v5" /></g>,
  freela: <g><rect x="4" y="8" width="16" height="11" rx="2" /><path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8M4 13h16" {...L} /></g>,
  outros: <g {...L}><circle cx="12" cy="12" r="8.5" /><path d="M9.8 9.6a2.3 2.3 0 1 1 3.2 2.1c-.7.4-1 .9-1 1.6M12 16.5v.01" /></g>,
};

export function Icone({ nome, tam = 24, className }: { nome: NomeIcone; tam?: number; className?: string }) {
  return <Svg tam={tam} className={className}>{DESENHOS[nome] ?? DESENHOS.outros}</Svg>;
}
/** Ícone de categoria vindo dos dados (texto livre): se não existir, usa "outros". */
export const IconeDeCategoria = ({ nome, tam, className }: { nome: string; tam?: number; className?: string }) => <Icone nome={(NOMES_DE_CATEGORIA as readonly string[]).includes(nome) ? (nome as NomeIcone) : "outros"} tam={tam} className={className} />;
