/**
 * SEÇÃO 5 — o azul central.
 *
 * Continua o ● azul do destino da seção 4: o bloco azul nasce como um ponto no meio
 * da palavra, vira círculo, se estica em cápsula, ganha os cantos de contêiner e
 * "corta" SERVIÇOS (as letras aparecem em contorno por dentro). Depois desliza pela
 * palavra enquanto a seção passa. Tudo com clip-path (sem mexer em top/left/width):
 * o mesmo recorte é aplicado ao bloco e à palavra-fantasma, em px, a cada atualização.
 */
import { q, clamp, lerp, maskLines, splitInner, labelFromText } from './utils.js';

const { gsap } = window;

export function initSection5Animation() {
  const ct = q('.cut-title');
  const word = q('.cut-title__word:not(.cut-title__word--ghost)', ct);
  const media = q('.cut-title__media', ct);
  const img = q('img', media);
  const ghost = q('.cut-title__word--ghost', ct);
  labelFromText(word);
  maskLines(word);
  maskLines(ghost);
  const sw = splitInner(q('.line', word), 'chars');
  const sg = splitInner(q('.line', ghost), 'chars');

  // As letras sobem uma vez, quando a palavra entra
  const charIn = { yPercent: 185, duration: 1.1, ease: 'expo.out', stagger: 0.05 };
  gsap
    .timeline({ scrollTrigger: { trigger: ct, start: 'top 86%', once: true } })
    .from(sw.chars, charIn, 0)
    .from(sg.chars, charIn, 0);

  // Geometria do bloco dentro da palavra (medida sem transformações)
  const box = {};
  const measure = () => {
    Object.assign(box, {
      L: media.offsetLeft,
      T: media.offsetTop,
      W: media.offsetWidth,
      H: media.offsetHeight,
      GW: ghost.offsetWidth,
      GH: ghost.offsetHeight,
    });
  };

  // Estado do recorte: diâmetro do ponto, largura da cápsula, cantos e deslize
  const state = { d: 0, w: 0, round: 1, slide: 0 };
  const DOT = 22;
  const apply = () => {
    const { L, T, W, H, GW, GH } = box;
    const h = clamp(lerp(DOT, H, state.d), 0, H); // altura atual do recorte
    const w = clamp(lerp(h, W, state.w), 0, W); // largura atual
    const r = state.round * (Math.min(w, h) / 2);
    const top = (H - h) / 2;
    const side = (W - w) / 2;
    const x = state.slide * -box.slideMax;
    const show = state.d > 0 || state.w > 0;
    media.style.transform = `translate3d(${x}px, 0, 0)`;
    media.style.clipPath = show ? `inset(${top}px ${side}px ${top}px ${side}px round ${r}px)` : 'inset(50%)';
    ghost.style.clipPath = show
      ? `inset(${T + top}px ${GW - (L + x + W - side)}px ${GH - (T + H - top)}px ${L + x + side}px round ${r}px)`
      : 'inset(50%)';
  };

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)' }, (c) => {
    const { desktop } = c.conditions;
    const slideShare = desktop ? 0.28 : 0.2;
    const sync = () => {
      measure();
      box.slideMax = box.GW * slideShare;
      apply();
    };
    sync();

    // ● → círculo → cápsula → contêiner, comandado pela rolagem
    gsap
      .timeline({
        defaults: { ease: 'none' },
        onUpdate: apply,
        scrollTrigger: {
          trigger: ct,
          start: 'top 88%',
          end: desktop ? 'top 30%' : 'top 40%',
          scrub: true,
          onRefresh: sync,
        },
      })
      .fromTo(state, { d: 0 }, { d: 0.0001, duration: 0.04 }, 0)
      .to(state, { d: 1, duration: 0.36, ease: 'power2.inOut' }, 0.04)
      .to(state, { w: 1, duration: 0.4, ease: 'power3.inOut' }, 0.34)
      .to(state, { round: 0, duration: 0.24, ease: 'power2.in' }, 0.7)
      .fromTo(img, { scale: 1.25 }, { scale: 1, duration: 0.9 }, 0.1);

    // Depois de formado, o contêiner desliza pela palavra e corta outras letras
    gsap.to(state, {
      slide: 1,
      ease: 'none',
      onUpdate: apply,
      scrollTrigger: { trigger: ct, start: desktop ? 'top 30%' : 'top 40%', end: 'bottom -30%', scrub: true },
    });

    return () => gsap.set([media, ghost], { clearProps: 'clipPath,transform' });
  });
}
