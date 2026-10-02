/**
 * Física do contêiner pendurado no cabo (sem dependências).
 *
 * Modelo: pêndulo com ponto de suspensão móvel (o carro do guindaste).
 *  - theta: balanço no plano da tela        - phi: balanço em profundidade
 *  - psi:   giro do contêiner em torno do cabo
 *  - alpha: atraso do contêiner em relação ao gancho (dá peso ao movimento)
 *  - ext:   elasticidade do cabo (o "quique" quando a descida para)
 * Unidades em pixels e segundos. O carro segue o alvo com uma mola crítica;
 * a aceleração dele é o que faz a carga balançar, como num guindaste real.
 * O ponto de suspensão também pode subir e descer (lança basculante, `py`): acelerar
 * a lança para baixo alivia a gravidade sentida pela carga e frear estica o cabo.
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
    this.tx = null;
    this.txV = 0;
    this.tz = 0;
    this.tzV = 0;
    this.lPrev = null;
    this.lVel = 0;
    this.pyPrev = null;
    this.pyVel = 0;
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
   * @param {number} [p.py]      altura do ponto de suspensão (px, para baixo é positivo)
   */
  step({ dt, Lcmd, targetX, targetZ, psiTarget, g, py = 0 }) {
    if (this.tx === null) {
      this.tx = targetX;
      this.lPrev = Lcmd;
    }
    if (this.pyPrev === null) this.pyPrev = py;

    // Lança descendo: a aceleração vertical do ponto de suspensão muda a gravidade sentida
    const pyVel = (py - this.pyPrev) / dt;
    const pyAcc = clamp((pyVel - this.pyVel) / dt, -30000, 30000);
    this.pyPrev = py;
    this.pyVel = pyVel;
    const gEff = Math.max(0.25 * g, g - pyAcc);

    // Carro do guindaste (mola crítica): sua aceleração excita o balanço. Macio de propósito:
    // carro de guindaste não dá tranco, e a carga pesada responde com balanço curto
    const kT = 9;
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
    const extA = -kE * this.ext - cE * this.extV - (lAcc + pyAcc) * 0.5;
    this.extV += extA * dt;
    this.ext = clamp(this.ext + this.extV * dt, -0.18 * Lcmd, 0.18 * Lcmd);

    const L = Math.max(60, Lcmd + this.ext);
    const lRate = clamp((lVel + this.extV) / L, -0.6, 2.5);

    // Balanço no plano da tela
    const thA =
      -(gEff / L) * Math.sin(this.theta) -
      (ax / L) * Math.cos(this.theta) -
      2 * lRate * this.omega -
      1.1 * this.omega; // amortecimento: assenta em ~3 s depois que a rolagem para
    this.omega += thA * dt;
    this.theta = clamp(this.theta + this.omega * dt, -0.42, 0.42);

    // Balanço em profundidade (aparece pela perspectiva)
    const phA =
      -(gEff / L) * Math.sin(this.phi) -
      (az / L) * Math.cos(this.phi) -
      2 * lRate * this.phiV -
      1.2 * this.phiV;
    this.phiV += phA * dt;
    this.phi = clamp(this.phi + this.phiV * dt, -0.4, 0.4);

    // Giro em torno do cabo, acoplado ao balanço
    const psA = -3.2 * (this.psi - psiTarget) - 1.15 * this.psiV + 0.9 * this.omega;
    this.psiV += psA * dt;
    this.psi += this.psiV * dt;

    // Atraso do contêiner abaixo do gancho
    const alA = -26 * this.alpha - 2.8 * this.alphaV - 0.35 * thA;
    this.alphaV += alA * dt;
    this.alpha = clamp(this.alpha + this.alphaV * dt, -0.18, 0.18);

    this.L = L;
  }
}
