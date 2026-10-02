/**
 * 01 SOBRE — duas etapas com linguagens diferentes.
 *
 * Manifesto ("Sua carga não espera. A gente também não."): entra enquanto as portas do
 * contêiner do hero abrem, ligado à rolagem (rolar para cima desfaz):
 *   - a "câmera" entra na carga: o bloco assenta de 1.08 para 1;
 *   - régua e rótulos do cabeçalho de seção chegam primeiro;
 *   - cada linha entra no seu tempo; as palavras sobem de dentro da máscara da linha;
 *   - o espaçamento entre letras fecha enquanto as palavras sobem (tracking diminuindo,
 *     feito com translateX por letra: nenhum recálculo de layout);
 *   - "NÃO." bate como carimbo quando a frase termina (uma vez, com tremida).
 * Saindo da tela, as linhas sobem em velocidades diferentes (a última mais rápida).
 *
 * Corpo: leitura lateral, como uma ficha sendo preenchida. Texto entra pela esquerda
 * dentro da máscara, linhas da ficha se desenham, números contam, a foto abre de baixo
 * para cima e assenta; a legenda chega por último com o indicador "ao vivo".
 */
import { q, qa } from './utils.js';
import { maskLines, labelFromText } from './text.js';
import { countUp } from './statistics.js';

const { gsap, ScrollTrigger, SplitText } = window;

/**
 * Tracking inicial que fecha até o normal durante a entrada, em % da largura de cada letra
 * (letras do Anton têm ~0,45 em: 6,5% ≈ 0,03 em). Em %, o valor acompanha o tamanho do
 * título no resize sem precisar recalcular nada.
 */
const TRACK = 6.5;

