/**
 * Fotos editoriais (.photo, em Processo): a mesma entrada da foto do Sobre.
 * A moldura abre de baixo para cima, a imagem assenta (1.24 → 1.12) e a legenda chega
 * por último; depois a foto segue com parallax leve dentro da moldura (a escala cobre
 * o deslocamento, então a borda nunca aparece). Sem animação, as fotos ficam paradas.
 */
import { q, qa } from './utils.js';

const { gsap } = window;

export function initPhotos() {
  qa('.photo').forEach((fig) => {
    const media = q('.photo__media', fig);
    const img = q('img', media);
    if (!media || !img) return;
    gsap.set(img, { scale: 1.12 });
    gsap
      .timeline({ scrollTrigger: { trigger: media, start: 'top 85%', once: true } })
      .fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' })
      .from(img, { scale: 1.24, duration: 1.7, ease: 'expo.out' }, 0.12)
      .from(qa('.photo__caption span', fig), { x: -12, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.1 }, 0.9);
    gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5,
      ease: 'none',
      scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}
