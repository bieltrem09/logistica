/**
 * Geometria e "piloto" do contêiner do hero.
 * Lê o layout estático (.hero__cargo) para que a versão animada nasça exatamente
 * onde o vetor estava, e converte rolagem + velocidade em comandos para a física.
 */
import { CablePhysics } from './cable-physics.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Roteiro do hero fixado, em progresso da rolagem (0–1):
 *   0 → holdEnd       parado; a interface sai, a rota de chegada é desenhada e o guincho tensiona o cabo
 *   → lowerEnd        o contêiner desce: ganha velocidade, inclina, balança, corrige e segue
 *   → approachEnd     gira e vem até a câmera; as portas enchem a tela
 *   → doorsEnd        as portas abrem para a seção 01
 */
export const HERO_PHASES = {
  holdEnd: 0.18,
  lowerEnd: 0.56,
  approachEnd: 0.78,
  doorsEnd: 0.96,
};

/** Altura real de um contêiner 20′ (m): converte px em metros para a leitura de altura. */
export const CONTAINER_HEIGHT_M = 2.59;

export function createDriver() {
  const physics = new CablePhysics();
  const state = { progress: 0, vel: 0, velS: 0, introOffset: 0, time: 0 };
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
    // Desce até perto da base da tela sem sair dela (no celular o contêiner já começa baixo e desce pouco)
    geom.lowerPx = clamp(H * 0.95 - (geom.restCenterY + geom.h / 2), H * 0.05, H * 0.4);
    // Ponto de descarga: onde a base do contêiner chega no fim da descida
    geom.dropX = restX;
    geom.dropY = Math.min(geom.restCenterY + geom.lowerPx + geom.h * 0.5 + 0.035 * H, H * 0.965);
    return geom;
  }

  /** Progresso das fases para o progresso p da rolagem. */
  function phases(p) {
    const { holdEnd, lowerEnd, approachEnd } = HERO_PHASES;
    return {
      lower: easeInOutSine(clamp((p - holdEnd) / (lowerEnd - holdEnd), 0, 1)),
      approach: easeInOutCubic(clamp((p - lowerEnd) / (approachEnd - lowerEnd), 0, 1)),
      // Antes de descer, o guincho recolhe um palmo de cabo: o suporte reage primeiro
      take: Math.sin(Math.PI * clamp((p - holdEnd * 0.4) / (holdEnd * 1.2), 0, 1)),
    };
  }

  function update(dt) {
    state.time += dt;
    const { lower: el, approach, take } = phases(state.progress);

    // Velocidade da rolagem: suavizada e esquecida quando a rolagem para
    state.velS += (state.vel - state.velS) * Math.min(1, dt * 7);
    state.vel *= Math.pow(0.04, dt);

    // Vento: um balanço mínimo mantém a carga viva mesmo com o hero parado
    const t = state.time;
    const wind = (Math.sin(t * 0.83) * 0.6 + Math.sin(t * 0.31 + 1.3) * 0.4) * 0.0035 * geom.W * (1 - approach);

    const Lcmd = geom.L0 + state.introOffset + el * geom.lowerPx - take * 0.018 * geom.H;
    const targetX =
      geom.restX +
      Math.sin(Math.PI * el) * 0.065 * geom.W +
      wind +
      clamp(-state.velS * 0.03, -0.05 * geom.W, 0.05 * geom.W);
    const targetZ = clamp(state.velS * 0.012, -0.06 * geom.H, 0.06 * geom.H);
    const psiTarget = 0.38 + el * 0.5; // portas à esquerda, girando para a câmera ao descer

    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      physics.step({ dt: h, Lcmd, targetX, targetZ, psiTarget, g: geom.g, slack: 0.045 * geom.w });
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
      sy: physics.sy,
      hx: physics.tx + L * Math.sin(theta),
      hy: geom.pivotY + L * Math.cos(theta) * Math.cos(phi),
      hz: L * Math.cos(theta) * Math.sin(phi),
      lower: el,
      approach,
    };
  }

  return { physics, state, geom, measure, update, phases };
}
