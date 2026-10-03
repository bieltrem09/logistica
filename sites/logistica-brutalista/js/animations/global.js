/**
 * Camada comum: cabeçalhos de seção, blocos que sobem, seções escuras que
 * "encaixam" ao entrar, cursor/magnético e âncoras com rolagem suave.
 */
import { q, qa } from './utils.js';

const { gsap, ScrollTrigger } = window;

export function initSectionHeads() {
  qa('.section-head').forEach((head) => {
    const rule = q('.section-head__rule', head);
    const parts = [...head.children].filter((el) => el !== rule);
    gsap
      .timeline({ scrollTrigger: { trigger: head, start: 'top 90%', once: true } })
      .from(rule, { scaleX: 0, transformOrigin: '0% 50%', duration: 1.1, ease: 'expo.inOut' })
      .from(parts, { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, 0.15);
  });
}

export function initFadeUps() {
  const els = [
    ...qa('[data-anim="fade-up"]').filter((el) => !el.closest('.hero, .about__text')),
    ...qa('.services__hint, .tracking__portal, .site-footer__nav, .site-footer__contact'),
  ];
  gsap.set(els, { y: 36, opacity: 0 });
  ScrollTrigger.batch(els, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08 }),
  });
}

export function initSectionEntrances() {
  qa('#modais, #numeros, #clientes, #rastreamento, #contato, .site-footer').forEach((sec) => {
    gsap.fromTo(
      sec,
      { clipPath: 'inset(9% 5% 0% 5%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 22%', scrub: true },
      },
    );
  });
}

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
}

export function initAnchors({ smoother }) {
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
