/**
 * VETOR Logística — camada de movimento.
 *
 * GSAP (ScrollTrigger, ScrollSmoother, SplitText) + Three.js (js/hero-3d.js).
 * Liga html.has-motion, roda a entrada (porta de enrolar) e monta, de cima para baixo:
 *   hero  → contêiner com física de cabo; desce, gira, vem à câmera e as portas abrem a seção 01
 *   01    → manifesto palavra a palavra, fita laranja no "NÃO."
 *   02    → esteira (TRÊS MODAIS.) + carimbo (UM CONTATO.)
 *   02b   → tríptico fixado: navio, caminhão e avião, um de cada vez, andando com a rolagem
 *   03    → contêiner azul baixado pelo guindaste corta "SERVIÇOS" e desliza pela palavra
 *   03b   → pátio em carrossel fixo, cada contêiner pendurado no cabo
 *   04    → peso cai, prazo desliza; números em odômetro
 *   05–08 → rota percorrida pela carga, letreiro, ticket impresso, CTA
 * Sem GSAP, sem Three.js ou com movimento reduzido, o site fica no estado estático.
 */
import { createDriver, HERO_PHASES } from './hero-rig.js';
import { drawContainerTextures } from './textures.js';

const q = (sel, root = document) => root.querySelector(sel);
const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const withTimeout = (promise, ms) =>
  Promise.race([promise, wait(ms).then(() => Promise.reject(new Error(`timeout ${ms}ms`)))]);
const fmt = (n, pad = 0) => {
  const s = Math.round(n).toLocaleString('pt-BR');
  return pad ? s.padStart(pad, '0') : s;
};

let gsap;
let ScrollTrigger;
let ScrollSmoother;
let SplitText;

export async function initMotion({ setHeaderTheme = () => {} } = {}) {
  ({ gsap, ScrollTrigger, ScrollSmoother, SplitText } = window);
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

  let hero = null;
  try {
    await withTimeout(document.fonts ? document.fonts.ready : Promise.resolve(), 3000).catch(() => {});
    const textures = await drawContainerTextures();
    hero = await setupHero(textures);
  } catch (err) {
    console.warn('[vetor] hero animado indisponível:', err);
  }

  const ctx = { smoother, hero, setHeaderTheme };
  buildHero(ctx);
  buildAbout();
  buildModaisHead();
  buildModais(ctx);
  buildServices();
  buildYard(ctx);
  buildNumbers();
  buildProcess();
  buildClients();
  buildTracking();
  buildContact();
  buildFooter();
  buildSectionHeads();
  buildFadeUps();
  buildEncaixe();
  buildPointer();
  bindAnchors(ctx);

  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  await intro.finish(() => heroEntrance(hero));
  smoother.paused(false);
  ScrollTrigger.refresh();
  return { smoother };
}

/* ═══════════════════ ENTRADA: porta de enrolar + manifesto ═══════════════════ */
function createIntro(endLoading) {
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

function heroEntrance(hero) {
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
  }
  return tl;
}

/* ═══════════════════ HERO: contêiner 3D (ou vetor 2D) com física ═══════════════════ */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

