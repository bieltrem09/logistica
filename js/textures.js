/**
 * Texturas do contêiner desenhadas em canvas 2D, com o mesmo desenho do vetor do hero.
 * Usadas nas faces da caixa 3D (js/hero-3d.js) e nas portas em DOM da transição.
 * Proporções (largura do contêiner = 1): comprimento 0.96, altura 0.40, profundidade 0.3866.
 */

const C = {
  orange: '#FF4D1A',
  rail: '#D23C0E',
  sill: '#BC350C',
  rib: '#E0400F',
  ribHi: '#FF7A50',
  ribEdge: '#C7360B',
  cast: '#231510',
  ink: '#0C0C0C',
  white: '#F7F7F7',
  steel: '#33373B',
  steelHi: '#7A8086',
  hazard: '#F2C200',
};

const DISPLAY = '"Anton", Impact, "Arial Narrow", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Escorridos de sujeira: dão realismo sem sair da paleta */
function grime(ctx, w, h, seed, strength = 1) {
  const rnd = seeded(seed);
  for (let i = 0; i < 28; i += 1) {
    const x = rnd() * w;
    const width = 6 + rnd() * w * 0.03;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(12,12,12,0)');
    g.addColorStop(0.15 + rnd() * 0.6, `rgba(12,12,12,${(0.03 + rnd() * 0.06) * strength})`);
    g.addColorStop(1, 'rgba(12,12,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, width, h);
  }
}

function castings(ctx, w, h, cw, ch) {
  [[0, 0], [w - cw, 0], [0, h - ch], [w - cw, h - ch]].forEach(([x, y]) => {
    ctx.fillStyle = C.cast;
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = C.ink;
    roundRect(ctx, x + cw * 0.2, y + ch * 0.3, cw * 0.6, ch * 0.4, ch * 0.2);
    ctx.fill();
  });
}

/** Faixa de advertência preta e amarela (gancho e cantos superiores) */
function hazard(ctx, x, y, w, h, stripe) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = C.hazard;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.ink;
  for (let i = -h; i < w + h; i += stripe * 2) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + stripe, y + h);
    ctx.lineTo(x + i + stripe + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Corrugado vertical (paredes laterais e teto) */
function verticalRibs(ctx, x0, x1, y0, y1, period) {
  for (let x = x0; x < x1; x += period) {
    ctx.fillStyle = C.ribHi;
    ctx.fillRect(x + period * 0.45, y0, period * 0.1, y1 - y0);
    ctx.fillStyle = C.rib;
    ctx.fillRect(x + period * 0.55, y0, period * 0.3, y1 - y0);
    ctx.fillStyle = C.ribEdge;
    ctx.fillRect(x + period * 0.85, y0, period * 0.075, y1 - y0);
  }
}

/** Corrugado horizontal (portas e parede frontal) */
function horizontalRibs(ctx, x0, x1, y0, y1, bands) {
  const bh = (y1 - y0) / bands;
  for (let i = 0; i < bands; i += 1) {
    const y = y0 + i * bh;
    ctx.fillStyle = C.ribHi;
    ctx.fillRect(x0, y + bh * 0.18, x1 - x0, bh * 0.06);
    ctx.fillStyle = C.rib;
    ctx.fillRect(x0, y + bh * 0.24, x1 - x0, bh * 0.52);
    ctx.fillStyle = C.ribEdge;
    ctx.fillRect(x0, y + bh * 0.76, x1 - x0, bh * 0.06);
  }
}

/** Lateral comprida: estêncil VETOR, código ISO, pesos e placa CSC */
export function drawSide(width = 2048) {
  const w = width;
  const h = Math.round(w * (400 / 960));
  const u = w / 960;
  const [canvas, ctx] = makeCanvas(w, h);

  ctx.fillStyle = C.orange;
  ctx.fillRect(0, 0, w, h);
  verticalRibs(ctx, 38 * u, w - 38 * u, 26 * u, h - 28 * u, 40 * u);
  grime(ctx, w, h, 11);

  ctx.fillStyle = C.rail;
  ctx.fillRect(0, 0, w, 26 * u);
  ctx.fillRect(0, 0, 38 * u, h);
  ctx.fillRect(w - 38 * u, 0, 38 * u, h);
  ctx.fillStyle = C.sill;
  ctx.fillRect(0, h - 28 * u, w, 28 * u);
  castings(ctx, w, h, 38 * u, 30 * u);
  hazard(ctx, 46 * u, 5 * u, 64 * u, 16 * u, 6 * u);
  hazard(ctx, w - 110 * u, 5 * u, 64 * u, 16 * u, 6 * u);

  ctx.fillStyle = C.white;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 ${34 * u}px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText('VTRU 204816', 858 * u, 82 * u);
  ctx.font = `500 ${28 * u}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('3', 891 * u, 81 * u);
  ctx.font = `500 ${26 * u}px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText('22G1', 910 * u, 126 * u);

  ctx.textAlign = 'left';
  ctx.font = `${200 * u}px ${DISPLAY}`;
  ctx.fillText('VETOR', 64 * u, 292 * u);
  ctx.fillStyle = C.ink;
  ctx.fillRect(526 * u, 252 * u, 40 * u, 40 * u);

  ctx.fillStyle = C.white;
  ctx.font = `500 ${17 * u}px ${MONO}`;
  ctx.fillText('MAX GROSS 30.480 KG · 67.200 LB', 66 * u, 332 * u);
  ctx.fillText('TARE 2.230 KG · 4.920 LB', 66 * u, 355 * u);

  ctx.strokeStyle = C.white;
  ctx.lineWidth = 3 * u;
  ctx.strokeRect(872 * u, 52 * u, 38 * u, 38 * u);
  ctx.lineWidth = 2 * u;
  ctx.strokeRect(748 * u, 268 * u, 120 * u, 72 * u);
  ctx.beginPath();
  [[290, 96], [306, 72], [322, 84]].forEach(([y, len]) => {
    ctx.moveTo(760 * u, y * u);
    ctx.lineTo((760 + len) * u, y * u);
  });
  ctx.stroke();

  return canvas;
}

/** Fundo com portas: barras de travamento, maçanetas, estêncil */
export function drawDoors(width = 1024) {
  const w = width;
  const h = Math.round(w * (0.4 / 0.3866));
  const u = h / 400;
  const [canvas, ctx] = makeCanvas(w, h);

  const post = 38 * u;
  const top = 26 * u;
  const sill = 28 * u;
  const doorW = (w - post * 2) / 2;

  ctx.fillStyle = C.orange;
  ctx.fillRect(0, 0, w, h);
  horizontalRibs(ctx, post, w - post, top + 10 * u, h - sill - 10 * u, 6);
  grime(ctx, w, h, 23, 1.2);

  ctx.fillStyle = C.rail;
  ctx.fillRect(0, 0, w, top);
  ctx.fillRect(0, 0, post, h);
  ctx.fillRect(w - post, 0, post, h);
  ctx.fillStyle = C.sill;
  ctx.fillRect(0, h - sill, w, sill);

  // Junta central e bordas das portas
  ctx.fillStyle = C.ink;
  ctx.fillRect(w / 2 - 3 * u, top, 6 * u, h - top - sill);
  ctx.fillStyle = 'rgba(12,12,12,0.35)';
  ctx.fillRect(post, top, 3 * u, h - top - sill);
  ctx.fillRect(w - post - 3 * u, top, 3 * u, h - top - sill);

  // Barras de travamento (4) com mancais e maçanetas
  const bars = [0.2, 0.42, 0.58, 0.8].map((f) => post + (w - post * 2) * f);
  bars.forEach((x, i) => {
    ctx.fillStyle = C.steel;
    ctx.fillRect(x - 6 * u, top - 4 * u, 12 * u, h - top - sill + 8 * u);
    ctx.fillStyle = C.steelHi;
    ctx.fillRect(x - 4 * u, top - 4 * u, 2.5 * u, h - top - sill + 8 * u);
    ctx.fillStyle = '#26292C';
    ctx.fillRect(x - 12 * u, top - 2 * u, 24 * u, 22 * u);
    ctx.fillRect(x - 12 * u, h - sill - 20 * u, 24 * u, 22 * u);
    [0.36, 0.7].forEach((fy) => ctx.fillRect(x - 10 * u, h * fy, 20 * u, 10 * u));
    const dir = i % 2 === 0 ? 1 : -1;
    const hy = h * 0.6;
    ctx.fillStyle = C.steel;
    ctx.fillRect(dir > 0 ? x : x - 52 * u, hy, 52 * u, 9 * u);
    ctx.fillStyle = '#26292C';
    ctx.fillRect(dir > 0 ? x + 44 * u : x - 52 * u, hy - 8 * u, 8 * u, 25 * u);
  });

  castings(ctx, w, h, post, 30 * u);

  // Estêncil: código na porta direita, marca na esquerda (proporção de porta real)
  ctx.fillStyle = C.white;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const rx = w / 2 + 14 * u;
  ctx.font = `500 ${13 * u}px ${MONO}`;
  ctx.fillText('VTRU 204816', rx + 54 * u, top + 30 * u);
  const boxX = rx + 54 * u + ctx.measureText('VTRU 204816').width + 5 * u;
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 1.6 * u;
  ctx.strokeRect(boxX, top + 18 * u, 15 * u, 15 * u);
  ctx.font = `500 ${11 * u}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('3', boxX + 7.5 * u, top + 29.5 * u);
  ctx.textAlign = 'left';
  ctx.fillText('22G1', rx + 54 * u, top + 46 * u);

  ctx.font = `500 ${7.5 * u}px ${MONO}`;
  ['MAX GROSS 30.480 KG', 'TARE      2.230 KG', 'NET      28.250 KG', 'CU.CAP.   33,2 M³'].forEach((t, i) => {
    ctx.fillText(t, rx + 54 * u, h - sill - 54 * u + i * 11 * u);
  });

  ctx.font = `${50 * u}px ${DISPLAY}`;
  ctx.fillText('VETOR', post + 16 * u, h * 0.47);
  const vw = ctx.measureText('VETOR').width;
  ctx.fillStyle = C.ink;
  ctx.fillRect(post + 16 * u + vw + 4 * u, h * 0.47 - 11 * u, 11 * u, 11 * u);

  ctx.strokeStyle = C.white;
  ctx.lineWidth = 1.4 * u;
  ctx.strokeRect(post + 16 * u, h - sill - 50 * u, 40 * u, 26 * u);
  ctx.beginPath();
  [8, 13, 18].forEach((dy) => {
    ctx.moveTo(post + 21 * u, h - sill - 50 * u + dy * u);
    ctx.lineTo(post + 50 * u, h - sill - 50 * u + dy * u);
  });
  ctx.stroke();

  return canvas;
}

/** Parede frontal (fundo cego) */
export function drawFront(width = 1024) {
  const w = width;
  const h = Math.round(w * (0.4 / 0.3866));
  const u = h / 400;
  const [canvas, ctx] = makeCanvas(w, h);
  ctx.fillStyle = C.orange;
  ctx.fillRect(0, 0, w, h);
  horizontalRibs(ctx, 38 * u, w - 38 * u, 26 * u, h - 28 * u, 9);
  grime(ctx, w, h, 37);
  ctx.fillStyle = C.rail;
  ctx.fillRect(0, 0, w, 26 * u);
  ctx.fillRect(0, 0, 38 * u, h);
  ctx.fillRect(w - 38 * u, 0, 38 * u, h);
  ctx.fillStyle = C.sill;
  ctx.fillRect(0, h - 28 * u, w, 28 * u);
  castings(ctx, w, h, 38 * u, 30 * u);
  return canvas;
}

/** Teto */
export function drawRoof(width = 2048) {
  const w = width;
  const h = Math.round(w * (0.3866 / 0.96));
  const u = w / 960;
  const [canvas, ctx] = makeCanvas(w, h);
  ctx.fillStyle = '#E8471A';
  ctx.fillRect(0, 0, w, h);
  verticalRibs(ctx, 30 * u, w - 30 * u, 0, h, 28 * u);
  grime(ctx, w, h, 51, 1.4);
  ctx.fillStyle = C.rail;
  ctx.fillRect(0, 0, w, 14 * u);
  ctx.fillRect(0, h - 14 * u, w, 14 * u);
  castings(ctx, w, h, 38 * u, 30 * u);
  return canvas;
}

/** Bloco do gancho do guindaste */
export function drawHook(size = 256) {
  const [canvas, ctx] = makeCanvas(size, size);
  hazard(ctx, 0, 0, size, size, size / 9);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = size / 16;
  ctx.strokeRect(0, 0, size, size);
  return canvas;
}

export async function drawContainerTextures() {
  if (document.fonts) {
    await Promise.all([
      document.fonts.load(`200px ${DISPLAY}`, 'VETOR'),
      document.fonts.load(`500 34px ${MONO}`, 'VTRU 204816'),
    ]).catch(() => {});
  }
  return {
    side: drawSide(),
    doors: drawDoors(),
    front: drawFront(),
    roof: drawRoof(),
    hook: drawHook(),
  };
}
