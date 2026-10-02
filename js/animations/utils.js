/**
 * Ajudantes compartilhados pela camada de movimento.
 * Sem dependências: GSAP e plugins são lidos de window no momento da chamada.
 */

export const q = (sel, root = document) => root.querySelector(sel);
export const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const withTimeout = (promise, ms) =>
  Promise.race([promise, wait(ms).then(() => Promise.reject(new Error(`timeout ${ms}ms`)))]);

/** Número no formato brasileiro (12.000 · 98,7), com zeros à esquerda opcionais. */
export const fmt = (n, { pad = 0, decimals = 0 } = {}) => {
  const s = Number(n).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return pad ? s.padStart(pad, '0') : s;
};

export const vh = () => window.innerHeight;

/**
 * Perfil de velocidade de um veículo: acelera, segue em cruzeiro e freia.
 * pos(t) é a integral de vel(t), então a distância percorrida e a velocidade
 * mostrada na telemetria contam a mesma história.
 * @param {number} a fração do trajeto acelerando
 * @param {number} d fração do trajeto freando
 */
export function trapezoid(a = 0.25, d = 0.25) {
  const area = 1 - a / 2 - d / 2;
  return {
    vel(t) {
      if (t <= 0 || t >= 1) return 0;
      if (t < a) return t / a;
      if (t > 1 - d) return (1 - t) / d;
      return 1;
    },
    pos(t) {
      const x = clamp(t, 0, 1);
      let s;
      if (x < a) s = (x * x) / (2 * a);
      else if (x <= 1 - d) s = a / 2 + (x - a);
      else s = a / 2 + (1 - d - a) + d / 2 - ((1 - x) * (1 - x)) / (2 * d);
      return s / area;
    },
  };
}

/**
 * Mola amortecida que persegue um alvo (inércia + overshoot).
 * Roda no ticker do GSAP só enquanto está em movimento.
 */
export function createSpring({ value = 0, stiffness = 120, damping = 14, onUpdate }) {
  const { gsap } = window;
  const s = { x: value, v: 0, target: value, running: false };
  const tick = (time, deltaMs) => {
    const dt = clamp((deltaMs || 16.7) / 1000, 1 / 240, 1 / 30);
    const steps = Math.ceil(dt / (1 / 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      const a = stiffness * (s.target - s.x) - damping * s.v;
      s.v += a * h;
      s.x += s.v * h;
    }
    onUpdate(s.x, s.v);
    if (Math.abs(s.target - s.x) < 1e-4 && Math.abs(s.v) < 1e-4) {
      s.x = s.target;
      s.v = 0;
      onUpdate(s.x, s.v);
      gsap.ticker.remove(tick);
      s.running = false;
    }
  };
  return {
    get value() {
      return s.x;
    },
    get velocity() {
      return s.v;
    },
    set(target) {
      s.target = target;
      if (!s.running) {
        s.running = true;
        gsap.ticker.add(tick);
      }
    },
    jump(value) {
      s.x = value;
      s.target = value;
      s.v = 0;
      onUpdate(s.x, s.v);
    },
    kick(v) {
      s.v += v;
      this.set(s.target);
    },
  };
}

/**
 * Coloca um elemento sobre um <path> SVG (mesmas coordenadas em px do pai)
 * e devolve o ângulo da tangente em graus.
 */
export function pointOnPath(path, len, t) {
  const l = clamp(t, 0, 1) * len;
  const p = path.getPointAtLength(l);
  const a = path.getPointAtLength(Math.max(0, l - 2));
  const b = path.getPointAtLength(Math.min(len, l + 2));
  return { x: p.x, y: p.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}
