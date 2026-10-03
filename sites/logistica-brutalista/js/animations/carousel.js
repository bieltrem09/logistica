/**
 * SEÇÃO 6 — pátio de serviços: carrossel horizontal comandado pela rolagem vertical.
 *
 * A seção fica fixa e os contêineres passam da direita para a esquerda, cada um
 * pendurado no cabo enquanto está em foco. A troca é sutil e industrial:
 *   saindo   → escala 1 → 0.96, escurece, inclina no máximo 1,5°
 *   entrando → escala 1.04 → 1, opacidade sobe, desce alguns px até o lugar
 * O texto de cada contêiner anda um pouco atrás da caixa (profundidade) e o
 * contador do HUD rola para o novo número. Encaixa em cada contêiner (snap).
 */
import { q, qa, clamp } from './utils.js';

const { gsap, ScrollTrigger } = window;

export function initContainerCarousel({ smoother }) {
  const pinEl = q('.yard-pin');
  const yard = q('.yard', pinEl);
  const cards = qa('.cargo', yard);
  const names = cards.map((card) => q('.cargo__name', card));
  const n = cards.length;
  const idx = q('.yard-hud__idx', pinEl);
  const rail = q('.yard-hud__rail', pinEl);
  const trolley = q('.yard-hud__trolley', pinEl);
  const stepW = () => cards[1].offsetLeft - cards[0].offsetLeft;
  let current = 0;

  gsap.set(cards, { transformOrigin: '50% -20%' });
  const focus = (p) => {
    const f = p * (n - 1);
    cards.forEach((card, i) => {
      const d = f - i; // > 0: já passou (saindo); < 0: ainda vai chegar (entrando)
      const ad = Math.min(Math.abs(d), 1);
      const leaving = d > 0;
      gsap.set(card, {
        scale: leaving ? 1 - 0.04 * ad : 1 + 0.04 * ad,
        rotation: leaving ? -1.5 * ad : 1.8 * ad,
        y: leaving ? 0 : -14 * ad,
        opacity: leaving ? 1 - 0.5 * ad : 1 - 0.65 * ad,
        '--focus': clamp(1 - Math.abs(d) * 1.8, 0, 1),
      });
      gsap.set(names[i], { x: clamp(-d, -1, 1) * 36 });
    });
    const next = Math.round(f);
    if (next !== current) {
      const dir = next > current ? 1 : -1;
      current = next;
      idx.textContent = String(next + 1).padStart(2, '0');
      gsap.fromTo(idx, { yPercent: 70 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'power3.out', overwrite: true });
    }
    gsap.set(trolley, { x: (rail.offsetWidth - trolley.offsetWidth) * p });
  };

  const st = ScrollTrigger.create({
    trigger: pinEl,
    start: 'top top',
    end: () => `+=${stepW() * (n - 1) * 1.15}`,
    pin: true,
    scrub: true,
    animation: gsap.to(yard, { x: () => -stepW() * (n - 1), ease: 'none' }),
    invalidateOnRefresh: true,
    snap: { snapTo: 1 / (n - 1), inertia: false, duration: { min: 0.25, max: 0.6 }, delay: 0.1, ease: 'power2.inOut' },
    onUpdate: (self) => focus(self.progress),
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
