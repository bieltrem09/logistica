/**
 * HERO — o contêiner suspenso desce com a rolagem.
 *
 * Estrutura → suporte → carga:
 *   lança do guindaste → cabo principal → gancho → lingas → contêiner
 * A lança é basculante: na carga da página a ponta fica acima da tela; rolando, é ela que
 * desce levando a carga, e aparece por baixo do cabeçalho. Vindo para a câmera, ela sobe.
 * A física (js/cable-physics.js) dá peso: o carro anda primeiro, o cabo balança,
 * o contêiner atrasa em relação ao gancho e o cabo quica quando a descida freia.
 *
 * Fases (HERO_PHASES, progresso do hero fixado):
 *   0 → holdEnd       cabo tensiona, carro se reposiciona (a carga quase não se move)
 *   holdEnd → lowerEnd descida com balanço; telemetria mede a altura até o pátio
 *   lowerEnd → approachEnd o contêiner gira e vem até a câmera
 *   approachEnd →     as portas (DOM) abrem e revelam a seção 01
 *
 * Três vistas para o mesmo movimento:
 *   1. foto real recortada (assets/img/hero-container.webp), se o arquivo existir
 *   2. contêiner 3D (Three.js), se houver WebGL
 *   3. vetor SVG de reserva
 */
import { createDriver, HERO_PHASES } from '../hero-rig.js';
import { q, qa, clamp, withTimeout, fmt } from './utils.js';

const { gsap, ScrollTrigger, SplitText } = window;

/** Pequenos laços contínuos do hero (seta "Role"): só rodam com o hero na tela. */
const idleLoops = [];

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

/** A foto do contêiner existe e carregou? (main.js marca .is-missing quando falha) */
async function photoReady(img, media) {
  if (!img || media.classList.contains('is-missing')) return false;
  if (!img.complete) {
    try {
      await withTimeout(img.decode(), 4000);
    } catch {
      return false;
    }
  }
  return img.naturalWidth > 0 && !media.classList.contains('is-missing');
}

/** Forma da foto do contêiner, dos data-* do <img> (frações da imagem). */
function readShape(img) {
  const nums = (attr, fallback) => (img.dataset[attr] || fallback).trim().split(/\s+/).map(Number);
  return {
    ratio: img.naturalHeight / img.naturalWidth,
    hook: nums('hook', '0.5 0.08'),
    box: nums('box', '0.02 0.37 0.98 0.78'),
    cover: nums('cover', '0.1 0.45 0.9 0.72'),
  };
}

/**
 * Vista 2D (foto real ou vetor): o contêiner gira em torno do gancho e o cabo
 * é desenhado à parte, do carro do guindaste até o gancho, sempre esticado.
 */
