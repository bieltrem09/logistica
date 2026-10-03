/**
 * VETOR Logística — camada de movimento (orquestrador).
 *
 * GSAP (ScrollTrigger, ScrollSmoother, SplitText) + Three.js (js/hero-3d.js).
 * Liga html.has-motion, roda a entrada (porta de enrolar) e monta cada seção a
 * partir do seu módulo em js/animations/, de cima para baixo — a página conta a
 * viagem de uma carga:
 *   hero    initHeroAnimation      contêiner no guindaste desce e abre as portas para a seção 2
 *   2       initSection2Animation  manifesto palavra a palavra, comandado pela rolagem
 *   3       initSection3Animation  texto, ficha técnica e foto entram de lado, números contam
 *   4       initLogisticsJourney   MAR → TERRA → AR: um veículo por vez seguindo a rota
 *   5       initSection5Animation  o azul nasce do ponto de destino e corta "SERVIÇOS"
 *   6       initContainerCarousel  pátio em carrossel horizontal fixo
 *   números initStatistics         contadores com easing
 *   títulos initTitleEffects       palavras entram com desfoque; uma palavra troca (text-effects.js)
 *   fotos   initPhotos             fotos de Números e Processo abrem e seguem com parallax (photos.js)
 *   5–8     processo, clientes, rastreamento, contato e rodapé
 * Sem GSAP, sem Three.js ou com movimento reduzido, o site fica no estado estático.
 */
import { drawContainerTextures } from './textures.js';
import { withTimeout } from './animations/utils.js';
import { createIntro, heroEntrance } from './animations/intro.js';
import { initHeroAnimation } from './animations/hero.js';
import { initSection2Animation } from './animations/section2.js';
import { initSection3Animation } from './animations/section3.js';
import { initLogisticsJourney } from './animations/journey.js';
import { initSection5Animation } from './animations/section5.js';
import { initContainerCarousel } from './animations/carousel.js';
import { initStatistics } from './animations/statistics.js';
import { initProcess, initClients, initTracking, initContact, initFooter } from './animations/closing.js';
import { initSectionHeads, initFadeUps, initSectionEntrances, initPointer, initAnchors } from './animations/global.js';
import { initTitleEffects } from './animations/text-effects.js';
import { initPhotos } from './animations/photos.js';

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

  const smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: 1.05,
    smoothTouch: 0.08,
    effects: false,
  });
  smoother.paused(true);

  const intro = createIntro(endLoading);

  let textures = null;
  try {
    await withTimeout(document.fonts ? document.fonts.ready : Promise.resolve(), 3000).catch(() => {});
    textures = await drawContainerTextures();
  } catch (err) {
    console.warn('[vetor] texturas do contêiner indisponíveis:', err);
  }

  const ctx = { smoother, setHeaderTheme };
  const hero = textures ? await initHeroAnimation({ textures, setHeaderTheme }) : null;
  if (!hero) document.querySelector('.hero-spacer').style.display = 'none';
  initSection2Animation();
  initSection3Animation();
  initLogisticsJourney(ctx);
  initSection5Animation();
  initContainerCarousel(ctx);
  initStatistics();
  initProcess();
  initClients();
  initTracking();
  initContact();
  // Títulos das seções: revelação com desfoque e palavra que troca (TextBlurReveal + TextMorph)
  initTitleEffects(['.modais__title', '.numbers__title', '.process__title', '.clients__title', '.tracking__title', '.contact__title'].map((sel) => document.querySelector(sel)));
  initFooter();
  initPhotos();
  initSectionHeads();
  initFadeUps();
  initSectionEntrances();
  initPointer();
  initAnchors(ctx);

  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  await intro.finish(() => heroEntrance(hero));
  smoother.paused(false);
  ScrollTrigger.refresh();
  return { smoother };
}
