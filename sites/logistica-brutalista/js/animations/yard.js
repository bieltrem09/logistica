/**
 * 03b PÁTIO — carrossel horizontal fixo, controlado pela rolagem vertical.
 *
 * A tela fica parada e os contêineres passam pelo guindaste, um por vez.
 * Profundidade: o que sai recua (0.94, mais apagado, desce um pouco); o que chega vem
 * de um pouco mais perto da câmera (1.04 → 1). O conteúdo de cada contêiner atrasa em
 * relação à chapa (parallax interno). Pendurados no cabo, todos balançam com a
 * velocidade da rolagem e assentam como pêndulo quando ela para.
 */
import { q, qa, clamp, createSpring } from './utils.js';

const { gsap, ScrollTrigger } = window;

export function initContainerCarousel({ smoother }) {
  const pinEl = q('.yard-pin');
  const yard = q('.yard', pinEl);
  const cards = qa('.cargo', yard);
  const n = cards.length;
  const idx = q('.yard-hud__idx', pinEl);
  const rail = q('.yard-hud__rail', pinEl);
  const trolley = q('.yard-hud__trolley', pinEl);
  const inner = cards.map((card) => [q('.cargo__top', card), q('.cargo__name', card), q('.cargo__desc', card)]);
  const stepW = () => cards[1].offsetLeft - cards[0].offsetLeft;
  const tilt = new Array(n).fill(0);
  let swing = 0;

  gsap.set(cards, { transformOrigin: '50% -30%' });

  const applyRotation = () => {
    cards.forEach((card, i) => gsap.set(card, { rotation: tilt[i] + swing }));
  };

  const focus = (p) => {
    const f = p * (n - 1);
    cards.forEach((card, i) => {
      const d = f - i; // > 0: já passou (esquerda) · < 0: chegando (direita)
      const ad = Math.min(Math.abs(d), 1);
      const leaving = d > 0;
      gsap.set(card, {
        scale: leaving ? 1 - 0.06 * ad : 1 + 0.04 * ad,
        y: leaving ? ad * 30 : ad * 12,
        opacity: 1 - (leaving ? 0.5 : 0.62) * ad,
        '--focus': clamp(1 - Math.abs(d) * 1.8, 0, 1),
      });
      tilt[i] = clamp(-d * 1.6, -2.4, 2.4);
      // Parallax interno: número, nome e texto atrasam em relação à chapa, cada um num ritmo
      inner[i].forEach((el, k) => el && gsap.set(el, { x: clamp(d, -1.5, 1.5) * (28 + k * 22) }));
    });
    applyRotation();
    idx.textContent = String(Math.round(f) + 1).padStart(2, '0');
    gsap.set(trolley, { x: (rail.offsetWidth - trolley.offsetWidth) * p });
  };

  // Pêndulo: a rolagem rápida empurra os contêineres; parado, eles assentam
  const pendulum = createSpring({
    stiffness: 38,
    damping: 4.2,
    onUpdate: (angle) => {
      swing = angle;
      applyRotation();
    },
  });
  const settle = gsap.delayedCall(0.12, () => pendulum.set(0)).pause();

  const st = ScrollTrigger.create({
    trigger: pinEl,
    start: 'top top',
    end: () => `+=${stepW() * (n - 1) * 1.15}`,
    pin: true,
    scrub: true,
    animation: gsap.to(yard, { x: () => -stepW() * (n - 1), ease: 'none' }),
    invalidateOnRefresh: true,
    snap: { snapTo: 1 / (n - 1), inertia: false, duration: { min: 0.3, max: 0.7 }, delay: 0.12, ease: 'power3.inOut' },
    onUpdate: (self) => {
      focus(self.progress);
      pendulum.set(clamp(-self.getVelocity() / 420, -5, 5));
      settle.restart(true);
    },
    onRefresh: (self) => focus(self.progress),
  });
  focus(0);
  pinEl.dataset.cursor = 'Role →';

  gsap.from(q('.yard-hud', pinEl).children, {
    y: 14,
    opacity: 0,
    duration: 0.6,
    stagger: 0.08,
    scrollTrigger: { trigger: pinEl, start: 'top 70%', once: true },
  });

  // Teclado: ao focar um contêiner, rola até ele
  cards.forEach((card, i) =>
    card.addEventListener('focusin', () => smoother.scrollTo(st.start + (st.end - st.start) * (i / (n - 1)), true)),
  );
}
