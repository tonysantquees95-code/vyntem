import { useId } from "react";

/** Cifrões da borda da moeda (10, de 36 em 36 graus), desenhados como traços para ficarem iguais em qualquer aparelho. */
const CIFRAO = "M4 0 L4 12 M7 3.5 C7 1.5 1 1.5 1 4 C1 6.5 7 5.5 7 8 C7 10.5 1 10.5 1 8.5";
const ANGULOS = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];

/**
 * A marca do Vyntem: um V em tubo (jeito Vetorial: degradê, sombra e brilho) cuja perna direita termina numa seta que aponta
 * para uma moeda, com barras de gráfico embaixo. O degradê acompanha a cor escolhida em Ajustes; a moeda é sempre dourada.
 * `fundo`: desenha o quadrado arredondado violeta do ícone do app.
 */
export function MarcaVyntem({ tam = 40, fundo = false, className = "" }: { tam?: number; fundo?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 200 200" width={tam} height={tam} className={className} role="img" aria-label="Vyntem">
      <defs>
        <linearGradient id={`t${id}`} gradientUnits="userSpaceOnUse" x1="30" y1="170" x2="165" y2="60">
          <stop offset="0" stopColor="var(--color-neon)" />
          <stop offset="1" stopColor="var(--color-magenta)" />
        </linearGradient>
      </defs>
      {fundo && <rect width="200" height="200" rx="44" fill="#170b2e" />}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(2.5 4)" stroke="color-mix(in srgb, var(--color-neon) 35%, #000)" strokeWidth="15">
        <path d="M28 92 L62 160 L141 64" /><path d="M117 69 L141 64 L141 88" /><path d="M90 156 L90 172 M114 132 L114 172 M138 108 L138 172 M162 84 L162 172" />
      </g>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" stroke={`url(#t${id})`} strokeWidth="14">
        <path d="M28 92 L62 160 L141 64" /><path d="M117 69 L141 64 L141 88" /><path d="M90 156 L90 172 M114 132 L114 172 M138 108 L138 172 M162 84 L162 172" />
      </g>
      <g fill="none" strokeLinecap="round" stroke="#fff" strokeWidth="2.6" opacity="0.4">
        <path d="M26 89 L58 152" /><path d="M70 150 L126 82" /><path d="M87.5 158 L87.5 166 M111.5 134 L111.5 160 M135.5 110 L135.5 150 M159.5 86 L159.5 140" />
      </g>
      <circle cx="164" cy="36" r="23" fill="#f5b73b" stroke="#c98a12" strokeWidth="2.5" />
      <circle cx="164" cy="36" r="13" fill="#ffe08a" />
      <g fill="none" stroke="#7a4b00" strokeWidth="2.4" strokeLinecap="round">
        {ANGULOS.map((a) => <path key={a} transform={`rotate(${a} 164 36) translate(162 15) scale(0.5)`} d={CIFRAO} />)}
      </g>
      <path d="M157 30 L164 44 L171 30" fill="none" stroke="#a34700" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A marca com a pulsação lenta do V vivo da Vetorial (parada para quem pede menos movimento no aparelho). */
export function LogoVivo({ tam = 40, className = "" }: { tam?: number; className?: string }) {
  return <span className={`logo-vivo inline-block flex-none ${className}`} style={{ width: tam, height: tam }}><MarcaVyntem tam={tam} /></span>;
}
