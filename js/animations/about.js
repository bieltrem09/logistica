/**
 * 01 SOBRE — duas etapas com linguagens diferentes.
 *
 * Seção 2 (manifesto): entra enquanto as portas do contêiner abrem. A "câmera" entra
 * na carga (escala 1.08 → 1) e as palavras sobem de dentro de cada linha, ligadas à
 * rolagem, cada linha num ritmo. O "NÃO." bate como carimbo quando a frase termina.
 *
 * Seção 3 (corpo): leitura lateral, como uma ficha sendo preenchida. Texto entra pela
 * esquerda dentro da máscara, linhas da ficha se desenham, números contam, a foto abre
 * de baixo para cima (1.08 → 1) e a legenda chega por último.
 */
import { q, qa } from './utils.js';
import { maskLines, splitInner } from './text.js';
import { countUp } from './statistics.js';

const { gsap, SplitText } = window;

export function initSection2Animation() {
  const about = q('.about');
  const wrap = q('.wrap', about);
  const head = q('.section-head', about);
  const rule = q('.section-head__rule', head);
  const headParts = [...head.children].filter((el) => el !== rule);
  const title = q('.about__title');
  const mark = q('mark', title);
  const lines = maskLines(title);
  const split = lines.map((line) => splitInner(line, 'words').words);
  const lineWords = split.map((words) => words.filter((w) => !mark.contains(w)));
  const markWords = split.flat().filter((w) => mark.contains(w));

  // Rolagem = controle: a entrada acompanha as portas abrindo (fim do hero) e volta junto
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: about, start: 'top bottom', end: 'top 18%', scrub: 0.6 },
  });
  tl.fromTo(wrap, { scale: 1.08, transformOrigin: '50% 0%' }, { scale: 1, duration: 1 }, 0)
    .from(rule, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.45, ease: 'power2.inOut' }, 0.05)
    .from(headParts, { yPercent: 140, opacity: 0, duration: 0.25, stagger: 0.04, ease: 'power2.out' }, 0.15);

  // Cada linha numa velocidade: as palavras sobem com stagger e a linha desliza um pouco
  lineWords.forEach((words, i) => {
    if (!words.length) return;
    const at = 0.22 + i * 0.12;
    tl.from(words, { yPercent: 185, rotation: 4, transformOrigin: '0% 100%', duration: 0.42, ease: 'power3.out', stagger: 0.06 }, at)
      .from(q('.line__inner', lines[i]), { xPercent: i % 2 ? 4 : -4, duration: 0.6, ease: 'power2.out' }, at);
  });

  // "NÃO." — carimbo: a fita corre, a palavra cai e o título treme com o impacto
  gsap
    .timeline({ scrollTrigger: { trigger: title, start: 'bottom 78%', once: true } })
    .from(mark, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.6, ease: 'expo.inOut' })
    .from(markWords, { yPercent: 185, duration: 0.6, ease: 'power4.out' }, '-=0.25')
    .to(title, { keyframes: { x: [0, -6, 5, -3, 0] }, duration: 0.3, ease: 'none' }, '-=0.2');
}

export function initSection3Animation() {
  const text = q('.about__text');
  const lead = q('.lead', text);
  const para = q('p:not(.lead)', text);
  const rows = qa('.spec__row', text);
  const media = q('.about__media');
  const img = q('img', media);

  SplitText.create(lead, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    aria: 'none',
    onSplit: (self) =>
      gsap.from(self.lines, {
        xPercent: -104,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.09,
        scrollTrigger: { trigger: lead, start: 'top 86%', once: true },
      }),
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
