/**
 * Seções 05–08, rodapé e comportamentos gerais (cabeçalhos de seção, fade-ups, encaixe).
 */
import { q, qa, clamp } from './utils.js';
import { maskLines, splitInner, labelFromText, riseWords } from './text.js';
import { countUp } from './statistics.js';

const { gsap, ScrollTrigger } = window;

/* 05 PROCESSO — a carga percorre a rota; cada etapa acende e o odômetro de KM conta até ela */
export function initProcess() {
  riseWords(q('.process__title'));
  const steps = q('.route__steps');
  const items = qa('.step', steps);
  const nodes = items.map((s) => q('.step__node', s));
  const kms = items.map((s) => {
    const el = q('.step__km', s);
    const km = Number(el.textContent.replace(/\D/g, ''));
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = `<span aria-hidden="true">KM </span><span aria-hidden="true"></span>`;
    const tween = countUp(el.lastChild, { to: km, pad: 4, group: false, duration: 0.9, ease: 'power2.out', paused: true });
    tween.progress(1);
    return tween;
  });
  const horizontal = window.matchMedia('(min-width: 900px)');
  let marks = [];
  const measure = () => {
    marks = items.map((s) => (horizontal.matches ? s.offsetLeft / steps.offsetWidth : s.offsetTop / steps.offsetHeight));
  };

  gsap.set(items, { opacity: 0.25 });
  gsap.set(nodes, { scale: 0.2, rotation: 45 });
  const reach = (p) => {
    items.forEach((item, i) => {
      const on = p >= marks[i] - 0.01 && p > 0;
      if (on === item.$on) return;
      item.$on = on;
      gsap.to(item, { opacity: on ? 1 : 0.25, duration: 0.4, overwrite: 'auto' });
      gsap.to(nodes[i], {
        scale: on ? 1 : 0.2,
        rotation: on ? 0 : 45,
        duration: 0.55,
        ease: on ? 'back.out(3)' : 'power2.out',
        overwrite: 'auto',
      });
      if (on) kms[i].restart();
    });
  };
  measure();
  gsap.to(steps, {
    '--route': 1,
    ease: 'none',
    scrollTrigger: {
      trigger: steps,
      start: 'top 72%',
      end: 'bottom 52%',
      scrub: true,
      onRefresh: measure,
      onUpdate: (self) => reach(self.progress),
    },
  });
  gsap.from(qa('.route__meta span'), {
    y: 12,
    opacity: 0,
    duration: 0.5,
    stagger: 0.08,
    scrollTrigger: { trigger: '.route__meta', start: 'top 88%', once: true },
  });
}

/* 06 CLIENTES — letreiro que reage à velocidade + depoimentos encaixando */
export function initClients() {
  riseWords(q('.clients__title'));
  const marquee = q('.marquee');
  const tracks = qa('.marquee__track', marquee);
  const loop = gsap.to(tracks, { xPercent: -100, duration: 26, ease: 'none', repeat: -1 });
  loop.totalTime(loop.duration() * 40); // permite tocar ao contrário sem parar no início
  const skew = gsap.quickTo(tracks, 'skewX', { duration: 0.4, ease: 'power3.out' });

  // Fora da tela o letreiro para (não gasta quadro à toa)
  ScrollTrigger.create({
    trigger: marquee,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? loop.resume() : loop.pause()),
    onUpdate: (self) => {
      if (loop.paused()) loop.resume();
      const v = self.getVelocity();
      const dir = self.direction;
      const boost = Math.min(Math.abs(v) / 280, 6);
      gsap.to(loop, {
        timeScale: dir * (1 + boost),
        duration: 0.25,
        overwrite: true,
        onComplete: () => gsap.to(loop, { timeScale: dir, duration: 1.4, ease: 'power2.out' }),
      });
      skew(clamp(-v / 220, -12, 12));
      gsap.delayedCall(0.18, () => skew(0));
    },
  });

  gsap.from(qa('.quote'), {
    y: 140,
    rotation: (i) => [-5, 4, -3][i % 3],
    opacity: 0,
    duration: 1.2,
    ease: 'back.out(1.3)',
    stagger: 0.16,
    scrollTrigger: { trigger: '.quotes', start: 'top 84%', once: true },
  });
}

