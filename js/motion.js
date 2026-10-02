/**
 * VETOR Logística — camada de movimento (orquestrador).
 *
 * GSAP (ScrollTrigger, ScrollSmoother, SplitText) + Three.js (js/hero-3d.js).
 * Liga html.has-motion, roda a entrada (porta de enrolar) e monta, de cima para baixo,
 * uma única narrativa: acompanhar a carga.
 *
 *   hero   animations/hero.js        contêiner desce no cabo (física), telemetria, portas abrem
 *   01     animations/about.js       manifesto ligado à rolagem + ficha técnica lateral
 *   02     animations/journey.js     MAR → TERRA → AR: rota, veículos e a mesma carga trocando de modal
 *   03     animations/services.js    guindaste baixa o contêiner azul; ele vira campo e revela a palavra
 *   03b    animations/yard.js        pátio em carrossel fixo, contêineres balançando no cabo
 *   04     animations/statistics.js  contadores precisos
 *   05–08  animations/sections.js    rota do processo, letreiro, ticket, CTA, rodapé
 *   ponteiro animations/pointer.js   cursor, magnéticos, profundidade com o mouse
 *
 * Sem GSAP, sem Three.js ou com movimento reduzido, o site fica no estado estático.
 */
import { drawContainerTextures } from './textures.js';
import { q, qa, withTimeout } from './animations/utils.js';

export async function initMotion({ setHeaderTheme = () => {} } = {}) {
  const { gsap, ScrollTrigger, ScrollSmoother, SplitText } = window;
  const root = document.documentElement;
  const endLoading = () => {
    clearTimeout(window.__vetorLoadTimer);
    root.classList.remove('is-loading');
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !gsap || !ScrollTrigger || !ScrollSmoother || !SplitText) {
    endLoading();
    return null;
  }

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);
  root.classList.add('has-motion');
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Os módulos leem window.gsap ao carregar: só importamos depois de confirmar que existe
  const [hero, about, journey, services, yard, stats, sections, pointer] = await Promise.all([
    import('./animations/hero.js'),
    import('./animations/about.js'),
    import('./animations/journey.js'),
    import('./animations/services.js'),
    import('./animations/yard.js'),
    import('./animations/statistics.js'),
    import('./animations/sections.js'),
    import('./animations/pointer.js'),
  ]);

  const smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: 1.05,
    smoothTouch: 0.08,
    effects: false,
  });
  smoother.paused(true);

  const intro = createIntro(endLoading);

  let heroRig = null;
  try {
    await withTimeout(document.fonts ? document.fonts.ready : Promise.resolve(), 3000).catch(() => {});
    const textures = await drawContainerTextures();
    heroRig = await hero.setupHero(textures);
  } catch (err) {
    console.warn('[vetor] hero animado indisponível:', err);
  }

  const ctx = { smoother, hero: heroRig, setHeaderTheme };
  hero.initHeroAnimation(ctx);
  about.initSection2Animation();
  about.initSection3Animation();
  journey.initModaisHead();
  journey.initLogisticsJourney(ctx);
  services.initSection5Animation();
  yard.initContainerCarousel(ctx);
  stats.initStatistics();
  sections.initProcess();
  sections.initClients();
  sections.initTracking();
  sections.initContact();
  sections.initFooter();
  sections.initSectionHeads({ skip: ['.about'] });
  sections.initFadeUps();
  sections.initEncaixe();
  pointer.initPointer();
  pointer.bindAnchors(ctx);

  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  await intro.finish(() => hero.heroEntrance(heroRig));
  smoother.paused(false);
  ScrollTrigger.refresh();
  return { smoother };
}

/* ═══════════════════ ENTRADA: porta de enrolar + manifesto ═══════════════════ */
function createIntro(endLoading) {
  const { gsap } = window;
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