export function initSection2Animation() {
  const about = q('.about');
  const wrap = q('.wrap', about);
  const head = q('.section-head', about);
  const rule = q('.section-head__rule', head);
  const headParts = [...head.children].filter((el) => el !== rule);
  const title = q('.about__title');
  const mark = q('mark', title);

  // Acessibilidade: o h2 recebe o texto inteiro; as linhas divididas ficam fora da árvore
  labelFromText(title);
  const lines = maskLines(title);
  lines.forEach((line) => line.setAttribute('aria-hidden', 'true'));
  const split = lines.map((line) => SplitText.create(q('.line__inner', line), { type: 'words,chars', tag: 'span', aria: 'none' }));
  const lineWords = split.map((sp) => sp.words.filter((w) => !mark.contains(w)));
  const lineChars = split.map((sp) => sp.chars.filter((c) => !mark.contains(c)));
  const markWords = split.flatMap((sp) => sp.words).filter((w) => mark.contains(w));
  const em = () => parseFloat(getComputedStyle(title).fontSize);

  // Rolagem = controle: a entrada acompanha as portas abrindo (fim do hero) e volta junto
  // (sem invalidateOnRefresh: ele faz o GSAP perder o estado inicial dos alvos escalonados,
  // e as palavras 2, 3… de cada linha apareceriam antes da hora)
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: about, start: 'top bottom', end: 'top 18%', scrub: 0.6 },
  });
  tl.fromTo(wrap, { scale: 1.08, transformOrigin: '50% 0%' }, { scale: 1, duration: 1 }, 0)
    .from(rule, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.45, ease: 'power2.inOut' }, 0.05)
    .from(headParts, { yPercent: 140, opacity: 0, duration: 0.25, stagger: 0.04, ease: 'power2.out' }, 0.15);

  lines.forEach((line, i) => {
    const words = lineWords[i];
    const chars = lineChars[i];
    if (!words.length) return;
    const at = 0.22 + i * 0.12;
    // Linhas alinhadas à direita abrem o espaçamento para a esquerda (a última letra fica parada)
    const anchor = line.classList.contains('line--end') ? chars.length - 1 : 0;
    tl.from(words, { yPercent: 185, rotation: 4, transformOrigin: '0% 100%', duration: 0.42, ease: 'power3.out', stagger: 0.06 }, at)
      .from(chars, { xPercent: (k) => (k - anchor) * TRACK, duration: 0.6, ease: 'power2.out' }, at)
      .from(q('.line__inner', line), { xPercent: i % 2 ? 3 : -3, duration: 0.6, ease: 'power2.out' }, at);
  });

  // "NÃO." — carimbo: a fita corre, a palavra cai e o título treme com o impacto
  gsap
    .timeline({ scrollTrigger: { trigger: title, start: 'bottom 78%', once: true } })
    .from(mark, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.6, ease: 'expo.inOut' })
    .from(markWords, { yPercent: 185, duration: 0.6, ease: 'power4.out' }, '-=0.25')
    .to(title, { keyframes: { x: [0, -6, 5, -3, 0] }, duration: 0.3, ease: 'none' }, '-=0.2');

  // Saída: as linhas sobem em velocidades diferentes; a última ("NÃO.") é a mais rápida
  gsap.to(lines, {
    y: (i) => -i * 0.09 * em(),
    ease: 'none',
    scrollTrigger: { trigger: title, start: 'top 30%', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
}

export function initSection3Animation() {
  const text = q('.about__text');
  const lead = q('.lead', text);
  const para = q('p:not(.lead)', text);
  const rows = qa('.spec__row', text);
  const media = q('.about__media');
  const img = q('img', media);

  // Abertura: divide em linhas só quando entra na tela (mede a largura real daquele momento),
  // cada linha desliza da esquerda dentro da sua máscara e o HTML volta ao original no fim.
  // Assim um resize depois não repete a animação nem deixa linhas quebradas erradas.
  gsap.set(lead, { autoAlpha: 0 });
  ScrollTrigger.create({
    trigger: lead,
    start: 'top 86%',
    once: true,
    onEnter: () => {
      const sp = SplitText.create(lead, { type: 'lines', mask: 'lines', aria: 'none' });
      gsap.set(lead, { autoAlpha: 1 });
      gsap.from(sp.lines, { xPercent: -104, duration: 1.1, ease: 'expo.out', stagger: 0.09, onComplete: () => sp.revert() });
    },
  });

  gsap.from(para, { x: -40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: para, start: 'top 88%', once: true } });

  // Ficha técnica: cada linha se desenha da esquerda para a direita; números contam depois
  const spec = gsap.timeline({ scrollTrigger: { trigger: '.spec', start: 'top 86%', once: true } });
  spec.from(rows, { clipPath: 'inset(0% 100% 0% 0%)', duration: 0.8, ease: 'power3.inOut', stagger: 0.08 });
  rows.forEach((row, i) => {
    const dd = q('dd', row);
    const m = dd.textContent.trim().match(/^(\d{1,3}(?:\.\d{3})+|\d{2,3})(\s.+)$/);
    if (!m) return;
    dd.setAttribute('aria-label', dd.textContent.trim());
    dd.innerHTML = `<span aria-hidden="true"></span><span aria-hidden="true">${m[2]}</span>`;
    spec.add(countUp(dd.firstChild, { to: Number(m[1].replace(/\./g, '')), duration: 1.6, ease: 'expo.out' }), 0.45 + i * 0.08);
  });
  spec.from(qa('.about__text .pill'), { x: -20, opacity: 0, duration: 0.6, ease: 'power3.out' }, 0.9);

  // Foto: abre de baixo para cima e assenta (1.08 → 1); legenda chega por último
  gsap
    .timeline({ scrollTrigger: { trigger: media, start: 'top 84%', once: true } })
    .fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
    .fromTo(img, { scale: 1.3 }, { scale: 1.08, duration: 1.8, ease: 'expo.out' }, 0.1)
    .from(qa('.about__caption span'), { y: 12, opacity: 0, duration: 0.5, stagger: 0.12 }, 1.1)
    .add(() => q('.about__caption span:last-child').classList.add('is-live'), 1.5);
  // Parallax da foto dentro da moldura enquanto passa pela tela (a escala 1.08 cobre o deslocamento)
  gsap.fromTo(img, { yPercent: -3.5 }, {
    yPercent: 3.5,
    ease: 'none',
    scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true },
  });
}
