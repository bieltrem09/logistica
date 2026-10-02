/**
 * HERO — o contêiner suspenso desce com a rolagem.
 *
 * Estrutura → suporte → carga:
 *   carro do guindaste (fora da tela) → cabo principal → gancho → lingas → contêiner
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
 *   1. foto real recortada (assets/img/hero-container.png), se o arquivo existir
 *   2. contêiner 3D (Three.js), se houver WebGL
 *   3. vetor SVG de reserva
 */
import { createDriver, HERO_PHASES } from '../hero-rig.js';
import { q, qa, clamp, withTimeout, fmt } from './utils.js';

const { gsap, ScrollTrigger } = window;

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

  return {
    layout(geom) {
      G = geom;
      cargo.style.transformOrigin = `${G.w / 2}px ${G.hookY0 - G.cargoTop}px`;
      if (photo) {
        // As portas em DOM recebem a foto no mesmo enquadramento do fim da aproximação
        const cover = Math.max(G.W / G.l, G.H / G.h) * 1.08;
        const imgW = (G.l * cover) / 0.96;
        doors.style.setProperty('--door-size', `${imgW}px auto`);
        doors.style.setProperty('--door-pos', `${G.W / 2 - 0.5 * imgW}px ${G.H / 2 - 0.572 * imgW}px`);
      }
    },
    render(pose) {
      const a = pose.approach;
      const drop = G.restCenterY - G.hookY0; // gancho → centro do contêiner
      const cover = Math.max(G.W / G.l, G.H / G.h) * 1.08;
      const depth = 1 + pose.hz / (3 * G.H); // balanço em profundidade vira escala
      const dx = pose.hx - G.restX;
      const dy = pose.hy - G.hookY0;
      const fx = G.W / 2 - G.restX;
      const fy = G.H / 2 - drop * cover - G.hookY0;
      const tx = dx + (fx - dx) * a;
      const ty = dy + (fy - dy) * a;
      const rot = -(pose.theta + pose.alpha) * (1 - a);
      const sc = depth + (cover - depth) * a;
      cargo.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}rad) scale(${sc})`;

      const hx = G.restX + tx;
      const hy = G.hookY0 + ty;
      const len = Math.hypot(hx - pose.tx, hy - G.pivotY);
      const ang = Math.atan2(hy - G.pivotY, hx - pose.tx) - Math.PI / 2;
      rope.style.transform = `translate3d(${pose.tx}px, ${G.pivotY}px, 0) rotate(${ang}rad) scaleY(${len})`;

      const r = (drop + G.h / 2) * sc;
      base.x = hx - r * Math.sin(rot);
      base.y = hy + r * Math.cos(rot);
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
      const x0 = G.restX - half;
      const x1 = G.restX + half;
      const t = 0.035 * G.w;
      target.setAttribute(
        'd',
        `M${x0} ${ty - t}V${ty}H${x0 + t}M${x1} ${ty - t}V${ty}H${x1 - t}M${G.restX} ${ty - 0.6 * t}V${ty + 0.6 * t}`,
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

  let running = false;
  let tagH = tag ? tag.offsetHeight : 0;
  const tick = (time, deltaMs) => {
    const dt = clamp((deltaMs || 16.7) / 1000, 1 / 240, 1 / 20);
    const pose = driver.update(dt);
    if (driver.state.progress > HERO_PHASES.approachEnd + 0.02) return;
    view.render(pose, driver.geom);
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
    refresh() {
      driver.measure(heroEl, cargo);
      view.layout(driver.geom);
      hud?.layout(driver.geom);
      tagH = tag ? tag.offsetHeight : 0;
    },
    drop() {
      driver.physics.kick(0.9, 0.35, 0.7);
      return gsap.to(driver.state, { introOffset: 0, duration: 1.9, ease: 'power3.out' });
    },
  };
}

/** Entrada depois da porta de enrolar: título sobe, grade desce, interface chega. */
export function heroEntrance(hero) {
  const tl = gsap.timeline();
  qa('.hero__lines .line').forEach((line) => line.classList.add('is-masked'));
  tl.from(qa('.hero__lines .line__inner'), { yPercent: 120, duration: 1.4, ease: 'expo.out', stagger: 0.1 }, 0)
    .from(qa('.grid-overlay span'), { scaleY: 0, transformOrigin: '50% 0%', duration: 1.3, ease: 'expo.inOut', stagger: 0.03 }, 0)
    .from('.site-header', { yPercent: -110, duration: 1, ease: 'expo.out' }, 0.35)
    .from(qa('.hero__ui > :not(.hero__cta)'), { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, 0.5)
    .from('.hero__cta', { scale: 0, rotation: -140, duration: 1.1, ease: 'back.out(1.6)' }, 0.7)
    .from(qa('.hero__tag span'), { opacity: 0, x: -10, duration: 0.5, ease: 'power2.out', stagger: 0.08 }, 1.6);
  if (hero?.hud) {
    // O alvo de pouso "acende" depois que a carga chega e assenta
    tl.fromTo(hero.hud.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 1.5).from(
      q('.hud__target', hero.hud.el),
      { scale: 1.25, transformOrigin: '50% 50%', duration: 0.9, ease: 'expo.out' },
      1.5,
    );
  }
  if (hero) {
    hero.start();
    hero.drop();
  }
  return tl;
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
    // Céu (fundo): quase parado, só desce e cresce um pouco
    .to('.hero__sky', { yPercent: 9, scale: 1.06, duration: doors }, 0)
    // Telemetria some quando o contêiner começa a girar para a câmera
    .to('.hero__hud', { autoAlpha: 0, duration: 0.05 }, lowerEnd + 0.02)
    .to('.hero__title', { autoAlpha: 0.12, scale: 0.9, transformOrigin: '50% 80%', duration: doors - lowerEnd }, lowerEnd)
    .to('.hero__sky', { filter: 'brightness(0.32)', duration: doors - lowerEnd }, lowerEnd)
    // As portas (DOM) assumem exatamente onde a face 3D cobre a tela
    .set('.hero__doors', { visibility: 'visible' }, doors)
    .set(['.hero__sky', '.hero__shade', '.hero__title', '.hero__gl', '.hero__cargo', '.hero__rope', '.hero__ui', '.hero__hud'], { autoAlpha: 0 }, doors)
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

