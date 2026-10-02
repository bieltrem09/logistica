/**
 * Geometria e "piloto" do contêiner do hero.
 * Lê o layout estático (.hero__cargo) para que a versão animada nasça exatamente
 * onde o vetor estava, e converte rolagem + velocidade em comandos para a física.
 */
import { CablePhysics } from './cable-physics.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Fases do hero fixado, em progresso da rolagem (0–1). */
export const HERO_PHASES = {
  holdEnd: 0.07, // o guindaste tensiona o cabo e o carro se reposiciona: a carga ainda não desce
  lowerEnd: 0.34, // contêiner desce balançando
  approachEnd: 0.6, // gira e vem até a câmera; as portas enchem a tela
};

export function createDriver() {
  const physics = new CablePhysics();
  const state = { progress: 0, vel: 0, velS: 0, introOffset: 0, pointer: 0 };
  const geom = {};

  /** Mede o layout estático (offset*: ignora transformações). */
  function measure(hero, cargo) {
    const W = hero.offsetWidth;
    const H = hero.offsetHeight;
    const w = cargo.offsetWidth;
    const cable = parseFloat(getComputedStyle(cargo).paddingTop) || 0;
    const cargoLeft = cargo.offsetLeft;
    const cargoTop = cargo.offsetTop;
    const restX = cargoLeft + w / 2;
    const pivotY = -0.1 * H;
    const hookY0 = cargoTop + cable + 0.08 * w;
    Object.assign(geom, {
      W,
      H,
      w,
      cable,
      cargoLeft,
      cargoTop,
      restX,
      pivotY,
      hookY0,
      L0: hookY0 - pivotY,
      l: 0.96 * w, // comprimento
      h: 0.4 * w, // altura
      d: 0.3866 * w, // profundidade
      sling: 0.282 * w, // lingas do gancho ao teto
      restCenterY: cargoTop + cable + 0.572 * w,
      g: 4.2 * H,
    });
    // Desce até perto da base da tela, sem sair dela (no celular o contêiner já começa baixo)
    geom.lowerPx = clamp(H * 0.9 - geom.restCenterY, H * 0.12, H * 0.4);
    return geom;
  }

  function update(dt) {
    const { holdEnd, lowerEnd, approachEnd } = HERO_PHASES;
    const p = state.progress;
    const pl = clamp((p - holdEnd) / (lowerEnd - holdEnd), 0, 1);
    const pa = clamp((p - lowerEnd) / (approachEnd - lowerEnd), 0, 1);
    const el = easeInOutSine(pl);

    // Velocidade da rolagem: suavizada e esquecida quando a rolagem para
    state.velS += (state.vel - state.velS) * Math.min(1, dt * 7);
    state.vel *= Math.pow(0.04, dt);

    // Antecipação: antes de descer, o cabo tensiona (a carga sobe um pouco) e o carro anda primeiro;
    // o contêiner só acompanha com atraso, como uma carga de verdade.
    const hold = smoothstep(0, holdEnd, p);
    const preload = 0.022 * geom.H * hold * (1 - smoothstep(holdEnd, holdEnd + 0.08, p));
    const lead = 0.035 * geom.W * hold * (1 - el);
    // Mouse: o operador desloca o carro do guindaste um pouco; a carga responde balançando.
    // Some quando o contêiner começa a vir para a câmera.
    const aim = state.pointer * 0.022 * geom.W * (1 - smoothstep(lowerEnd, approachEnd, p));

    const Lcmd = geom.L0 + state.introOffset - preload + el * geom.lowerPx;
    const targetX =
      geom.restX +
      lead +
      aim +
      Math.sin(Math.PI * el) * 0.1 * geom.W +
      clamp(-state.velS * 0.03, -0.09 * geom.W, 0.09 * geom.W);
    const targetZ = clamp(state.velS * 0.012, -0.06 * geom.H, 0.06 * geom.H);
    const psiTarget = 0.38 + el * 0.5; // portas à esquerda, girando para a câmera ao descer

    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      physics.step({ dt: h, Lcmd, targetX, targetZ, psiTarget, g: geom.g });
    }

    const { theta, phi, L } = physics;
    return {
      tx: physics.tx,
      tz: physics.tz,
      L,
      theta,
      phi,
      psi: physics.psi,
      alpha: physics.alpha,
      hx: physics.tx + L * Math.sin(theta),
      hy: geom.pivotY + L * Math.cos(theta) * Math.cos(phi),
      hz: L * Math.cos(theta) * Math.sin(phi),
      lower: el,
      hold,
      approach: easeInOutCubic(pa),
    };
  }

  return { physics, state, geom, measure, update };
}
