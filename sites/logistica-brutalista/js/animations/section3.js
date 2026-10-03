/**
 * SEÇÃO 3 — corpo do "Sobre": texto, ficha técnica e foto do pátio.
 *
 * Linguagem diferente da seção 2: aqui tudo entra de lado, como um documento
 * sendo impresso. As linhas do texto correm da esquerda dentro da máscara, a ficha
 * técnica é traçada linha a linha e os números da operação contam depois.
 * A foto abre de baixo para cima e assenta (escala 1.08 → 1) com parallax leve.
 */
import { q, qa, fmt } from './utils.js';

const { gsap, SplitText } = window;

/** "340 veículos" → conta 0 → 340 mantendo o sufixo. Anos e textos ficam como estão. */
function countUp(dd, delay) {
  const m = dd.textContent.trim().match(/^(\d{1,3}(?:\.\d{3})*)(\s.*)$/);
  if (!m) return null;
  const target = Number(m[1].replace(/\./g, ''));
  const suffix = m[2];
  dd.setAttribute('aria-label', dd.textContent.trim());
  const o = { v: 0 };
  const render = () => {
    dd.textContent = `${fmt(o.v)}${suffix}`;
  };
  return gsap.to(o, { v: target, duration: 1.6, delay, ease: 'power3.out', onStart: render, onUpdate: render });
}

export function initSection3Animation() {
  const text = q('.about__text');
  const lead = q('.lead', text);
  const para = q('p:not(.lead)', text);
  const rows = qa('.spec__row', text);
  const pill = q('.pill', text);

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
        scrollTrigger: { trigger: lead, start: 'top 88%', once: true },
      }),
  });

  gsap.from(para, {
    x: -40,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: { trigger: para, start: 'top 90%', once: true },
  });

  // Ficha técnica: cada linha é traçada da esquerda; os números contam com atraso
  const spec = gsap.timeline({ scrollTrigger: { trigger: '.spec', start: 'top 86%', once: true } });
  rows.forEach((row, i) => {
    spec
      .fromTo(row, { clipPath: 'inset(0% 100% -2px 0%)' }, { clipPath: 'inset(0% 0% -2px 0%)', duration: 0.7, ease: 'power3.inOut' }, i * 0.09)
      .from(row.children, { x: 18, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06 }, i * 0.09 + 0.25);
    const count = countUp(q('dd', row), 0);
    if (count) spec.add(count, i * 0.09 + 0.4);
  });
  spec.from(pill, { x: -24, opacity: 0, duration: 0.6, ease: 'power3.out' }, rows.length * 0.09 + 0.4);

  // Foto: abre de baixo, assenta e segue com parallax leve
  const media = q('.about__media');
  const img = q('img', media);
  gsap.set(img, { scale: 1.12 });
  gsap
    .timeline({ scrollTrigger: { trigger: media, start: 'top 84%', once: true } })
    .fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
    .from(img, { scale: 1.21, duration: 1.8, ease: 'expo.out' }, 0.15)
    .from(qa('.about__caption span'), { x: -12, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.1 }, 1);
  gsap.fromTo(img, { yPercent: -5 }, {
    yPercent: 5,
    ease: 'none',
    scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true },
  });
}
