/**
 * Microinterações de ponteiro (só mouse/trackpad, nunca no toque):
 * cursor quadrado com rótulo, botões magnéticos e foto do "Sobre" respondendo ao ponteiro.
 * (A profundidade do hero com o mouse fica em animations/hero.js.)
 */
import { q, qa } from './utils.js';

const { gsap } = window;

export function initPointer() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const root = document.documentElement;
  const cursor = q('#cursor');
  const label = q('.cursor__label', cursor);
  root.classList.add('has-cursor');
  gsap.set(cursor, { opacity: 0 });
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
  let shown = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!shown) {
        shown = true;
        gsap.set(cursor, { x: e.clientX, y: e.clientY });
        gsap.to(cursor, { opacity: 1, duration: 0.3 });
      }
      xTo(e.clientX);
      yTo(e.clientY);
    },
    { passive: true },
  );
  q('.modais__pin').dataset.cursor = 'Role ↓';
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, [data-cursor]');
    const text = t ? t.dataset.cursor || (t.href && t.href.includes('wa.me') ? 'WhatsApp ↗' : '') : '';
    cursor.classList.toggle('is-active', !!t && (t.tagName === 'A' || t.tagName === 'BUTTON'));
    cursor.classList.toggle('has-label', !!text);
    label.textContent = text;
  });

  qa('[data-anim="magnetic"]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - (r.left + r.width / 2)) * 0.3);
      my((e.clientY - (r.top + r.height / 2)) * 0.3);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)', overwrite: true });
    });
  });

  // Foto do "Sobre": a imagem desliza um pouco dentro da moldura, como uma janela
  const media = q('.about__media');
  const shift = q('img', media);
  if (media && shift) {
    const ix = gsap.quickTo(shift, 'x', { duration: 0.9, ease: 'power3.out' });
    media.addEventListener('pointermove', (e) => {
      const r = media.getBoundingClientRect();
      ix(((e.clientX - r.left) / r.width - 0.5) * -14);
    });
    media.addEventListener('pointerleave', () => ix(0));
  }
}

/* Âncoras com rolagem suave */
export function bindAnchors({ smoother }) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    smoother.scrollTo(id === '#inicio' || id === '#main' ? 0 : target, true, 'top top');
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}
