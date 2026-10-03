/**
 * Ajudantes compartilhados pelas animações de cada seção.
 * GSAP, ScrollTrigger e SplitText chegam pelo CDN (window) antes destes módulos.
 */
const { gsap, SplitText } = window;

export const q = (sel, root = document) => root.querySelector(sel);
/** Celular e tablet: versões leves (hero 2D, menos texturas, abertura mais curta). */
export const isLightDevice = () => window.matchMedia('(max-width: 899px), (pointer: coarse)').matches;
export const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const withTimeout = (promise, ms) =>
  Promise.race([promise, wait(ms).then(() => Promise.reject(new Error(`timeout ${ms}ms`)))]);

/** Número no formato brasileiro, com zeros à esquerda opcionais. */
const formats = {}; // um formatador por nº de casas (criar um a cada quadro é caro)
export const fmt = (n, pad = 0, decimals = 0) => {
  formats[decimals] ||= new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const s = formats[decimals].format(n);
  return pad ? s.padStart(pad, '0') : s;
};

/** Liga a máscara de cada .line (com folga para acentos e cedilha). */
export function maskLines(el) {
  const lines = qa('.line', el);
  lines.forEach((line) => line.classList.add('is-masked'));
  return lines;
}

export function splitInner(line, type) {
  return SplitText.create(q('.line__inner', line), { type, tag: 'span', aria: 'none' });
}

/** O título dividido em letras continua legível como uma frase só. */
export function labelFromText(el) {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
}
