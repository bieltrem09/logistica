/**
 * SEÇÃO 2 — manifesto "Sua carga não espera. A gente também não."
 *
 * Entra junto com a abertura das portas do hero e é comandado pela rolagem:
 * cada palavra sobe de dentro da máscara da sua linha, uma por vez, e as linhas
 * chegam de lados alternados em velocidades diferentes (como volumes numa esteira).
 * No fim, a fita laranja corre por baixo do "NÃO." e ele assenta.
 * Depois de lido, o texto continua deslizando devagar enquanto a seção sai.
 */
import { q, maskLines, splitInner } from './utils.js';

const { gsap } = window;

export function initSection2Animation() {
  const title = q('.about__title');
  const mark = q('mark', title);
  const lines = maskLines(title);
  const words = lines.map((line) => splitInner(line, 'words').words);
  const punch = lines[lines.length - 1];
  const markWords = words[words.length - 1];

  // Leitura: palavra a palavra, comandada pela rolagem
  const read = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: { trigger: title, start: 'top 96%', end: 'bottom 62%', scrub: 0.6 },
  });
  lines.slice(0, -1).forEach((line, i) => {
    const at = i * 0.55;
    read
      .from(q('.line__inner', line), { xPercent: i % 2 ? 7 : -7, duration: 1.6, ease: 'power2.out' }, at)
      .from(words[i], { yPercent: 125, rotation: 4, transformOrigin: '0% 100%', duration: 0.9, stagger: 0.22 }, at);
  });
  const end = (lines.length - 1) * 0.55 + 0.3;
  read
    .from(mark, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.8, ease: 'power2.inOut' }, end)
    .from(markWords, { yPercent: 125, duration: 0.7 }, end + 0.45)
    .from(q('.line__inner', punch), { scale: 1.08, transformOrigin: '100% 100%', duration: 0.9 }, end + 0.45);

  // Saída: as linhas seguem andando em velocidades diferentes
  gsap.to(lines, {
    x: (i) => [-0.03, 0.025, -0.02, 0.015][i % 4] * window.innerWidth,
    ease: 'none',
    scrollTrigger: { trigger: title, start: 'bottom 50%', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
}