function createHero2D(heroEl, cargo, { photo = false } = {}) {
  const doors = q('.hero__doors', heroEl);
  const rope = document.createElement('span');
  rope.className = 'hero__rope';
  rope.setAttribute('aria-hidden', 'true');
  heroEl.insertBefore(rope, cargo);
  let G;
  const base = { x: 0, y: 0 };

  // Escala que faz a área toda opaca (cover) encher a tela no fim da aproximação
  const coverScale = () => Math.max(G.W / G.coverW, G.H / G.coverH) * 1.08;

  return {
    layout(geom) {
      G = geom;
      cargo.style.transformOrigin = `${G.hookLocal.x}px ${G.cable + G.hookLocal.y}px`;
      if (photo) {
        // As portas em DOM recebem a foto no mesmo enquadramento do fim da aproximação
        const cover = coverScale();
        const imgTop = G.cargoTop + G.cable;
        const left = G.W / 2 - (G.coverCX - G.cargoLeft) * cover;
        const top = G.H / 2 - (G.coverCY - imgTop) * cover;
        doors.style.setProperty('--door-size', `${G.w * cover}px auto`);
        doors.style.setProperty('--door-pos', `${left}px ${top}px`);
      }
    },
    render(pose) {
      const a = pose.approach;
      const cover = coverScale();
      const depth = 1 + pose.hz / (3 * G.H); // balanço em profundidade vira escala
      // vetor gancho → centro da área de cobertura; no fim ela fica no centro da tela
      const cdx = G.coverCX - G.restX;
      const cdy = G.coverCY - G.hookY0;
      const dx = pose.hx - G.restX;
      const dy = pose.hy - G.hookY0;
      const fx = G.W / 2 - cdx * cover - G.restX;
      const fy = G.H / 2 - cdy * cover - G.hookY0;
      const tx = dx + (fx - dx) * a;
      const ty = dy + (fy - dy) * a;
      const rot = -(pose.theta + pose.alpha) * (1 - a);
      const sc = depth + (cover - depth) * a;
      cargo.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}rad) scale(${sc})`;

      const hx = G.restX + tx;
      const hy = G.hookY0 + ty;
      const len = Math.hypot(hx - pose.tx, hy - pose.py);
      const ang = Math.atan2(hy - pose.py, hx - pose.tx) - Math.PI / 2;
      rope.style.transform = `translate3d(${pose.tx}px, ${pose.py}px, 0) rotate(${ang}rad) scaleY(${len})`;

      // base da silhueta (prumo da telemetria): gancho + rotação do vetor até o meio da base
      const bx = (G.boxCX - G.restX) * sc;
      const by = (G.restCenterY - G.hookY0 + G.h / 2) * sc;
      base.x = hx + bx * Math.cos(rot) - by * Math.sin(rot);
      base.y = hy + bx * Math.sin(rot) + by * Math.cos(rot);
    },
    tagPoint() {
      return null;
    },
    basePoint() {
      return base;
    },
  };
}

/**
 * Guindaste: a lança basculante. A polia da ponta (âncora definida no CSS) fica sempre no
 * ponto de suspensão do cabo; a lança anda com o carro (mouse, rolagem rápida), desce com a
 * carga e cede quando o cabo estica. Funciona com a foto recortada ou com o vetor de reserva.
 */
function createCrane(heroEl) {
  const crane = q('.hero__crane', heroEl);
  if (!crane) return null;
  const aux = q('.hero__crane-hook', crane);
  let ax = 0;
  let ay = 0;
  // Gancho auxiliar (foto): pêndulo próprio, sacudido pela aceleração da ponta da lança
  const p = { ang: 0, vel: 0, x: null, y: null, vx: 0, vy: 0, axl: 0, ayl: 0, len: 120, g: 3600 };
  return {
    layout() {
      const cs = getComputedStyle(crane);
      ax = crane.offsetWidth * (parseFloat(cs.getPropertyValue('--crane-ax')) || 0.975);
      ay = crane.offsetHeight * (parseFloat(cs.getPropertyValue('--crane-ay')) || 0.85);
      if (aux) p.len = Math.max(40, aux.offsetHeight * 0.75);
      p.g = 4.2 * heroEl.offsetHeight;
    },
    render(pose, dt) {
      crane.style.transform = `translate3d(${pose.tx - ax}px, ${pose.py - ay}px, 0)`;
      if (!aux || !aux.offsetHeight || !dt) return;
      if (p.x === null) {
        p.x = pose.tx;
        p.y = pose.py;
      }
      const vx = (pose.tx - p.x) / dt;
      const vy = (pose.py - p.y) / dt;
      // aceleração da ponta da lança, suavizada (a medida quadro a quadro é ruidosa)
      p.axl += (clamp((vx - p.vx) / dt, -20000, 20000) - p.axl) * Math.min(1, dt * 12);
      p.ayl += (clamp((vy - p.vy) / dt, -20000, 20000) - p.ayl) * Math.min(1, dt * 12);
      Object.assign(p, { x: pose.tx, y: pose.py, vx, vy });
      const gEff = Math.max(0.25 * p.g, p.g - p.ayl);
      // pouco atrito: oscila e assenta devagar; limitado a ~20° para não ficar caricato
      const acc = -(gEff / p.len) * Math.sin(p.ang) - (p.axl / p.len) * Math.cos(p.ang) - 0.9 * p.vel;
      p.vel += acc * dt;
      p.ang = clamp(p.ang + p.vel * dt, -0.35, 0.35);
      if (Math.abs(p.ang) === 0.35) p.vel *= 0.5;
      aux.style.transform = `rotate(${-p.ang}rad)`;
    },
  };
}

/**
 * Telemetria do guindaste: prumo (sempre vertical, mesmo com o contêiner balançando),
 * altura até o pátio contando para zero e o alvo de pouso que trava em laranja.
 */
function createHud(heroEl) {
  const svg = q('.hero__hud', heroEl);
  if (!svg) return null;
  const plumb = q('.hud__plumb', svg);
  const target = q('.hud__target', svg);
  const alt = q('.hud__alt', svg);
  const dock = q('.hud__dock', svg);
  let G;
  let ty = 0;
  let locked = false;

  return {
    el: svg,
    layout(geom) {
      G = geom;
      svg.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
      ty = G.restCenterY + G.lowerPx + G.h / 2 + 0.012 * G.H;
      const half = G.l / 2 + 0.03 * G.w;
      const x0 = G.boxCX - half;
      const x1 = G.boxCX + half;
      const t = 0.035 * G.w;
      target.setAttribute(
        'd',
        `M${x0} ${ty - t}V${ty}H${x0 + t}M${x1} ${ty - t}V${ty}H${x1 - t}M${G.boxCX} ${ty - 0.6 * t}V${ty + 0.6 * t}`,
      );
      dock.setAttribute('x', x1 - t);
      dock.setAttribute('y', ty + 18);
    },
    render(pt, pose) {
      if (!G || !pt) return;
      const top = Math.min(pt.y + 6, ty);
      plumb.setAttribute('x1', pt.x);
      plumb.setAttribute('x2', pt.x);
      plumb.setAttribute('y1', top);
      plumb.setAttribute('y2', ty);
      const meters = Math.max(0, ((ty - pt.y) / G.H) * 32);
      alt.textContent = `ALT ${fmt(meters, { decimals: 1 })} m`;
      alt.setAttribute('x', pt.x + 12);
      alt.setAttribute('y', (top + ty) / 2);
      const on = pose.lower > 0.985 && meters < 0.6;
      if (on !== locked) {
        locked = on;
        svg.classList.toggle('is-locked', on);
      }
    },
  };
}

export async function setupHero(textures) {
  const heroEl = q('.hero');
  const cargo = q('.hero__cargo');
  const canvas = q('.hero__gl');
  const tag = q('.hero__tag');
  const photo = await photoReady(q('.hero__cargo-img', cargo), cargo);

  const driver = createDriver();
  if (photo) driver.setShape(readShape(q('.hero__cargo-img', cargo)));
  driver.measure(heroEl, cargo);
  driver.state.introOffset = -1.1 * driver.geom.H;

  let view = null;
  let is3d = false;
  if (photo) {
    document.documentElement.classList.add('has-photo-cargo');
    q('.hero__doors').style.setProperty('--door-tex', `url("${q('.hero__cargo-img', cargo).currentSrc}")`);
  } else {
    q('.hero__doors').style.setProperty('--door-tex', `url("${textures.doors.toDataURL('image/jpeg', 0.9)}")`);
    if (hasWebGL()) {
      try {
        const mod = await withTimeout(import('../hero-3d.js'), 6000);
        view = mod.createHero3D({ canvas, textures });
        is3d = true;
        document.documentElement.classList.add('has-3d');
      } catch (err) {
        console.warn('[vetor] Three.js indisponível, usando o vetor 2D:', err);
      }
    }
  }
  if (!view) view = createHero2D(heroEl, cargo, { photo });
  view.layout(driver.geom);

  const hud = createHud(heroEl);
  hud?.layout(driver.geom);
  const crane = createCrane(heroEl);
  crane?.layout();

  let running = false;
  let tagH = tag ? tag.offsetHeight : 0;
  const tick = (time, deltaMs) => {
    const dt = clamp((deltaMs || 16.7) / 1000, 1 / 240, 1 / 20);
    const pose = driver.update(dt);
    if (driver.state.progress > HERO_PHASES.approachEnd + 0.02) return;
    view.render(pose, driver.geom);
    crane?.render(pose, dt);
    hud?.render(view.basePoint(), pose);
    if (is3d && tag) {
      const pt = view.tagPoint();
      if (pt) {
        tag.style.transform = `translate3d(${pt.x - driver.geom.cargoLeft + 14}px, ${pt.y - driver.geom.cargoTop - tagH / 2}px, 0)`;
      }
    }
  };

  return {
    is3d,
    photo,
    hud,
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
    setPointer(nx) {
      gsap.to(driver.state, { pointer: nx, duration: 0.6, ease: 'power2.out', overwrite: 'auto' }); // 'auto': não mata a queda (introOffset)
    },
    refresh() {
      driver.measure(heroEl, cargo);
      view.layout(driver.geom);
      hud?.layout(driver.geom);
      crane?.layout();
      tagH = tag ? tag.offsetHeight : 0;
    },
    drop() {
      driver.physics.kick(0.45, 0.2, 0.5); // a carga chega com um balanço curto (~6°), não um pêndulo solto
      return gsap.to(driver.state, { introOffset: 0, duration: 1.9, ease: 'power3.out' });
    },
  };
}

/**
 * Entrada cinematográfica, depois que a porta de enrolar sobe. Ordem (em segundos):
 *   0.00  céu: a câmera assenta (1.22 → 1) e a sombra das bordas chega
 *   0.00  grade de 12 colunas desce
 *   0.15  título letra a letra, de dentro da máscara de cada linha
 *   0.00  contêiner cai no cabo (física: balança e quica — js/hero-rig.js)
 *   0.35  cabeçalho
 *   0.55  textos secundários linha a linha (máscara), cada bloco no seu tempo
 *   0.75  CTA gira e entra com mola; depois pulsa duas vezes
 *   1.25  o título acusa o peso quando a carga assenta
 *   1.50  telemetria e etiqueta técnica
 * Os splits são desfeitos no fim: o HTML volta ao original (resize e leitores de tela).
 */
export function heroEntrance(hero) {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const splits = [];

  // Título: letra a letra, girando de leve a partir da base, dentro da máscara da linha
  qa('.hero__lines .line').forEach((line) => line.classList.add('is-masked'));
  const titleSplits = qa('.hero__lines .line__inner').map((el) => SplitText.create(el, { type: 'chars', tag: 'span', aria: 'none' }));
  splits.push(...titleSplits);
  const lineChars = titleSplits.map((sp) => sp.chars);

  // Textos secundários: linha a linha, cada linha sobe de dentro da sua máscara
  const secondary = qa('.hero__kicker, .hero__coords, .hero__lead').map((el) =>
    SplitText.create(el, { type: 'lines', mask: 'lines', aria: 'none' }),
  );
  splits.push(...secondary);

  tl.from('.hero__sky', { scale: 1.22, duration: 2.6 }, 0)
    .from('.hero__shade', { opacity: 0, duration: 1.8, ease: 'power2.out' }, 0.1)
    .from(qa('.grid-overlay span'), { scaleY: 0, transformOrigin: '50% 0%', duration: 1.3, ease: 'expo.inOut', stagger: 0.03 }, 0);
  lineChars.forEach((chars, i) => {
    tl.from(chars, { yPercent: 118, rotation: 7, transformOrigin: '0% 100%', duration: 1.35, stagger: 0.035 }, 0.15 + (i % 3) * 0.12);
  });
  tl.from('.site-header', { yPercent: -110, duration: 1 }, 0.35);
  secondary.forEach((sp, i) => {
    tl.from(sp.lines, { yPercent: 105, duration: 1, stagger: 0.07 }, 0.55 + i * 0.12);
  });
  tl.from('.hero__scroll', { y: 16, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.9)
    .from('.hero__cta', { scale: 0, rotation: -140, duration: 1.1, ease: 'back.out(1.6)' }, 0.75)
    .fromTo('.hero__cta', { '--ring': 0 }, { '--ring': 1, duration: 1.1, ease: 'power2.out', repeat: 1, repeatDelay: 0.25 }, 1.7)
    // A carga assenta no cabo: o título acusa o peso com um pequeno solavanco
    .to('.hero__title', { keyframes: { y: [0, 7, -2, 1, 0] }, duration: 0.5, ease: 'none' }, 1.25)
    .from(qa('.hero__tag span'), { opacity: 0, x: -10, duration: 0.5, ease: 'power2.out', stagger: 0.08 }, 1.6);
  if (hero?.hud) {
    // O alvo de pouso "acende" depois que a carga chega e assenta
    tl.fromTo(hero.hud.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 1.5).from(
      q('.hud__target', hero.hud.el),
      { scale: 1.25, transformOrigin: '50% 50%', duration: 0.9 },
      1.5,
    );
  }
  tl.add(() => splits.forEach((sp) => sp.revert()));

  // Seta "Role": pulso contínuo e discreto (pausa quando o hero sai da tela)
  const arrow = q('.hero__scroll .icon');
  if (arrow) idleLoops.push(gsap.to(arrow, { y: 5, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.8 }));

  if (hero) {
    hero.start();
    hero.drop();
  }
  return tl;
}

/**
 * Mouse (só mouse/trackpad): cada camada desloca na proporção da distância.
 *   céu (longe) pouco · título (meio) mais · guindaste: o carro acompanha e a carga balança.
 * A telemetria não se move: o prumo precisa continuar alinhado com o contêiner.
 */
function initHeroPointer(heroEl, hero) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const sky = q('.hero__sky', heroEl);
  const lines = qa('.hero__lines', heroEl);
  const skyX = gsap.quickTo(sky, 'x', { duration: 1.4, ease: 'power3.out' });
  const skyY = gsap.quickTo(sky, 'y', { duration: 1.4, ease: 'power3.out' });
  const titleX = gsap.quickTo(lines, 'x', { duration: 1.1, ease: 'power3.out' });
  const titleY = gsap.quickTo(lines, 'y', { duration: 1.1, ease: 'power3.out' });
  const move = (nx, ny) => {
    skyX(nx * -12);
    skyY(ny * -8);
    titleX(nx * -24);
    titleY(ny * -10);
    hero.setPointer(nx);
  };
  heroEl.addEventListener('pointermove', (e) => move(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5), { passive: true });
  heroEl.addEventListener('pointerleave', () => move(0, 0));
}

/**
 * Rolagem do hero fixado. Cada camada anda num ritmo (profundidade):
 *   céu 0.6 · título 0.85 · telemetria · contêiner (física) · interface
 */
export function initHeroAnimation({ hero, setHeaderTheme }) {
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

  const { holdEnd, lowerEnd, approachEnd: doors } = HERO_PHASES;
  const wide = qa('.hero__lines--wide .line');
  const stack = qa('.hero__lines--stack .line');
  const ui = q('.hero__ui');

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl
    // Título (camada média): as linhas abrem caminho para a carga e afundam um pouco
    .to(wide[0], { xPercent: -18, duration: lowerEnd }, 0)
    .to(wide[1], { xPercent: 18, duration: lowerEnd }, 0)
    .to(stack, { xPercent: (i) => (i % 2 ? 24 : -24), duration: lowerEnd }, 0)
    .to('.hero__title', { yPercent: 6, duration: lowerEnd }, 0)
    // Interface (camada da frente): some antes da carga descer; cada bloco sobe no seu ritmo
    // (yPercent aqui, y/opacity na entrada: as duas animações não disputam a mesma propriedade)
    .to(ui, { autoAlpha: 0, duration: lowerEnd * 0.55 }, holdEnd * 0.4)
    .to(q('.hero__kicker', ui), { yPercent: -170, duration: lowerEnd * 0.6 }, 0)
    .to(q('.hero__coords', ui), { yPercent: -120, duration: lowerEnd * 0.6 }, 0)
    .to(q('.hero__lead', ui), { yPercent: -45, duration: lowerEnd * 0.6 }, 0)
    .to(q('.hero__scroll', ui), { yPercent: 120, duration: lowerEnd * 0.4 }, 0)
    .to('.hero__tag', { autoAlpha: 0, duration: 0.05 }, lowerEnd * 0.72)
    // Céu (fundo): quase parado, só desce um pouco (a escala é da entrada; aqui não disputa)
    .to('.hero__sky', { yPercent: 9, duration: doors }, 0)
    // Telemetria some quando o contêiner começa a girar para a câmera
    .to('.hero__hud', { autoAlpha: 0, duration: 0.05 }, lowerEnd + 0.02)
    .to('.hero__title', { autoAlpha: 0.12, scale: 0.9, transformOrigin: '50% 80%', duration: doors - lowerEnd }, lowerEnd)
    .to('.hero__sky', { filter: 'brightness(0.32)', duration: doors - lowerEnd }, lowerEnd)
    // As portas (DOM) assumem exatamente onde a face 3D cobre a tela
    .set('.hero__doors', { visibility: 'visible' }, doors)
    .set(['.hero__sky', '.hero__shade', '.hero__title', '.hero__gl', '.hero__cargo', '.hero__rope', '.hero__ui', '.hero__hud', '.hero__crane'], { autoAlpha: 0 }, doors)
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
    onToggle: (self) => {
      if (self.isActive) hero.start();
      else hero.stop();
      idleLoops.forEach((loop) => (self.isActive ? loop.resume() : loop.pause()));
    },
    onRefresh: () => hero.refresh(),
  });

  initHeroPointer(heroEl, hero);
}