/** Reserva sem WebGL: o mesmo movimento aplicado ao vetor do contêiner. */
function createHero2D(cargo) {
  let G;
  return {
    layout(geom) {
      G = geom;
      cargo.style.transformOrigin = `${G.w / 2}px ${G.restCenterY - G.cargoTop}px`;
    },
    render(pose) {
      const a = pose.approach;
      const r = G.sling + G.h / 2;
      const dx = pose.hx + r * Math.sin(pose.theta) - G.restX;
      const dy = pose.hy + r * Math.cos(pose.theta) - G.restCenterY;
      const cover = Math.max(G.W / G.l, G.H / G.h) * 1.08;
      const tx = dx + (G.W / 2 - G.restX - dx) * a;
      const ty = dy + (G.H / 2 - G.restCenterY - dy) * a;
      cargo.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${-pose.theta * (1 - a)}rad) scale(${1 + (cover - 1) * a})`;
    },
    tagPoint() {
      return null;
    },
  };
}

async function setupHero(textures) {
  const heroEl = q('.hero');
  const cargo = q('.hero__cargo');
  const canvas = q('.hero__gl');
  const tag = q('.hero__tag');
  q('.hero__doors').style.setProperty('--door-tex', `url("${textures.doors.toDataURL('image/jpeg', 0.9)}")`);

  const driver = createDriver();
  driver.measure(heroEl, cargo);
  driver.state.introOffset = -1.1 * driver.geom.H;

  let view = null;
  let is3d = false;
  if (hasWebGL()) {
    try {
      const mod = await withTimeout(import('./hero-3d.js'), 6000);
      view = mod.createHero3D({ canvas, textures });
      is3d = true;
      document.documentElement.classList.add('has-3d');
    } catch (err) {
      console.warn('[vetor] Three.js indisponível, usando o vetor 2D:', err);
    }
  }
  if (!view) view = createHero2D(cargo);
  view.layout(driver.geom);

  let running = false;
  let tagH = tag ? tag.offsetHeight : 0;
  const tick = (time, deltaMs) => {
    const dt = clamp((deltaMs || 16.7) / 1000, 1 / 240, 1 / 20);
    const pose = driver.update(dt);
    if (driver.state.progress > HERO_PHASES.approachEnd + 0.02) return;
    view.render(pose, driver.geom);
    if (is3d && tag) {
      const pt = view.tagPoint();
      if (pt) {
        tag.style.transform = `translate3d(${pt.x - driver.geom.cargoLeft + 14}px, ${pt.y - driver.geom.cargoTop - tagH / 2}px, 0)`;
      }
    }
  };

  return {
    is3d,
    start() {
      if (running) return;
      running = true;
      gsap.ticker.add(tick);
    },
    stop() {
      if (!running) return;
      running = false;
      gsap.ticker.remove(tick);
    },
    setProgress(p) {
      driver.state.progress = p;
    },
    setVelocity(v) {
      driver.state.vel = v;
    },
    refresh() {
      driver.measure(heroEl, cargo);
      view.layout(driver.geom);
      tagH = tag ? tag.offsetHeight : 0;
    },
    drop() {
      driver.physics.kick(0.9, 0.35, 0.7);
      return gsap.to(driver.state, { introOffset: 0, duration: 1.9, ease: 'power3.out' });
    },
  };
}

function buildHero({ hero, setHeaderTheme }) {
  const heroEl = q('.hero');
  const spacer = q('.hero-spacer');
  if (!hero) {
    spacer.style.display = 'none';
    return;
  }

  const sizeSpacer = () => {
    spacer.style.height = `${Math.round(heroEl.offsetHeight * 1.5)}px`;
  };
  sizeSpacer();
  ScrollTrigger.addEventListener('refreshInit', sizeSpacer);

  const { lowerEnd, approachEnd: doors } = HERO_PHASES;
  const wide = qa('.hero__lines--wide .line');
  const stack = qa('.hero__lines--stack .line');

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.to(wide[0], { xPercent: -18, duration: lowerEnd }, 0)
    .to(wide[1], { xPercent: 18, duration: lowerEnd }, 0)
    .to(stack, { xPercent: (i) => (i % 2 ? 24 : -24), duration: lowerEnd }, 0)
    .to('.hero__ui', { autoAlpha: 0, y: -60, duration: lowerEnd * 0.5 }, 0)
    .to('.hero__tag', { autoAlpha: 0, duration: 0.05 }, lowerEnd * 0.72)
    .to('.hero__sky', { yPercent: 9, duration: doors }, 0)
    .to('.hero__title', { autoAlpha: 0.12, scale: 0.9, transformOrigin: '50% 80%', duration: doors - lowerEnd }, lowerEnd)
    .to('.hero__sky', { filter: 'brightness(0.32)', duration: doors - lowerEnd }, lowerEnd)
    // As portas (DOM) assumem exatamente onde a face 3D cobre a tela
    .set('.hero__doors', { visibility: 'visible' }, doors)
    .set(['.hero__sky', '.hero__shade', '.hero__title', '.hero__gl', '.hero__cargo', '.hero__ui'], { autoAlpha: 0 }, doors)
    .fromTo('.door--left', { rotationY: 0, '--shade': 0 }, { rotationY: -100, '--shade': 0.6, duration: 0.3, ease: 'power2.in' }, doors + 0.012)
    .fromTo('.door--right', { rotationY: 0, '--shade': 0 }, { rotationY: 100, '--shade': 0.6, duration: 0.3, ease: 'power2.in' }, doors + 0.012)
    .to('.hero__doors', { autoAlpha: 0, duration: 0.05 }, doors + 0.3)
    .set({}, {}, 1);

  ScrollTrigger.create({
    trigger: heroEl,
    start: 'top top',
    end: () => `+=${spacer.offsetHeight + heroEl.offsetHeight}`,
    pin: true,
    pinSpacing: false,
    scrub: true,
    animation: tl,
    onUpdate: (self) => {
      hero.setProgress(self.progress);
      hero.setVelocity(self.getVelocity());
      setHeaderTheme(self.progress > doors + 0.14 ? 'light' : 'dark');
    },
    onToggle: (self) => (self.isActive ? hero.start() : hero.stop()),
    onRefresh: () => hero.refresh(),
  });
}

/* ═══════════════════ AJUDANTES DE TEXTO ═══════════════════ */
function maskLines(el) {
  const lines = qa('.line', el);
  lines.forEach((line) => line.classList.add('is-masked'));
  return lines;
}

function splitInner(line, type) {
  return SplitText.create(q('.line__inner', line), { type, tag: 'span', aria: 'none' });
}

/** Palavras sobem de dentro da máscara de cada linha. */
function riseWords(title, { start = 'top 82%', stagger = 0.07 } = {}) {
  const words = maskLines(title).flatMap((line) => splitInner(line, 'words').words);
  gsap.from(words, {
    yPercent: 185,
    rotation: 5,
    transformOrigin: '0% 100%',
    duration: 1.15,
    ease: 'expo.out',
    stagger,
    scrollTrigger: { trigger: title, start, once: true },
  });
}

function labelFromText(el) {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
}

/* ═══════════════════ 01 SOBRE ═══════════════════ */
function buildAbout() {
  const title = q('.about__title');
  const mark = q('mark', title);
  const words = maskLines(title).flatMap((line) => splitInner(line, 'words').words);
  const markWords = words.filter((w) => mark.contains(w));
  const plain = words.filter((w) => !mark.contains(w));

  gsap
    .timeline({ scrollTrigger: { trigger: title, start: 'top 80%', once: true } })
    .from(plain, { yPercent: 185, rotation: 5, transformOrigin: '0% 100%', duration: 1.15, ease: 'expo.out', stagger: 0.075 })
    .from(mark, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.75, ease: 'expo.inOut' }, '-=0.55')
    .from(markWords, { yPercent: 185, duration: 0.7, ease: 'power4.out' }, '-=0.3')
    .to(title, { keyframes: { x: [0, -6, 5, -3, 0] }, duration: 0.3, ease: 'none' }, '-=0.2');

  const lead = q('.about__text .lead');
  SplitText.create(lead, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    aria: 'none',
    onSplit: (self) =>
      gsap.from(self.lines, {
        yPercent: 110,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { trigger: lead, start: 'top 86%', once: true },
      }),
  });

  gsap.from(qa('.spec__row'), {
    x: -24,
    opacity: 0,
    duration: 0.7,
    ease: 'power3.out',
    stagger: 0.07,
    scrollTrigger: { trigger: '.spec', start: 'top 86%', once: true },
  });

  const media = q('.about__media');
  const img = q('img', media);
  gsap
    .timeline({ scrollTrigger: { trigger: media, start: 'top 84%', once: true } })
    .fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
    .fromTo(img, { scale: 1.4 }, { scale: 1.14, duration: 1.7, ease: 'expo.out' }, 0.1)
    .from(qa('.about__caption span'), { y: 12, opacity: 0, duration: 0.5, stagger: 0.08 }, 0.9);
  gsap.fromTo(img, { yPercent: -6 }, {
    yPercent: 6,
    ease: 'none',
    scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

/* ═══════════════════ 02 MODAIS — esteira + carimbo ═══════════════════ */
function buildModaisHead() {
  const title = q('.modais__title');
  const [l1, l2] = qa('.line', title);
  labelFromText(title);
  l1.classList.add('is-masked');
  const s1 = splitInner(l1, 'chars');
  const s2 = splitInner(l2, 'chars');

  gsap
    .timeline({
      scrollTrigger: { trigger: title, start: 'top 82%', once: true },
      onComplete: () => {
        s1.revert();
        s2.revert();
        l1.classList.remove('is-masked');
      },
    })
    .from(s1.chars, { x: () => window.innerWidth * 0.55, duration: 1.25, ease: 'power4.out', stagger: 0.04 })
    .from(s2.chars, { scale: 2.6, opacity: 0, duration: 0.42, ease: 'power4.in', stagger: 0.045 }, '-=0.55')
    .to(title, { keyframes: { y: [0, 5, -3, 2, 0] }, duration: 0.35, ease: 'none' }, '-=0.05');
}

/* ═══════════════════ 02b TRÍPTICO — um modal por vez ═══════════════════ */
function buildModais({ smoother }) {
  const pin = q('.modais__pin');
  const track = q('.modais__track');
  const strips = qa('.modal-strip').map((el) => {
    const veh = q('.modal-strip__vehicle', el);
    const cs = getComputedStyle(veh);
    return {
      el,
      veh,
      bg: q('.modal-strip__bg', el),
      body: q('.modal-strip__body', el),
      top: q('.modal-strip__top', el),
      tab: q('.modal-strip__tab', el),
      tel: q('.modal-strip__tel', el),
      speed: q('[data-tel="speed"]', el),
      dist: q('[data-tel="dist"]', el),
      wake: q('.vehicle__wake', el),
      clouds: q('.modal-strip__clouds', el),
      rest: () => ({
        '--vx': cs.getPropertyValue('--vx').trim(),
        '--vy': cs.getPropertyValue('--vy').trim(),
        '--vh': cs.getPropertyValue('--vh').trim(),
        '--rot': cs.getPropertyValue('--rot').trim() || '0deg',
      }),
    };
  });
  const [mar, terra, ar] = strips;
  const vh = () => window.innerHeight;
  const vw = () => window.innerWidth;

  /** Telemetria: velocidade sobe no início, distância acompanha o trajeto */
  const telemetry = (s, duration, speedMax, distMax, speedPad) => {
    const o = { v: 0 };
    return gsap.to(o, {
      v: 1,
      duration,
      ease: 'none',
      onUpdate: () => {
        s.speed.textContent = fmt(speedMax * Math.min(1, o.v * 3.2), speedPad);
        s.dist.textContent = fmt(distMax * o.v);
      },
    });
  };

  const scrollToLabel = (tl, label) => {
    const st = tl.scrollTrigger;
    if (!st) return;
    smoother.scrollTo(st.start + (st.end - st.start) * (tl.labels[label] / tl.duration()), true);
  };

  const mm = gsap.matchMedia();

  // Desktop: as faixas viram acordeão — a ativa abre, as outras viram abas verticais
  mm.add('(min-width: 900px)', () => {
    const rest = strips.map((s) => s.rest());
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${vh() * 5}`, pin: true, scrub: true },
    });
    const els = strips.map((s) => s.el);
    const open = (active, at) => {
      strips.forEach((s) => tl.to(s.el, { flexBasis: s === active ? '74%' : '13%', duration: 0.9, ease: 'power2.inOut' }, at));
    };

    // MAR
    tl.addLabel('mar', 0).set(els, { overflow: 'hidden' }, 0.001);
    open(mar, 0);
    tl.to([terra.body, terra.top, ar.body, ar.top], { opacity: 0, duration: 0.3 }, 0)
      .to([terra.veh, ar.veh], { autoAlpha: 0, duration: 0.3 }, 0)
      .to([terra.tab, ar.tab], { opacity: 1, duration: 0.3 }, 0.5)
      .to(mar.veh, { '--vx': '62%', '--vy': '64%', '--rot': '0deg', duration: 0.9, ease: 'power2.inOut' }, 0)
      .to(mar.tel, { opacity: 1, duration: 0.3 }, 0.5)
      .to(mar.veh, { y: () => -vh() * 1.15, duration: 2.4, ease: 'power1.in' }, 0.9)
      .to(mar.veh, { keyframes: { x: [0, 16, -12, 8, 0], rotation: [0, 2, -1.6, 1, 0] }, duration: 2.4 }, 0.9)
      .fromTo(mar.wake, { scaleY: 0.5 }, { scaleY: 1.9, duration: 2.4 }, 0.9)
      .to(mar.bg, { '--bgy': '900px', duration: 3.3 }, 0)
      .fromTo(q('img', mar.bg), { yPercent: -10 }, { yPercent: 10, duration: 3.3 }, 0)
      .add(telemetry(mar, 2.4, 18, 412, 2), 0.9);

    // TERRA
    tl.addLabel('terra', 3.3);
    open(terra, 3.3);
    tl.to([mar.body, mar.top, mar.tel], { opacity: 0, duration: 0.3 }, 3.3)
      .to(mar.tab, { opacity: 1, duration: 0.3 }, 3.7)
      .to(terra.tab, { opacity: 0, duration: 0.2 }, 3.3)
      .to([terra.body, terra.top, terra.tel], { opacity: 1, duration: 0.4 }, 3.7)
      .set(terra.veh, { y: () => -vh() * 0.9, '--vx': '50%', '--vy': '50%', '--vh': 'min(50svh, 36vw)' }, 3.3)
      .to(terra.veh, { autoAlpha: 1, duration: 0.01 }, 3.35)
      .to(terra.veh, { y: () => vh() * 1.05, duration: 2.4, ease: 'power1.inOut' }, 4.2)
      .to(terra.veh, { '--vx': '44%', rotation: -5, duration: 0.5, ease: 'sine.inOut' }, 4.95)
      .to(terra.veh, { rotation: 0, duration: 0.3, ease: 'sine.out' }, 5.45)
      .to(terra.veh, { '--vx': '50%', rotation: 5, duration: 0.5, ease: 'sine.inOut' }, 5.85)
      .to(terra.veh, { rotation: 0, duration: 0.3, ease: 'sine.out' }, 6.35)
      .to(terra.bg, { '--bgy': '-1700px', duration: 3.3 }, 3.3)
      .fromTo(q('img', terra.bg), { yPercent: 10 }, { yPercent: -10, duration: 3.3 }, 3.3)
      .add(telemetry(terra, 2.4, 80, 1240, 2), 4.2);

    // AR
    tl.addLabel('ar', 6.6);
    open(ar, 6.6);
    tl.to([terra.body, terra.top, terra.tel], { opacity: 0, duration: 0.3 }, 6.6)
      .to(terra.tab, { opacity: 1, duration: 0.3 }, 7)
      .to(ar.tab, { opacity: 0, duration: 0.2 }, 6.6)
      .to([ar.body, ar.top, ar.tel], { opacity: 1, duration: 0.4 }, 7)
      .to(ar.clouds, { opacity: 0.85, duration: 0.5 }, 7)
      .set(ar.veh, { x: () => vw() * 0.3, y: () => vh() * 0.75, '--vx': '50%', '--vy': '50%', '--alt': 8 }, 6.6)
      .to(ar.veh, { autoAlpha: 1, duration: 0.01 }, 6.65)
      .to(ar.veh, { x: () => -vw() * 0.42, y: () => -vh() * 0.95, duration: 2.4, ease: 'power1.in' }, 7.5)
      .to(ar.veh, { '--alt': 120, scale: 1.14, duration: 2.4, ease: 'power1.in' }, 7.5)
      .fromTo(ar.clouds, { yPercent: -12 }, { yPercent: 26, duration: 2.8 }, 7.2)
      .to(ar.bg, { '--bgx': '320px', '--bgy': '520px', duration: 3.3 }, 6.6)
      .fromTo(q('img', ar.bg), { yPercent: -10 }, { yPercent: 10, duration: 3.3 }, 6.6)
      .add(telemetry(ar, 2.4, 850, 10000, 3), 7.5);

    // Final: o tríptico se recompõe e os veículos voltam a cruzar as divisões
    tl.addLabel('final', 9.9);
    strips.forEach((s) => tl.to(s.el, { flexBasis: '33.3333%', duration: 1, ease: 'power2.inOut' }, 9.9));
    tl.to(strips.map((s) => s.tab), { opacity: 0, duration: 0.3 }, 9.9)
      .to(strips.map((s) => s.tel), { opacity: 0, duration: 0.3 }, 9.9)
      .to(ar.clouds, { opacity: 0, duration: 0.4 }, 9.9)
      .to(strips.flatMap((s) => [s.body, s.top]), { opacity: 1, duration: 0.4 }, 10.3);
    strips.forEach((s, i) =>
      tl.set(s.veh, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 0, '--alt': 14, ...rest[i] }, 10.35),
    );
    tl.set(mar.wake, { scaleY: 1 }, 10.35)
      .set(els, { overflow: 'visible' }, 10.35)
      .to(strips.map((s) => s.veh), { autoAlpha: 1, duration: 0.5, stagger: 0.12 }, 10.4)
      .set({}, {}, 11.2);

    const onFocus = (s, label) => () => scrollToLabel(tl, label);
    const handlers = [
      [mar, 'mar'],
      [terra, 'terra'],
      [ar, 'ar'],
    ].map(([s, label]) => {
      const fn = onFocus(s, label);
      s.el.addEventListener('focusin', fn);
      return [s.el, fn];
    });
    return () => handlers.forEach(([el, fn]) => el.removeEventListener('focusin', fn));
  });

  // Celular: cada modal ocupa a tela e a trilha desliza para o próximo
  mm.add('(max-width: 899px)', () => {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${vh() * 3.8}`, pin: true, scrub: true },
    });
    const slideTo = (s, at) =>
      tl.to(track, { x: () => -s.el.offsetLeft, duration: 0.8, ease: 'power2.inOut' }, at);

    tl.addLabel('mar', 0)
      .set(strips.map((s) => s.el), { overflow: 'hidden' }, 0.001)
      .to(mar.veh, { '--vx': '58%', '--vy': '36%', '--rot': '0deg', duration: 0.4 }, 0)
      .to(strips.map((s) => s.tel), { opacity: 1, duration: 0.3 }, 0)
      .to(mar.veh, { y: () => -vh() * 0.75, duration: 2, ease: 'power1.in' }, 0.4)
      .fromTo(mar.wake, { scaleY: 0.5 }, { scaleY: 1.9, duration: 2 }, 0.4)
      .to(mar.bg, { '--bgy': '700px', duration: 2.4 }, 0)
      .add(telemetry(mar, 2, 18, 412, 2), 0.4);

    tl.addLabel('terra', 2.4).set(terra.veh, { y: () => -vh() * 0.7, '--vx': '50%', '--vy': '34%' }, 2.4);
    slideTo(terra, 2.4);
    tl.to(terra.veh, { y: () => vh() * 0.12, duration: 2, ease: 'power2.out' }, 3.2)
      .to(terra.veh, { '--vx': '44%', rotation: -5, duration: 0.45 }, 3.8)
      .to(terra.veh, { rotation: 0, duration: 0.3 }, 4.25)
      .to(terra.bg, { '--bgy': '-1300px', duration: 2.8 }, 2.4)
      .fromTo(q('img', terra.bg), { yPercent: 10 }, { yPercent: -10, duration: 2.8 }, 2.4)
      .add(telemetry(terra, 2, 80, 1240, 2), 3.2);

    tl.addLabel('ar', 5.2)
      .set(ar.veh, { x: () => vw() * 0.3, y: () => vh() * 0.12, '--vx': '50%', '--vy': '34%', '--alt': 8 }, 5.2)
      .to(ar.clouds, { opacity: 0.85, duration: 0.4 }, 5.4);
    slideTo(ar, 5.2);
    tl.to(ar.veh, { x: () => -vw() * 0.55, y: () => -vh() * 0.6, duration: 2, ease: 'power1.in' }, 6)
      .to(ar.veh, { '--alt': 90, scale: 1.12, duration: 2, ease: 'power1.in' }, 6)
      .fromTo(ar.clouds, { yPercent: -12 }, { yPercent: 26, duration: 2.4 }, 5.6)
      .add(telemetry(ar, 2, 850, 10000, 3), 6)
      .set({}, {}, 8.2);
  });
}

/* ═══════════════════ 03 SERVIÇOS — contêiner azul corta a palavra ═══════════════════ */
function buildServices() {
  const ct = q('.cut-title');
  const word = q('.cut-title__word:not(.cut-title__word--ghost)', ct);
  const ghost = q('.cut-title__word--ghost', ct);
  labelFromText(word);
  maskLines(word);
  maskLines(ghost);
  const sw = splitInner(q('.line', word), 'chars');
  const sg = splitInner(q('.line', ghost), 'chars');

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)' }, (c) => {
    const { desktop } = c.conditions;
    const from = desktop ? [56, -2] : [40, -14];
    const to = desktop ? [6, 48] : [0, 26];
    const top = desktop ? 0.36 : 0.4;
    gsap.set(ct, { '--cut-left': `${from[0]}%`, '--cut-right': `${from[1]}%`, '--cut-top': '-1.7em' });

    const charIn = { yPercent: 185, duration: 1.1, ease: 'expo.out', stagger: 0.05 };
    gsap
      .timeline({ scrollTrigger: { trigger: ct, start: 'top 80%', once: true } })
      .from(sw.chars, charIn, 0)
      .from(sg.chars, charIn, 0)
      // O guindaste baixa o contêiner azul dentro da palavra
      .to(ct, { '--cut-top': `${top}em`, duration: 1.15, ease: 'bounce.out' }, 0.35)
      .to(ct, { keyframes: { y: [0, 7, -3, 1, 0] }, duration: 0.32, ease: 'none' }, 0.82);

    // Rolando, o contêiner desliza pela palavra e corta outras letras
    gsap.to(ct, {
      '--cut-left': `${to[0]}%`,
      '--cut-right': `${to[1]}%`,
      ease: 'none',
      scrollTrigger: { trigger: ct, start: 'top 40%', end: 'bottom -30%', scrub: true },
    });
  });
}

/* ═══════════════════ 03b PÁTIO — carrossel fixo ═══════════════════ */
function buildYard({ smoother }) {
  const pinEl = q('.yard-pin');
  const yard = q('.yard', pinEl);
  const cards = qa('.cargo', yard);
  const n = cards.length;
  const idx = q('.yard-hud__idx', pinEl);
  const rail = q('.yard-hud__rail', pinEl);
  const trolley = q('.yard-hud__trolley', pinEl);
  const stepW = () => cards[1].offsetLeft - cards[0].offsetLeft;

  gsap.set(cards, { transformOrigin: '50% -30%' });
  const focus = (p) => {
    const f = p * (n - 1);
    cards.forEach((card, i) => {
      const d = f - i;
      const ad = Math.min(Math.abs(d), 1);
      gsap.set(card, {
        scale: 1 - 0.13 * ad,
        rotation: clamp(-d * 5, -7, 7),
        y: ad * 54,
        opacity: 1 - 0.5 * ad,
        '--focus': clamp(1 - Math.abs(d) * 1.8, 0, 1),
      });
    });
    idx.textContent = String(Math.round(f) + 1).padStart(2, '0');
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

/* ═══════════════════ 04 NÚMEROS — peso cai, prazo desliza; odômetro ═══════════════════ */
function buildOdometer(el) {
  const text = el.textContent.trim();
  const chars = [...text];
  const totalDigits = chars.filter((ch) => /\d/.test(ch)).length;
  let di = 0;
  const html = chars
    .map((ch) => {
      if (!/\d/.test(ch)) return `<span class="odo__sep">${ch}</span>`;
      const target = Number(ch);
      const cycles = 1 + (totalDigits - 1 - di); // o dígito da direita gira mais
      di += 1;
      const seq = [];
      for (let c = 0; c < cycles; c += 1) for (let d = 0; d < 10; d += 1) seq.push(d);
      for (let d = 0; d <= target; d += 1) seq.push(d);
      const to = seq.length - 1;
      seq.push((target + 1) % 10); // espaço para o pequeno passe do assentamento
      return `<span class="odo__d"><span class="odo__reel" data-to="${to}" data-len="${seq.length}">${seq
        .map((d) => `<span>${d}</span>`)
        .join('')}</span></span>`;
    })
    .join('');
  el.innerHTML = `<span class="sr-only">${text}</span><span class="odo" aria-hidden="true">${html}</span>`;
  return qa('.odo__reel', el);
}

function buildNumbers() {
  const title = q('.numbers__title');
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
    .from(s1.chars, { yPercent: -200, duration: 1.15, ease: 'bounce.out', stagger: 0.045 })
    .from(s2.chars, { x: () => window.innerWidth * 0.6, duration: 0.8, ease: 'power3.out', stagger: 0.02 }, '-=0.6');

  qa('.stat').forEach((stat, si) => {
    const reels = qa('[data-anim="counter"]', stat).flatMap(buildOdometer);
    gsap
      .timeline({ scrollTrigger: { trigger: stat, start: 'top 88%', once: true }, delay: (si % 3) * 0.12 })
      .from(stat.children, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 })
      .to(
        reels,
        {
          yPercent: (i, r) => -(Number(r.dataset.to) / Number(r.dataset.len)) * 100,
          duration: (i) => 1.9 + i * 0.22,
          ease: 'back.out(1.15)',
        },
        0.1,
      );
    const affix = qa('.stat__affix', stat);
    if (affix.length) gsap.from(affix, { opacity: 0, x: 10, duration: 0.5, delay: 1.3, scrollTrigger: { trigger: stat, start: 'top 88%', once: true } });
  });
}

/* ═══════════════════ 05 PROCESSO — a carga percorre a rota ═══════════════════ */
function buildProcess() {
  riseWords(q('.process__title'));
  const steps = q('.route__steps');
  const items = qa('.step', steps);
  const nodes = items.map((s) => q('.step__node', s));
  const horizontal = window.matchMedia('(min-width: 900px)');
  let marks = [];
  const measure = () => {
    marks = items.map((s) =>
      horizontal.matches ? s.offsetLeft / steps.offsetWidth : s.offsetTop / steps.offsetHeight,
    );
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

/* ═══════════════════ 06 CLIENTES — letreiro + depoimentos encaixando ═══════════════════ */
function buildClients() {
  riseWords(q('.clients__title'));
  const marquee = q('.marquee');
  const tracks = qa('.marquee__track', marquee);
  const loop = gsap.to(tracks, { xPercent: -100, duration: 26, ease: 'none', repeat: -1 });
  loop.totalTime(loop.duration() * 40); // permite tocar ao contrário sem parar no início
  const skew = gsap.quickTo(tracks, 'skewX', { duration: 0.4, ease: 'power3.out' });

  ScrollTrigger.create({
    trigger: marquee,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
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

/* ═══════════════════ 07 RASTREAMENTO — digitação + ticket impresso ═══════════════════ */
function buildTracking() {
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

/* ═══════════════════ 08 CONTATO ═══════════════════ */
function buildContact() {
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

/* ═══════════════════ RODAPÉ — a marca sobe da base ═══════════════════ */
function buildFooter() {
  const brand = q('.site-footer__brand');
  const split = SplitText.create(brand, { type: 'chars', tag: 'span', aria: 'none' });
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

/* ═══════════════════ GERAIS ═══════════════════ */
function buildSectionHeads() {
  qa('.section-head').forEach((head) => {
    const rule = q('.section-head__rule', head);
    const parts = [...head.children].filter((el) => el !== rule);
    gsap
      .timeline({ scrollTrigger: { trigger: head, start: 'top 90%', once: true } })
      .from(rule, { scaleX: 0, transformOrigin: '0% 50%', duration: 1.1, ease: 'expo.inOut' })
      .from(parts, { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, 0.15);
  });
}

function buildFadeUps() {
  const els = [
    ...qa('[data-anim="fade-up"]').filter((el) => !el.closest('.hero') && !el.matches('.about__text .lead')),
    ...qa('.about__text .pill, .services__hint, .tracking__portal, .site-footer__nav, .site-footer__contact'),
  ];
  gsap.set(els, { y: 36, opacity: 0 });
  ScrollTrigger.batch(els, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08 }),
  });
}

/** Blocos escuros e coloridos "encaixam" na tela ao entrar. */
function buildEncaixe() {
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

/* ═══════════════════ PONTEIRO: cursor + magnético ═══════════════════ */
function buildPointer() {
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

/* ═══════════════════ ÂNCORAS com rolagem suave ═══════════════════ */
function bindAnchors({ smoother }) {
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
