/**
 * Contêiner 3D do hero (Three.js).
 * Recebe a pose da física (js/hero-rig.js) e desenha: cabo principal, gancho,
 * quatro lingas e a caixa com texturas em canvas. Na fase de aproximação o
 * contêiner gira e vem até a câmera até a face das portas cobrir a tela inteira,
 * no mesmo enquadramento "cover" usado pelas portas em DOM da transição.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

const FOV = 34; // perspectiva mais aberta: vemos o contêiner de baixo, como na referência
const CAM_Z = 30;
const Y = new THREE.Vector3(0, 1, 0);

export function createHero3D({ canvas, textures }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  camera.position.set(0, 0, CAM_Z);

  scene.add(new THREE.HemisphereLight(0xf3f5f8, 0x2c2622, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(-6, 9, 12);
  scene.add(sun);

  const toTexture = (source) => {
    const t = new THREE.CanvasTexture(source);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  };

  const sideMat = new THREE.MeshLambertMaterial({ map: toTexture(textures.side) });
  const doorMat = new THREE.MeshBasicMaterial({ map: toTexture(textures.doors) });
  const frontMat = new THREE.MeshLambertMaterial({ map: toTexture(textures.front) });
  const roofMat = new THREE.MeshLambertMaterial({ map: toTexture(textures.roof) });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x3a1611 });

  // Ordem das faces do BoxGeometry: +x (frente cega), −x (portas, à esquerda), +y (teto), −y (piso), +z, −z (laterais)
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const box = new THREE.Mesh(unitBox, [frontMat, doorMat, roofMat, floorMat, sideMat, sideMat]);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(unitBox),
    new THREE.LineBasicMaterial({ color: 0x0c0c0c, transparent: true, opacity: 0.5 }),
  );

  const rig = new THREE.Group();
  const body = new THREE.Group();
  body.add(box, edges);
  rig.add(body);
  scene.add(rig);

  const steel = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
  const mainCable = new THREE.Mesh(cylinder, steel);
  scene.add(mainCable);
  const slings = Array.from({ length: 4 }, () => {
    const m = new THREE.Mesh(cylinder, steel);
    rig.add(m);
    return m;
  });
  const hookMat = new THREE.MeshLambertMaterial({ map: toTexture(textures.hook) });
  const hookBlock = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), hookMat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 10, 28), steel);
  rig.add(hookBlock, ring);

  // Estado de layout (mundo)
  let G = null;
  let k = 1;
  let hookY = 0;
  const target = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };

  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const qPhys = new THREE.Quaternion();
  const qa = new THREE.Quaternion();
  const physPos = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  const tagLocal = new THREE.Vector3(0.5, 0.25, 0.5);
  const tagWorld = new THREE.Vector3();

  const toWorld = (out, x, y, z = 0) => out.set((x - G.W / 2) * k, (G.H / 2 - y) * k, z * k);

  function placeCylinder(mesh, a, b, radius) {
    tmpDir.subVectors(b, a);
    const len = tmpDir.length();
    mesh.position.addVectors(a, b).multiplyScalar(0.5);
    mesh.scale.set(radius, Math.max(len, 1e-4), radius);
    mesh.quaternion.setFromUnitVectors(Y, tmpDir.normalize());
  }

  function layout(geom) {
    G = geom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(G.W, G.H, false);
    camera.aspect = G.W / G.H;
    camera.updateProjectionMatrix();

    const tanH = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    k = (2 * CAM_Z * tanH) / G.H;

    const l = G.l * k;
    const h = G.h * k;
    const d = G.d * k;
    const sling = G.sling * k;
    box.scale.set(l, h, d);
    edges.scale.set(l, h, d);
    body.position.set(0, -(sling + h / 2), 0);

    const corners = [
      [-0.47 * l, -sling, -0.43 * d],
      [0.47 * l, -sling, -0.43 * d],
      [-0.47 * l, -sling, 0.43 * d],
      [0.47 * l, -sling, 0.43 * d],
    ];
    tmpA.set(0, 0, 0);
    corners.forEach((c, i) => placeCylinder(slings[i], tmpA, tmpB.set(...c), 0.0028 * G.w * k));
    hookBlock.scale.set(0.05 * G.w * k, 0.062 * G.w * k, 0.034 * G.w * k);
    hookY = 0.044 * G.w * k;
    hookBlock.position.set(0, hookY, 0);
    ring.scale.setScalar(0.011 * G.w * k);
    ring.position.set(0, 0.002 * G.w * k, 0);

    // Alvo da aproximação: face das portas cobrindo a tela (mesma conta do "background-size: cover")
    const dist = Math.min(d / (2 * tanH * camera.aspect), h / (2 * tanH));
    const centerZ = CAM_Z - dist - l / 2;
    target.pos.set(0, sling + h / 2, centerZ);
    target.quat.setFromAxisAngle(Y, Math.PI / 2);
  }

  const axisX = new THREE.Vector3(1, 0, 0);
  const axisZ = new THREE.Vector3(0, 0, 1);

  function render(pose) {
    if (!G) return;
    const a = pose.approach;

    // Pose física: gancho e orientação (balanço, profundidade, giro, atraso)
    toWorld(physPos, pose.hx, pose.hy, pose.hz);
    qPhys.setFromAxisAngle(axisZ, pose.theta);
    qPhys.multiply(qa.setFromAxisAngle(axisX, -pose.phi));
    qPhys.multiply(qa.setFromAxisAngle(Y, pose.psi));
    qPhys.multiply(qa.setFromAxisAngle(axisZ, pose.alpha));

    rig.position.lerpVectors(physPos, target.pos, a);
    rig.quaternion.slerpQuaternions(qPhys, target.quat, a);

    toWorld(pivot, pose.tx, G.pivotY, pose.tz);
    placeCylinder(mainCable, pivot, rig.position, 0.0042 * G.w * k);

    // Movimento secundário: o gancho segue o cabo; lingas e contêiner atrasam (alpha) em relação a ele
    const lag = pose.alpha * (1 - a);
    hookBlock.position.set(0, hookY, 0).applyAxisAngle(axisZ, -lag);
    hookBlock.quaternion.setFromAxisAngle(axisZ, -lag);
    ring.quaternion.setFromAxisAngle(axisZ, -lag);

    // As portas ficam com a cor exata da textura quando cobrem a tela
    doorMat.color.setScalar(0.8 + 0.2 * a);

    renderer.render(scene, camera);
  }

  /** Ponto da etiqueta técnica (canto direito do contêiner), em px do hero. */
  function tagPoint() {
    if (!G) return null;
    tagWorld.copy(tagLocal);
    box.localToWorld(tagWorld);
    tagWorld.project(camera);
    return { x: ((tagWorld.x + 1) / 2) * G.W, y: ((1 - tagWorld.y) / 2) * G.H };
  }

  /** Centro da base do contêiner, em px do hero (prumo da telemetria). */
  const baseLocal = new THREE.Vector3(0, -0.5, 0);
  const baseWorld = new THREE.Vector3();
  function basePoint() {
    if (!G) return null;
    baseWorld.copy(baseLocal);
    box.localToWorld(baseWorld);
    baseWorld.project(camera);
    return { x: ((baseWorld.x + 1) / 2) * G.W, y: ((1 - baseWorld.y) / 2) * G.H };
  }

  function dispose() {
    renderer.dispose();
  }

  return { layout, render, tagPoint, basePoint, dispose };
}
