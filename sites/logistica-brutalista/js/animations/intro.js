/**
 * Entrada: porta de enrolar com manifesto de carga, depois o hero se monta
 * (título sobe da máscara, grade desce, contêiner cai no cabo, rota aparece).
 */
import { q, qa } from './utils.js';

const { gsap } = window;

export function createIntro(endLoading) {
  const pre = q('#preloader');
  const num = q('.preloader__num', pre);
  const rail = q('.preloader__rail', pre);
  const trolley = q('.preloader__trolley', pre);
  const items = qa('.preloader__manifest li', pre);
  const prog = { v: 0 };

  const render = () => {
    num.textContent = String(Math.round(prog.v)).padStart(3, '0');
    gsap.set(trolley, { x: (rail.offsetWidth - trolley.offsetWidth) * (prog.v / 100) });
    items.forEach((li, i) => {
      const on = prog.v >= (i + 1) * 24;
      if (on === li.$on) return;
      li.$on = on;
      li.classList.toggle('is-ok', on);
      gsap.to(li, { opacity: on ? 1 : 0.22, duration: 0.25, overwrite: true });
    });
  };

  gsap.set(items, { opacity: 0.22 });
  const enter = gsap
    .timeline()
    .from(qa('.preloader__ui > *', pre), { y: 26, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06 })
    .to(prog, { v: 84, duration: 1.6, ease: 'power2.inOut', onUpdate: render }, 0.15);

  return {
    async finish(onReveal) {
      await enter;
      await gsap.to(prog, { v: 100, duration: 0.45, ease: 'power2.out', onUpdate: render });
      await gsap
        .timeline()
        .to(q('.preloader__ui', pre), { y: -30, opacity: 0, duration: 0.45, ease: 'power3.in' })
        .to(q('.preloader__shutter', pre), { yPercent: -101, duration: 1.15, ease: 'expo.inOut' }, '-=0.1')
        .to(
          qa('.preloader__shutter span', pre),
          { scaleY: 0.5, transformOrigin: '50% 0%', duration: 1.15, ease: 'expo.inOut', stagger: { each: 0.025, from: 'end' } },
          '<',
        )
        .add(() => onReveal?.(), '<+=0.4');
      endLoading();
    },
  };
}

export function heroEntrance(hero) {
  const tl = gsap.timeline();
  qa('.hero__lines .line').forEach((line) => line.classList.add('is-masked'));
  tl.from(qa('.hero__lines .line__inner'), { yPercent: 120, duration: 1.4, ease: 'expo.out', stagger: 0.1 }, 0)
    .from(qa('.grid-overlay span'), { scaleY: 0, transformOrigin: '50% 0%', duration: 1.3, ease: 'expo.inOut', stagger: 0.03 }, 0)
    .from('.site-header', { yPercent: -110, duration: 1, ease: 'expo.out' }, 0.35)
    .from(qa('.hero__ui > :not(.hero__cta)'), { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, 0.5)
    .from('.hero__cta', { scale: 0, rotation: -140, duration: 1.1, ease: 'back.out(1.6)' }, 0.7)
    .from(qa('.hero__tag span'), { opacity: 0, x: -10, duration: 0.5, ease: 'power2.out', stagger: 0.08 }, 1.6);
  if (hero) {
    hero.start();
    hero.drop();
    tl.add(hero.revealRoute(), 1.2);
  }
  return tl;
}
