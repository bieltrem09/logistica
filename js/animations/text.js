/**
 * Ajudantes de texto: máscara por linha e divisão com SplitText.
 * O texto original continua disponível para leitores de tela (aria-label / sr-only).
 */
import { q, qa } from './utils.js';

export function maskLines(el) {
  const lines = qa('.line', el);
  lines.forEach((line) => line.classList.add('is-masked'));
  return lines;
}

export function splitInner(line, type) {
  return window.SplitText.create(q('.line__inner', line), { type, tag: 'span', aria: 'none' });
}

export function labelFromText(el) {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
}

/** Palavras sobem de dentro da máscara de cada linha. */
export function riseWords(title, { start = 'top 82%', stagger = 0.07 } = {}) {
  const words = maskLines(title).flatMap((line) => splitInner(line, 'words').words);
  window.gsap.from(words, {
    yPercent: 185,
    rotation: 5,
    transformOrigin: '0% 100%',
    duration: 1.15,
    ease: 'expo.out',
    stagger,
    scrollTrigger: { trigger: title, start, once: true },
  });
  return words;
}
