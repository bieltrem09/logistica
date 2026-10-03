/**
 * SEÇÃO 2 — manifesto "Sua carga não espera. A gente também não." em parallax.
 *
 * Cada linha é uma camada com a sua velocidade. Chegando, as linhas vêm afastadas
 * (as de baixo mais atrasadas, como se estivessem mais longe) e cada uma desliza do
 * seu lado; com o título no meio da tela, elas se encaixam na frase. Saindo, as de
 * cima sobem mais rápido. Assim as camadas nunca se cruzam e a frase fica legível.
 * A fita laranja corre por trás do "NÃO." no momento em que a frase se forma.
 *
 * Tudo comandado pela rolagem (scrub). As distâncias são medidas em "corpos" da
 * letra do título, então no celular o movimento encolhe na mesma proporção do texto.
 */
import { q, qa } from './utils.js';

const { gsap } = window;

const SETTLE = 0.42; // ponto da passagem pela tela em que a frase fica montada
const ENTER = [0.15, 0.42, 0.72, 1.05]; // atraso de cada linha ao chegar (em corpos de letra)
const LEAVE = [1.05, 0.72, 0.42, 0.15]; // avanço de cada linha ao sair
const DRIFT = [0.05, 0.04, 0.03, 0.022]; // deslize lateral (fração da largura da tela)

export function initSection2Animation() {
  const title = q('.about__title');
  const mark = q('mark', title);
  const lines = qa('.line', title);
  const em = () => parseFloat(getComputedStyle(title).fontSize);
  // linhas alinhadas à direita entram pela direita; as outras, pela esquerda
  const side = lines.map((line) => (line.classList.contains('line--end') ? 1 : -1));

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: title, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });

  lines.forEach((line, i) => {
    const drift = () => DRIFT[i % DRIFT.length] * window.innerWidth;
    tl.fromTo(
      line,
      { y: () => ENTER[i % ENTER.length] * em(), x: () => side[i] * drift() },
      { y: 0, x: 0, duration: SETTLE },
      0,
    ).to(line, { y: () => -LEAVE[i % LEAVE.length] * em(), x: () => -side[i] * drift(), duration: 1 - SETTLE }, SETTLE);
  });

  // A fita do "NÃO." corre da esquerda para a direita (fundo e palavra juntos) enquanto a frase monta
  if (mark) {
    tl.fromTo(
      mark,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.12, ease: 'power2.inOut' },
      SETTLE - 0.14,
    );
  }
}
