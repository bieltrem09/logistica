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

  /**
   * Forma da carga quando é foto (lida dos data-* do <img>, em frações da imagem):
   *   hook  ponto onde o cabo entra no moitão · box  silhueta do contêiner
   *   cover retângulo todo opaco que enche a tela quando o contêiner vem para a câmera
   * Sem forma, valem as proporções do contêiner vetorial/3D.
   */
  let shape = null;
  function setShape(s) {
    shape = s;
  }

  /** Mede o layout estático (offset*: ignora transformações). */
  function measure(hero, cargo) {
    const W = hero.offsetWidth;
    const H = hero.offsetHeight;
    const w = cargo.offsetWidth;
    const cable = parseFloat(getComputedStyle(cargo).paddingTop) || 0;
    const cargoLeft = cargo.offsetLeft;
    const cargoTop = cargo.offsetTop;
    const imgTop = cargoTop + cable;
    Object.assign(geom, { W, H, w, cable, cargoLeft, cargoTop, g: 4.2 * H, d: 0.3866 * w, sling: 0.282 * w });

    if (shape) {
      const ih = w * shape.ratio;
      const [bx0, by0, bx1, by1] = shape.box;
      const [cx0, cy0, cx1, cy1] = shape.cover;
      Object.assign(geom, {
        restX: cargoLeft + shape.hook[0] * w,
        hookY0: imgTop + shape.hook[1] * ih,
        hookLocal: { x: shape.hook[0] * w, y: shape.hook[1] * ih },
        imgH: ih,
        l: (bx1 - bx0) * w,
        h: (by1 - by0) * ih,
        boxCX: cargoLeft + ((bx0 + bx1) / 2) * w,
        restCenterY: imgTop + ((by0 + by1) / 2) * ih,
        coverW: (cx1 - cx0) * w,
        coverH: (cy1 - cy0) * ih,
        coverCX: cargoLeft + ((cx0 + cx1) / 2) * w,
        coverCY: imgTop + ((cy0 + cy1) / 2) * ih,
      });
    } else {
      const restX = cargoLeft + w / 2;
      const restCenterY = imgTop + 0.572 * w;
      Object.assign(geom, {
        restX,
        hookY0: imgTop + 0.08 * w,
        hookLocal: { x: w / 2, y: 0.08 * w },
        imgH: 0.78 * w,
        l: 0.96 * w, // comprimento
        h: 0.4 * w, // altura
        boxCX: restX,
        restCenterY,
        coverW: 0.96 * w,
        coverH: 0.4 * w,
        coverCX: restX,
        coverCY: restCenterY,
      });
    }

    // Guindaste: na carga da página ele inteiro (com o gancho auxiliar pendurado) fica acima da tela
    const header = document.querySelector('.site-header')?.offsetHeight || 0;
    const crane = document.querySelector('.hero__crane');
    let below = 0;
    let anchorDown = 0;
    if (crane && crane.offsetHeight) {
      const ay = crane.offsetHeight * (parseFloat(getComputedStyle(crane).getPropertyValue('--crane-ay')) || 0.85);
      let bottom = crane.offsetHeight;
      const aux = crane.querySelector('.hero__crane-hook');
      if (aux && aux.offsetHeight) bottom = Math.max(bottom, aux.offsetTop + aux.offsetHeight);
      below = bottom - ay;
      anchorDown = ay;
    }
    geom.pivotY = Math.min(-0.1 * H, -(below + 12));
    geom.L0 = geom.hookY0 - geom.pivotY;

    // Desce até a base do contêiner chegar perto do pé da tela
    geom.lowerPx = clamp(H * 0.94 - (geom.restCenterY + geom.h / 2), H * 0.1, H * 0.4);
    // A lança desce junto e no fim a cabeça aparece abaixo do cabeçalho. Se a carga desce pouco
    // (celular), a lança desce mais e recolhe o cabo na diferença.
    geom.boomDrop = Math.max(geom.lowerPx, header + Math.min(anchorDown, 0.1 * H) + 0.03 * H - geom.pivotY);
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
    // Deriva lateral leve e sempre no mesmo sentido: descendo, o carro volta ao centro; subindo,
    // vai para fora. Assim o lado do balanço acompanha o sentido da rolagem.
    const lead = 0.06 * geom.W * hold * (1 - el);
    // Mouse: o operador desloca o carro do guindaste um pouco; a carga responde balançando.
    // Some quando o contêiner começa a vir para a câmera.
    const aim = state.pointer * 0.022 * geom.W * (1 - smoothstep(lowerEnd, approachEnd, p));

    // Lança basculante: é o ponto de suspensão que desce (a carga vai junto); o cabo só
    // recolhe se a lança precisar descer mais que a carga (celular)
    const py = geom.pivotY + el * geom.boomDrop;
    const Lcmd = geom.L0 + state.introOffset - preload - el * (geom.boomDrop - geom.lowerPx);
    // Rolagem rápida empurra o carro contra o sentido da rolagem: a carga fica para trás e,
    // quando a rolagem inverte, balança para o outro lado
    const targetX = geom.restX + lead + aim + clamp(-state.velS * 0.05, -0.05 * geom.W, 0.05 * geom.W);
    const targetZ = clamp(state.velS * 0.01, -0.04 * geom.H, 0.04 * geom.H);
    const psiTarget = 0.38 + el * 0.5; // portas à esquerda, girando para a câmera ao descer

    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    const py0 = state.py ?? py;
    for (let i = 0; i < steps; i += 1) {
      // a lança anda suave entre os subpassos (sem degrau de velocidade a cada quadro)
      physics.step({ dt: h, Lcmd, targetX, targetZ, psiTarget, g: geom.g, py: py0 + ((py - py0) * (i + 1)) / steps });
    }
    state.py = py;

    const { theta, phi, L } = physics;
    const approach = easeInOutCubic(pa);
    // Ponta da lança como se vê: cede um pouco quando o cabo estica (a carga freando puxa)
    // e sobe para fora do quadro quando o contêiner vem para a câmera
    const sag = clamp(physics.ext * 0.12, -6, 10);
    const lift = approach * (py + 0.35 * geom.H);
    return {
      tx: physics.tx,
      tz: physics.tz,
      L,
      theta,
      phi,
      psi: physics.psi,
      alpha: physics.alpha,
      hx: physics.tx + L * Math.sin(theta),
      py: py + sag - lift,
      ext: physics.ext,
      hy: py + L * Math.cos(theta) * Math.cos(phi),
      hz: L * Math.cos(theta) * Math.sin(phi),
      lower: el,
      hold,
      approach,
    };
  }

  return { physics, state, geom, measure, update, setShape };
}
