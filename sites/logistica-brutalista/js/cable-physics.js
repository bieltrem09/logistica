/**
 * Física do contêiner pendurado no cabo (sem dependências).
 *
 * Modelo: pêndulo com ponto de suspensão móvel (o carro do guindaste).
 *  - theta: balanço no plano da tela        - phi: balanço em profundidade
 *  - psi:   giro do contêiner em torno do cabo
 *  - alpha: atraso angular do contêiner em relação ao gancho (dá peso ao movimento)
 *  - sy:    folga das lingas: o contêiner segue o gancho na vertical com atraso
 *  - ext:   elasticidade do cabo (o "quique" quando a descida para)
 * Estrutura → suporte → carga: o carro puxa o cabo, o cabo puxa o gancho e o
 * gancho, por último, arrasta o contêiner. Cada elo responde um pouco depois.
 * Unidades em pixels e segundos. O carro segue o alvo com uma mola crítica;
 * a aceleração dele é o que faz a carga balançar, como num guindaste real.
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export class CablePhysics {
  constructor() {
    this.reset();
  }

  reset() {
    this.theta = 0;
    this.omega = 0;
    this.phi = 0;
    this.phiV = 0;
    this.psi = 0.38;
    this.psiV = 0;
    this.alpha = 0;
    this.alphaV = 0;
    this.ext = 0;
    this.extV = 0;
    this.sy = 0;
    this.syV = 0;
    this.tx = null;
    this.txV = 0;
    this.tz = 0;
    this.tzV = 0;
    this.lPrev = null;
    this.lVel = 0;
    this.L = 0;
  }

  /** Empurrão extra (entrada, solavancos). */
  kick(omega = 0, phiV = 0, psiV = 0) {
    this.omega += omega;
    this.phiV += phiV;
    this.psiV += psiV;
  }

  /**
   * @param {object} p
   * @param {number} p.dt        passo em segundos
   * @param {number} p.Lcmd      comprimento comandado do cabo (px)
   * @param {number} p.targetX   posição alvo do carro do guindaste (px)
   * @param {number} p.targetZ   alvo em profundidade (px, positivo = para a câmera)
   * @param {number} p.psiTarget giro alvo (rad)
   * @param {number} p.g         gravidade (px/s²)
   * @param {number} p.slack     folga máxima das lingas (px)
   */
  step({ dt, Lcmd, targetX, targetZ, psiTarget, g, slack = 0 }) {
    if (this.tx === null) {
      this.tx = targetX;
      this.lPrev = Lcmd;
    }

    // Carro do guindaste (mola crítica): sua aceleração excita o balanço
    const kT = 48;
    const cT = 2 * Math.sqrt(kT);
    const ax = kT * (targetX - this.tx) - cT * this.txV;
    this.txV += ax * dt;
    this.tx += this.txV * dt;

    const az = kT * (targetZ - this.tz) - cT * this.tzV;
    this.tzV += az * dt;
    this.tz += this.tzV * dt;

    // Velocidade e aceleração do comando do cabo
    const lVel = (Lcmd - this.lPrev) / dt;
    const lAcc = clamp((lVel - this.lVel) / dt, -30000, 30000);
    this.lPrev = Lcmd;
    this.lVel = lVel;

    // Cabo elástico: quando a descida freia, a carga quica
    const kE = 150;
    const cE = 4.6;
    const extA = -kE * this.ext - cE * this.extV - lAcc * 0.5;
    this.extV += extA * dt;
    this.ext = clamp(this.ext + this.extV * dt, -0.18 * Lcmd, 0.18 * Lcmd);

    // Lingas: quando o gancho acelera para baixo o contêiner fica para trás e depois alcança
    const hookAcc = clamp(lAcc + extA, -30000, 30000);
    const syA = -110 * this.sy - 6 * this.syV - 1.5 * hookAcc;
    this.syV += syA * dt;
    this.sy = clamp(this.sy + this.syV * dt, -slack, slack);
    if (Math.abs(this.sy) >= slack) this.syV *= 0.5; // a linga estica até o limite e devolve

    const L = Math.max(60, Lcmd + this.ext);
    // Encurtar o cabo bombeia o balanço (conservação do momento angular): limitado para não disparar
    const lRate = clamp((lVel + this.extV) / L, -0.22, 2.5);

    // Balanço no plano da tela
    const thA =
      -(g / L) * Math.sin(this.theta) -
      (ax / L) * Math.cos(this.theta) -
      2 * lRate * this.omega -
      0.95 * this.omega;
    this.omega += thA * dt;
    this.theta = clamp(this.theta + this.omega * dt, -0.45, 0.45);

    // Balanço em profundidade (aparece pela perspectiva)
    const phA =
      -(g / L) * Math.sin(this.phi) -
      (az / L) * Math.cos(this.phi) -
      2 * lRate * this.phiV -
      0.85 * this.phiV;
    this.phiV += phA * dt;
    this.phi = clamp(this.phi + this.phiV * dt, -0.6, 0.6);

    // Giro em torno do cabo, acoplado ao balanço
    const psA = -3.2 * (this.psi - psiTarget) - 1.15 * this.psiV + 0.9 * this.omega;
    this.psiV += psA * dt;
    this.psi += this.psiV * dt;

    // Atraso do contêiner abaixo do gancho
    const alA = -26 * this.alpha - 2.8 * this.alphaV - 0.5 * thA;
    this.alphaV += alA * dt;
    this.alpha = clamp(this.alpha + this.alphaV * dt, -0.35, 0.35);

    this.L = L;
  }
}
