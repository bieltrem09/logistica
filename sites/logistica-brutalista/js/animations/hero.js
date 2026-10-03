/**
 * HERO — o contêiner é a carga da página.
 *
 * Estrutura → suporte → carga: o carro do guindaste (fora da tela) puxa o cabo,
 * o cabo puxa o gancho e o gancho arrasta o contêiner com atraso (js/cable-physics.js).
 * A rolagem comanda o roteiro (HERO_PHASES em js/hero-rig.js):
 *   parado → o guincho tensiona → desce balançando → gira para a câmera → as portas abrem a seção 01.
 * Profundidade: céu quase parado, título em velocidade média, linhas presas ao chão,
 * contêiner com o movimento principal e o gancho com o secundário.
 * Linhas: rota de chegada (mar → Santos), prumo até o ponto de descarga com a altura
 * em metros e a rota de saída (Santos → 27 UF), desenhadas conforme a rolagem.
 */
import { createDriver, HERO_PHASES, CONTAINER_HEIGHT_M } from '../hero-rig.js';
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

/** Reserva sem WebGL: o mesmo movimento aplicado ao vetor do contêiner. */
function createHero2D(cargo) {
  let G;
  let base = null;
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
      const rot = -(pose.theta + pose.alpha * 0.6) * (1 - a);
      cargo.style.transform = `translate3d(${tx}px, ${ty + pose.sy * (1 - a)}px, 0) rotate(${rot}rad) scale(${1 + (cover - 1) * a})`;
      const reach = G.sling + G.h + pose.sy;
      base = { x: pose.hx + reach * Math.sin(pose.theta), y: pose.hy + reach * Math.cos(pose.theta) };
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
 * Linhas técnicas do hero. Tudo em px do hero (viewBox = tamanho do hero),
 * atualizado só com atributos/transform — nada de layout por quadro.
 */
function createRouteFx(root) {
  const svg = q('.hero__fx-svg', root);
  const plan = q('.hero__route--plan', root);
  const routeIn = q('.hero__route--in', root);
  const routeOut = q('.hero__route--out', root);
  const guide = q('.hero__guide', root);
  const target = q('.hero__target', root);
  const alt = q('.hero__alt', root);
  const altValue = q('b', alt);
  const nodeDrop = q('.hero__node--drop', root);
  const nodeEnd = q('.hero__node--end', root);
  let G = null;
  let lastAlt = '';
  let altW = 0;

  return {
    layout(geom) {
      G = geom;
      const { W, H, dropX: x, dropY: y } = G;
      const narrow = W < 768;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      // Chegada pelo mar (esquerda) → ponto de descarga → saída para o país (direita)
      const yIn = y - (narrow ? 0.05 : 0.11) * H;
      const yOut = narrow ? y - 0.16 * H : 0.62 * H;
      const dIn = `M ${-0.02 * W} ${yIn} C ${0.18 * W} ${yIn}, ${x - 0.2 * W} ${y}, ${x} ${y}`;
      const dOut = `M ${x} ${y} C ${x + 0.16 * W} ${y}, ${W - 0.22 * W} ${yOut}, ${1.02 * W} ${yOut}`;
      plan.setAttribute('d', `${dIn} ${dOut.replace(/^M [^C]+/, '')}`);
      routeIn.setAttribute('d', dIn);
      routeOut.setAttribute('d', dOut);
      gsap.set(target, { x, y });
      gsap.set(nodeDrop, { x: x + 22, y: y - nodeDrop.offsetHeight / 2 });
      gsap.set(nodeEnd, { x: W - nodeEnd.offsetWidth - (narrow ? 12 : 0.03 * W), y: yOut - nodeEnd.offsetHeight - 10 });
      altW = alt.offsetWidth;
    },
    /** Prumo: da base do contêiner ao ponto de descarga, com a altura que falta. */
    update(base) {
      if (!G || !base) return;
      const { dropX, dropY, h } = G;
      const y1 = base.y + 6;
      const gap = dropY - y1;
      const show = gap > 18;
      guide.setAttribute('x1', base.x);
      guide.setAttribute('y1', y1);
      guide.setAttribute('x2', dropX);
      guide.setAttribute('y2', show ? dropY - 14 : y1);
      const meters = Math.max(0, ((dropY - base.y) / h) * CONTAINER_HEIGHT_M);
      const text = fmt(meters, 0, 1);
      if (text !== lastAlt) {
        lastAlt = text;
        altValue.textContent = text;
      }
      const mx = (base.x + dropX) / 2;
      const my = (y1 + dropY) / 2;
      const side = mx + 14 + altW > G.W - 8 ? -altW - 14 : 14;
      alt.style.transform = `translate3d(${mx + side}px, ${my - 12}px, 0)`;
      alt.style.opacity = show ? '' : '0';
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
  const fx = createRouteFx(q('.hero__fx'));

  let view = null;
  let is3d = false;
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
  if (!view) view = createHero2D(cargo);
  view.layout(driver.geom);
  fx.layout(driver.geom);

  let running = false;
  let tagH = tag ? tag.offsetHeight : 0;
  const tick = (time, deltaMs) => {
    const dt = clamp((deltaMs || 16.7) / 1000, 1 / 240, 1 / 20);
    const pose = driver.update(dt);
    if (driver.state.progress > HERO_PHASES.approachEnd + 0.02) return;
    view.render(pose, driver.geom);
    if (pose.approach < 0.5) fx.update(view.basePoint());
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
      fx.layout(driver.geom);
      tagH = tag ? tag.offsetHeight : 0;
    },
    /** O contêiner chega pendurado de cima e se acomoda no cabo. */
    drop() {
      driver.physics.kick(0.9, 0.35, 0.7);
      return gsap.to(driver.state, { introOffset: 0, duration: 1.9, ease: 'power3.out' });
    },
    /** A rota planejada aparece, o ponto de descarga marca o chão. */
    revealRoute() {
      return gsap
        .timeline()
        .fromTo('.hero__fx-svg', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' })
        .from('.hero__target', { scale: 0, duration: 0.7, ease: 'back.out(2)' }, 0.7)
        .from(qa('.hero__node, .hero__alt'), { opacity: 0, y: 8, duration: 0.6, ease: 'power3.out', stagger: 0.1 }, 0.9)
        .set('.hero__fx-svg', { clearProps: 'clipPath' });
    },
  };
}

/**
 * initHeroAnimation — monta o contêiner (3D ou 2D), as linhas e a linha do tempo da rolagem.
 * Devolve o controlador do hero (ou null) para a entrada usar.
 */
export async function initHeroAnimation({ textures, setHeaderTheme }) {
  const heroEl = q('.hero');
  const spacer = q('.hero-spacer');
  let hero = null;
  try {
    hero = await setupHero(textures);
  } catch (err) {
    console.warn('[vetor] hero animado indisponível:', err);
  }
  if (!hero) {
    spacer.style.display = 'none';
    return null;
  }

  // Duas telas de rolagem por baixo do hero fixado: a seção 01 sobe enquanto as portas abrem
  const sizeSpacer = () => {
    spacer.style.height = `${Math.round(heroEl.offsetHeight * 2)}px`;
  };
  sizeSpacer();
  ScrollTrigger.addEventListener('refreshInit', sizeSpacer);

  const { holdEnd: hold, lowerEnd: lower, approachEnd: doors, doorsEnd } = HERO_PHASES;
  const wide = qa('.hero__lines--wide .line');
  const stack = qa('.hero__lines--stack .line');
  const swing = doorsEnd - doors;
  // Porta pesada: destrava (folga de poucos graus) e depois abre ganhando velocidade
  const doorSwing = (dir) => ({
    '0%': { rotationY: 0, '--shade': 0 },
    '10%': { rotationY: 4 * dir, '--shade': 0.05 },
    '100%': { rotationY: 100 * dir, '--shade': 0.6 },
    easeEach: 'power1.in',
  });

  const tl = gsap.timeline({ defaults: { ease: 'none' } });

  // 1 · Parado: a interface sai em velocidades diferentes; a carga ainda não se mexe
  tl.to('.hero__kicker, .hero__coords', { y: -36, autoAlpha: 0, duration: hold * 0.7 }, 0)
    .to('.hero__lead', { y: -80, autoAlpha: 0, duration: hold * 0.85 }, 0)
    .to('.hero__cta', { yPercent: -110, rotation: 30, autoAlpha: 0, duration: hold }, 0)
    .to('.hero__scroll', { autoAlpha: 0, duration: hold * 0.4 }, 0)
    .to('.hero__route--in', { strokeDashoffset: 0, autoRound: false, duration: hold * 0.9 }, hold * 0.05);

  // 2 · Profundidade: céu quase parado, título em velocidade média, contêiner é o protagonista
  tl.to('.hero__sky', { yPercent: -3, duration: lower }, 0)
    // no celular a descida é curta: o título sobe mais, como uma câmera acompanhando a carga
    .to('.hero__title', { yPercent: () => (window.innerWidth < 768 ? -16 : -6), duration: lower }, 0)
    .to(wide[0], { xPercent: -18, duration: lower - hold * 0.5 }, hold * 0.5)
    .to(wide[1], { xPercent: 18, duration: lower - hold * 0.5 }, hold * 0.5)
    .to(stack, { xPercent: (i) => (i % 2 ? 24 : -24), duration: lower - hold * 0.5 }, hold * 0.5)
    // 3 · Descida: a rota de saída é desenhada enquanto a carga desce
    .to('.hero__route--out', { strokeDashoffset: 0, autoRound: false, duration: lower - hold }, hold)
    .to('.hero__tag', { autoAlpha: 0, duration: 0.03 }, hold + (lower - hold) * 0.6);

  // 4 · Aproximação: a câmera encosta na carga, o cenário escurece e as linhas ficam para trás
  tl.to('.hero__fx', { autoAlpha: 0, scale: 1.3, transformOrigin: '50% 80%', duration: (doors - lower) * 0.45 }, lower)
    .to('.hero__title', { autoAlpha: 0.12, scale: 0.9, transformOrigin: '50% 80%', duration: doors - lower }, lower)
    .to('.hero__dim', { opacity: 0.68, duration: doors - lower }, lower);

  // 5 · Portas: o DOM assume exatamente onde a face 3D cobre a tela e abre para a seção 01
  tl.set('.hero__doors', { visibility: 'visible' }, doors)
    .set(['.hero__sky', '.hero__shade', '.hero__dim', '.hero__title', '.hero__fx', '.hero__gl', '.hero__cargo', '.hero__ui'], { autoAlpha: 0 }, doors)
    .to('.door--left', { keyframes: doorSwing(-1), duration: swing * 0.94 }, doors + 0.01)
    .to('.door--right', { keyframes: doorSwing(1), duration: swing * 0.94 }, doors + 0.014)
    .fromTo('.hero__doors', { scale: 1 }, { scale: 1.12, duration: swing, ease: 'power1.in' }, doors)
    .to('.hero__doors', { autoAlpha: 0, duration: 0.025 }, doorsEnd - 0.02)
    .set({}, {}, 1);

  ScrollTrigger.create({
    trigger: heroEl,
    start: 'top top',
    end: () => `+=${spacer.offsetHeight + heroEl.offsetHeight}`,
    pin: true,
    pinSpacing: false,
    scrub: true,
    invalidateOnRefresh: true,
    animation: tl,
    onUpdate: (self) => {
      hero.setProgress(self.progress);
      hero.setVelocity(self.getVelocity());
      setHeaderTheme(self.progress > doors + swing * 0.6 ? 'light' : 'dark');
    },
    onToggle: (self) => (self.isActive ? hero.start() : hero.stop()),
    onRefresh: () => hero.refresh(),
  });

  return hero;
}
