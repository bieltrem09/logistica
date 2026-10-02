/**
 * 03 SERVIÇOS — o contêiner azul no centro da palavra.
 *
 * 1. Descida: o guindaste baixa o contêiner dentro de "SERVIÇOS". A rolagem define a
 *    altura alvo; uma mola com massa persegue o alvo (inércia na saída, sobrepasso e
 *    assentamento na chegada). Parou de rolar, a carga para pendurada onde está.
 * 2. Entrega: o cabo solta e recolhe; o contêiner desliza pela palavra cortando letras.
 * 3. Campo azul: ele cresce até ocupar a palavra inteira e revela "SERVIÇOS" completo
 *    em contorno, como se a palavra estivesse dentro da carga. Volta junto se subir.
 */
import { q, lerp, clamp, createSpring } from './utils.js';
import { maskLines, splitInner, labelFromText } from './text.js';

const { gsap, ScrollTrigger } = window;

export function initSection5Animation() {
  const ct = q('.cut-title');
  const word = q('.cut-title__word:not(.cut-title__word--ghost)', ct);
  const ghost = q('.cut-title__word--ghost', ct);
  const img = q('.cut-title__media img', ct);
  labelFromText(word);
  maskLines(word);
  maskLines(ghost);
  const sw = splitInner(q('.line', word), 'chars');
  const sg = splitInner(q('.line', ghost), 'chars');

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)' }, (c) => {
    const { desktop } = c.conditions;
    // Posições em % da palavra: onde pousa, para onde desliza, e o campo final
    const land = desktop ? { left: 56, right: -2, top: 0.36, h: 0.92 } : { left: 40, right: -14, top: 0.4, h: 1.1 };
    const slide = desktop ? { left: 22, right: 34 } : { left: 12, right: 30 };
    const field = desktop ? { left: -1, right: -1, top: 0.04, h: 0.8 } : { left: -2, right: -2, top: 0.02, h: 0.96 };
    const above = -1.9;
    const state = { drop: 0, expand: 0 };

    gsap.set(ct, { '--cut-left': `${land.left}%`, '--cut-right': `${land.right}%`, '--cut-top': `${above}em`, '--cut-h': `${land.h}em`, '--cable': 1 });

    // Mola: a altura do contêiner segue a rolagem com massa (sobrepassa e assenta)
    const spring = createSpring({
      value: above,
      stiffness: 70,
      damping: 9.5,
      onUpdate: (top) => ct.style.setProperty('--cut-top', `${top}em`),
    });
    const aim = () => {
      const dropTop = lerp(above, land.top, state.drop);
      spring.set(dropTop + (field.top - land.top) * state.expand);
    };

    // Letras sobem quando a palavra chega
    gsap
      .timeline({ scrollTrigger: { trigger: ct, start: 'top 82%', once: true } })
      .from(sw.chars, { yPercent: 185, duration: 1.1, ease: 'expo.out', stagger: 0.05 }, 0)
      .from(sg.chars, { yPercent: 185, duration: 1.1, ease: 'expo.out', stagger: 0.05 }, 0);

    const stDrop = ScrollTrigger.create({
      trigger: ct,
      start: 'top 92%',
      end: 'top 52%',
      onUpdate: (self) => {
        state.drop = gsap.parseEase('power1.inOut')(self.progress);
        aim();
      },
      onRefresh: (self) => {
        state.drop = gsap.parseEase('power1.inOut')(self.progress);
        spring.jump(lerp(above, land.top, state.drop) + (field.top - land.top) * state.expand);
      },
    });

    // Entrega + campo azul (ligado à rolagem)
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: ct,
        start: 'top 52%',
        end: desktop ? 'top 6%' : 'top 12%',
        scrub: 0.5,
        onUpdate: (self) => {
          state.expand = clamp((self.progress - 0.6) / 0.4, 0, 1);
          aim();
        },
      },
    });
    tl.to(ct, { '--cable': 0, duration: 0.18, ease: 'power2.in' }, 0)
      .to(ct, { '--cut-left': `${slide.left}%`, '--cut-right': `${slide.right}%`, duration: 0.5, ease: 'power1.inOut' }, 0.1)
      .to(ct, { '--cut-left': `${field.left}%`, '--cut-right': `${field.right}%`, '--cut-h': `${field.h}em`, duration: 0.4, ease: 'power2.inOut' }, 0.6);
    if (img) tl.fromTo(img, { yPercent: -8, scale: 1.15 }, { yPercent: 8, scale: 1, duration: 1 }, 0);

    return () => {
      stDrop.kill();
      spring.jump(above);
    };
  });

  // Dica "cada contêiner traz a sua ficha" aponta para o pátio com um pequeno empurrão
  const hintIcon = q('.services__hint .icon');
  if (hintIcon) {
    gsap.to(hintIcon, {
      y: 4,
      duration: 0.7,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      scrollTrigger: { trigger: hintIcon, toggleActions: 'play pause resume pause' },
    });
  }
}