/* 07 RASTREAMENTO — digitação + ticket impresso */
export function initTracking() {
  riseWords(q('.tracking__title'));
  const input = q('#track-code');
  const placeholder = input.getAttribute('placeholder') || '';
  input.setAttribute('placeholder', '');
  ScrollTrigger.create({
    trigger: '.track-form',
    start: 'top 82%',
    once: true,
    onEnter: () => {
      let i = 0;
      const type = () => {
        i += 1;
        input.setAttribute('placeholder', placeholder.slice(0, i));
        if (i < placeholder.length) setTimeout(type, 45 + Math.random() * 70);
      };
      type();
    },
  });

  const ticket = q('.ticket');
  gsap
    .timeline({ scrollTrigger: { trigger: ticket, start: 'top 84%', once: true } })
    .fromTo(ticket, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'steps(16)' })
    .from(qa('.ticket__data > div', ticket), { opacity: 0, x: 14, duration: 0.4, stagger: 0.07 }, 0.3)
    .from(qa('.ticket__progress li', ticket), { opacity: 0, y: 8, duration: 0.35, stagger: 0.12 }, 1.1)
    .add(() => q('.ticket__status', ticket).classList.add('is-live'), 1.6);
}

/* 08 CONTATO */
export function initContact() {
  const title = q('.contact__title');
  labelFromText(title);
  const [l1, l2] = maskLines(title);
  const s1 = splitInner(l1, 'chars');
  const s2 = splitInner(l2, 'chars');
  gsap
    .timeline({
      scrollTrigger: { trigger: title, start: 'top 80%', once: true },
      onComplete: () => {
        s1.revert();
        s2.revert();
      },
    })
    .from(s1.chars, { yPercent: -200, duration: 1.1, ease: 'bounce.out', stagger: 0.05 })
    .from(s2.chars, { yPercent: 185, duration: 1, ease: 'expo.out', stagger: 0.035 }, '-=0.7')
    .from('.contact__wa', { scale: 0.6, rotation: -8, opacity: 0, duration: 1, ease: 'back.out(1.7)' }, '-=0.6')
    .from('.contact__note', { y: 20, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.6');

  gsap.from(qa('.contact__data > div'), {
    y: 24,
    opacity: 0,
    duration: 0.7,
    ease: 'power3.out',
    stagger: 0.07,
    scrollTrigger: { trigger: '.contact__data', start: 'top 90%', once: true },
  });
}

/* RODAPÉ — a marca sobe da base */
export function initFooter() {
  const brand = q('.site-footer__brand');
  const split = window.SplitText.create(brand, { type: 'chars', tag: 'span', aria: 'none' });
  gsap.from(split.chars, {
    yPercent: 100,
    ease: 'none',
    stagger: 0.08,
    scrollTrigger: { trigger: '.site-footer', start: 'top 75%', end: 'bottom bottom', scrub: true },
  });
  gsap.from('.site-footer__claim', {
    y: 30,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.site-footer', start: 'top 80%', once: true },
  });
}

/* GERAIS */
export function initSectionHeads({ skip = [] } = {}) {
  qa('.section-head')
    .filter((head) => !skip.some((sel) => head.closest(sel)))
    .forEach((head) => {
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
    ...qa('[data-anim="fade-up"]').filter((el) => !el.closest('.hero') && !el.closest('.about__text')),
    ...qa('.services__hint, .tracking__portal, .site-footer__nav, .site-footer__contact'),
  ];
  gsap.set(els, { y: 36, opacity: 0 });
  ScrollTrigger.batch(els, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08 }),
  });
}

/** Blocos escuros e coloridos "encaixam" na tela ao entrar. */
export function initEncaixe() {
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
