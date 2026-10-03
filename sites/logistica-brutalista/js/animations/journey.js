/**
 * SEÇÃO 4 — jornada logística: MAR → TERRA → AR.
 *
 * O usuário acompanha a MESMA carga do hero (o contêiner laranja VTRU 204816-3):
 *   entrada   → o mapa se desenha: rota planejada, porto, terminal e destino ●
 *   mar       → o navio segue a linha (balanço de água), a rota feita fica laranja
 *   transbordo→ o navio para no porto, a carga passa para o caminhão, a câmera segue a rota
 *   terra     → o caminhão acelera pela estrada sobre a água e chega ao terminal
 *   embarque  → terra → ar: o caminhão sai, o avião assume
 *   ar        → o avião acelera, sobe (sombra se afasta) e chega ao destino ●
 *   final     → a câmera se afasta: as três faixas lado a lado, com navio, caminhão e
 *               avião na mesma linha (o quadro da vista aérea) e o ● azul no destino
 * Um veículo por vez. Tudo comandado pela rolagem (scrub), só com transform/opacity:
 * cada veículo anda num "trilho" do tamanho da faixa, deslocado por translate em %
 * (porcentagem do próprio trilho = da faixa), então acompanha a faixa abrindo e fechando.
 */
import { q, qa, clamp, fmt } from './utils.js';

const { gsap, ScrollTrigger } = window;

const CARGO_ID = 'VTRU 204816-3';

/*
 * Rotas em coordenadas da faixa (0–1): uma linha reta na mesma altura (LANE) nas três
 * faixas, como na vista aérea — o navio chega ao porto na borda da faixa, o caminhão
 * atravessa a estrada e o avião segue até o destino ●. A mesma altura está no CSS (--lane).
 */
const LANE = 0.45;
const line = (x0, x1) => [[[x0, LANE], [x0 + (x1 - x0) / 3, LANE], [x0 + ((x1 - x0) * 2) / 3, LANE], [x1, LANE]]];
const ROUTES = {
  desktop: { mar: line(-0.12, 1), terra: line(0, 1), ar: line(0, 0.86) },
  mobile: { mar: line(-0.2, 1), terra: line(0, 1), ar: line(0, 0.84) },
};

/** Para onde a imagem de cada veículo aponta (graus de tela; 0 = leste, 90 = sul). */
const FACING = { ship: -90, truck: 90, plane: -90 };

const cubic = (a, b, c, d, t) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/**
 * Amostra a rota com distância medida na tela (largura × altura da faixa),
 * para que a velocidade e o ângulo sejam os que o olho vê.
 */
function createRoute(segments) {
  const pts = [];
  segments.forEach((seg, si) => {
    for (let i = si ? 1 : 0; i <= 48; i += 1) {
      const t = i / 48;
      pts.push({ x: cubic(seg[0][0], seg[1][0], seg[2][0], seg[3][0], t), y: cubic(seg[0][1], seg[1][1], seg[2][1], seg[3][1], t), s: 0 });
    }
  });
  let aspect = 1;
  const svgPath = segments
    .map((s, i) => `${i ? '' : `M${s[0][0] * 100} ${s[0][1] * 100}`} C${s[1][0] * 100} ${s[1][1] * 100} ${s[2][0] * 100} ${s[2][1] * 100} ${s[3][0] * 100} ${s[3][1] * 100}`)
    .join(' ');

  const measure = (a) => {
    aspect = a;
    let s = 0;
    pts.forEach((p, i) => {
      if (i) s += Math.hypot((p.x - pts[i - 1].x) * aspect, p.y - pts[i - 1].y);
      p.s = s;
    });
    pts.forEach((p) => {
      p.s /= s;
    });
  };
  measure(1);

  const index = (f) => {
    let lo = 0;
    let hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].s < f) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  /** Ponto e direção (graus de tela) na fração f do comprimento. */
  const at = (f) => {
    const t = clamp(f, 0, 1);
    const i = Math.min(index(t), pts.length - 2);
    const a = pts[i];
    const b = pts[i + 1];
    const k = (t - a.s) / (b.s - a.s || 1);
    const angle = (Math.atan2(b.y - a.y, (b.x - a.x) * aspect) * 180) / Math.PI;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, angle };
  };

  /** Pontos da polilinha percorrida até f (em 0–100, para o viewBox da faixa). */
  const pointsTo = (f) => {
    if (f <= 0) return '';
    const end = at(f);
    const out = [];
    for (let i = 0; i < pts.length && pts[i].s < f; i += 1) out.push(`${(pts[i].x * 100).toFixed(2)},${(pts[i].y * 100).toFixed(2)}`);
    out.push(`${(end.x * 100).toFixed(2)},${(end.y * 100).toFixed(2)}`);
    return out.join(' ');
  };

  return { at, pointsTo, measure, svgPath, start: pts[0], end: pts[pts.length - 1] };
}

/** Diferença entre dois ângulos em graus (−180…180). */
const turn = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;

/** Camada de rota, nós e etiqueta de cada faixa (só existe com animação). */
function buildStripLayer(s, route, node) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'journey__route');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const plan = document.createElementNS(NS, 'polyline');
  plan.setAttribute('class', 'journey__plan');
  const done = document.createElementNS(NS, 'polyline');
  done.setAttribute('class', 'journey__done');
  svg.append(plan, done);
  s.el.insertBefore(svg, s.veh);

  const nodeEl = document.createElement('span');
  nodeEl.className = `journey__node journey__node--${node.kind}`;
  nodeEl.setAttribute('aria-hidden', 'true');
  nodeEl.style.setProperty('--nu', route.end.x);
  nodeEl.style.setProperty('--nv', route.end.y);
  nodeEl.innerHTML = `<i></i><span class="journey__label micro">${node.label}</span>`;
  s.el.append(nodeEl);

  // Trilho: o veículo e a etiqueta da carga andam juntos; só o veículo gira
  const rail = document.createElement('div');
  rail.className = 'journey__rail';
  const tag = document.createElement('span');
  tag.className = 'journey__tag micro';
  tag.setAttribute('aria-hidden', 'true');
  tag.innerHTML = `${CARGO_ID}<b>${s.status}</b>`;
  rail.append(s.veh, tag);
  s.el.insertBefore(rail, svg.nextSibling);

  return { svg, plan, done, rail, node: nodeEl, tag, dot: q('i', nodeEl), label: q('.journey__label', nodeEl) };
}

export function initLogisticsJourney({ smoother }) {

  const pin = q('.modais__pin');
  const track = q('.modais__track');
  const STATUS = { mar: 'Em alto-mar', terra: 'Em rota · BR-116', ar: 'Em voo · FL 350' };
  const NODES = {
    mar: { kind: 'port', label: 'Porto de Santos · transbordo' },
    terra: { kind: 'gate', label: 'GRU · embarque' },
    ar: { kind: 'dest', label: 'Destino · entregue' },
  };
  const strips = qa('.modal-strip').map((el) => {
    const key = ['mar', 'terra', 'ar'].find((k) => el.classList.contains(`modal-strip--${k}`));
    const veh = q('.modal-strip__vehicle', el);
    return {
      key,
      el,
      veh,
      img: q('img', veh),
      kind: { mar: 'ship', terra: 'truck', ar: 'plane' }[key],
      status: STATUS[key],
      bg: q('.modal-strip__bg', el),
      body: q('.modal-strip__body', el),
      top: q('.modal-strip__top', el),
      tab: q('.modal-strip__tab', el),
      tel: q('.modal-strip__tel', el),
      speed: q('[data-tel="speed"]', el),
      dist: q('[data-tel="dist"]', el),
      wake: q('.vehicle__wake', el),
      clouds: q('.modal-strip__clouds', el),
      size: { w: 0, h: 0 },
      k: 1, // escala do veículo (sai de cena menor)
      t: 0, // progresso do veículo na rota
      line: 0, // rota feita além do veículo (a carga segue até o nó no transbordo)
      draw: 0, // quanto da rota planejada já foi desenhado
      bgx: 0, // quanto a água (e as faixas da estrada) já correu, em px
      lastAngle: null,
      drawn: null, // estado já desenhado: render() pula a faixa que não mudou
      drawnBgx: null,
    };
  });
  const [mar, terra, ar] = strips;
  const vh = () => window.innerHeight;
  const mobileQuery = window.matchMedia('(max-width: 899px)');

  // Carga laranja (o contêiner do hero) no convés do navio e na carreta do caminhão
  [mar, terra].forEach((s) => {
    const mark = document.createElement('span');
    mark.className = `vehicle__cargo vehicle__cargo--${s.kind}`;
    mark.setAttribute('aria-hidden', 'true');
    s.veh.append(mark);
    s.cargo = mark;
  });

  let layers = null;
  let routes = null;
  const build = (set) => {
    routes = Object.fromEntries(strips.map((s) => [s.key, createRoute(ROUTES[set][s.key])]));
    if (!layers) layers = Object.fromEntries(strips.map((s) => [s.key, buildStripLayer(s, routes[s.key], NODES[s.key])]));
    strips.forEach((s) => {
      s.route = routes[s.key];
      s.layer = layers[s.key];
      s.layer.node.style.setProperty('--nu', s.route.end.x);
      s.layer.node.style.setProperty('--nv', s.route.end.y);
      s.draw = 0;
      s.t = 0;
      s.line = 0;
      s.k = 1;
      s.bgx = 0;
      s.lastAngle = null;
      s.drawn = null;
      s.drawnBgx = null;
    });
  };

  /** Mede a proporção de cada faixa (aberta no desktop, tela cheia no celular). */
  const measure = () => {
    const W = pin.offsetWidth;
    const H = pin.offsetHeight;
    const stripW = mobileQuery.matches ? W : W * 0.74;
    strips.forEach((s) => {
      s.route.measure(stripW / H);
      s.size = { w: s.veh.offsetWidth, h: s.veh.offsetHeight, strip: stripW, tag: s.layer.tag.offsetWidth };
      s.drawn = null; // medidas novas: redesenha tudo
    });
  };

  /** Posiciona cada veículo na sua rota e atualiza rota feita e telemetria. */
  const SPEED = { mar: [18, 2], terra: [80, 2], ar: [850, 3] };
  const DIST = { mar: 412, terra: 1240, ar: 10000 };
  // A textura da água se repete a cada 480 px e as faixas da estrada a cada 86 px: a camada
  // só precisa andar um período (é mais estreita, mais leve na memória do celular)
  const wrapWater = gsap.utils.wrap(-480, 0);
  const wrapDash = gsap.utils.wrap(-86, 0);
  const render = () => {
    strips.forEach((s) => {
      if (s.bgx !== s.drawnBgx) {
        s.drawnBgx = s.bgx;
        s.bg.style.setProperty('--bgx', `${wrapWater(s.bgx).toFixed(1)}px`);
        s.bg.style.setProperty('--rx', `${wrapDash(s.bgx).toFixed(1)}px`);
      }
      // Só a faixa que andou é redesenhada (no celular, uma de cada vez)
      const state = `${s.t}|${s.k}|${s.draw}|${s.line}`;
      if (state === s.drawn) return;
      s.drawn = state;
      const { route, layer } = s;
      const p = route.at(s.t);
      const ahead = route.at(Math.min(1, s.t + 0.02));
      const bend = s.lastAngle === null ? 0 : turn(s.lastAngle, ahead.angle);
      s.lastAngle = ahead.angle;
      const rot = p.angle - FACING[s.kind];
      layer.rail.style.setProperty('--u', p.x.toFixed(4));
      layer.rail.style.setProperty('--v', p.y.toFixed(4));
      s.veh.style.setProperty('--a', `${rot.toFixed(2)}deg`);
      s.veh.style.setProperty('--s', s.k.toFixed(3));
      // Etiqueta da carga logo acima do veículo, qualquer que seja a direção
      const r = (rot * Math.PI) / 180;
      const ext = (Math.abs(s.size.w * Math.sin(r)) + Math.abs(s.size.h * Math.cos(r))) / 2;
      // (avião: as asas são enflechadas, a ponta fica para trás; sobre o centro há espaço mais perto)
      layer.tag.style.setProperty('--ty', `${Math.round(-ext * (s.kind === 'plane' ? 0.8 : 1) - 12)}px`);
      // ...e sem sair da faixa nas bordas
      const half = s.size.tag / 2 + 10;
      const cx = p.x * s.size.strip;
      layer.tag.style.setProperty('--tx', `${Math.round(clamp(cx, half, s.size.strip - half) - cx)}px`);
      layer.plan.setAttribute('points', route.pointsTo(s.draw));
      layer.done.setAttribute('points', route.pointsTo(Math.max(s.t, s.line)));

      // Velocidade: sobe na partida e cai na chegada (como o easing do trajeto)
      const v = Math.sin(Math.PI * clamp(s.t * 1.04, 0, 1)) ** 0.7;
      const [max, pad] = SPEED[s.key];
      const speed = fmt(Math.round(max * v), pad);
      const dist = fmt(Math.round(DIST[s.key] * s.t));
      if (s.speed.textContent !== speed) s.speed.textContent = speed;
      if (s.dist.textContent !== dist) s.dist.textContent = dist;

      if (s.kind === 'ship') {
        gsap.set(s.wake, { scaleY: 0.45 + 1.4 * v, opacity: 0.35 + 0.65 * v });
      } else if (s.kind === 'truck') {
        // Suspensão: vibração da estrada com a rolagem e inclinação nas curvas
        gsap.set(s.img, {
          y: Math.sin(s.t * 260) * 1.6 * v,
          rotation: clamp(-bend * 0.9, -3, 3),
          scaleX: 1 - Math.min(Math.abs(bend) * 0.004, 0.02),
        });
      } else {
        // Avião: sobe (cresce, sombra se afasta) e inclina nas curvas
        const climb = gsap.parseEase('power2.inOut')(clamp((s.t - 0.12) / 0.7, 0, 1));
        s.veh.style.setProperty('--alt', (6 + climb * 110).toFixed(1));
        const k = 0.62 + climb * 0.4;
        gsap.set(s.img, { scaleY: k, scaleX: k * (1 - Math.min(Math.abs(bend) * 0.02, 0.1)) });
      }
    });
  };

  // Navio sobre a água: balanço contínuo e mínimo (y + rotação)
  const bob = gsap
    .timeline({ repeat: -1, paused: true, defaults: { ease: 'sine.inOut' } })
    .to(mar.img, { y: 2.2, rotation: 0.9, duration: 1.4 })
    .to(mar.img, { y: -1.6, rotation: -0.7, duration: 1.6 })
    .to(mar.img, { y: 0, rotation: 0, duration: 1.2 });
  ScrollTrigger.create({ trigger: pin, start: 'top bottom', end: 'bottom top', onToggle: (self) => (self.isActive ? bob.play() : bob.pause()) });

  const draw = (s, at, duration = 0.6) => tl0.to(s, { draw: 1, duration, ease: 'power1.inOut' }, at);
  let tl0 = null; // linha do tempo ativa (para o desenho da rota planejada)

  const scrollToLabel = (tl, label) => {
    const st = tl.scrollTrigger;
    if (!st) return;
    smoother.scrollTo(st.start + (st.end - st.start) * (tl.labels[label] / tl.duration()), true);
  };

  const mm = gsap.matchMedia();

  // ── Desktop: acordeão — a faixa ativa abre, as outras viram abas; a câmera segue a rota ──
  mm.add('(min-width: 900px)', () => {
    build('desktop');
    const els = strips.map((s) => s.el);
    const vehicles = strips.map((s) => s.veh);
    const tags = strips.map((s) => s.layer.tag);
    gsap.set([...vehicles, ...tags], { autoAlpha: 0 });
    gsap.set(strips.map((s) => [s.layer.dot, s.layer.label]).flat(), { autoAlpha: 0 });
    gsap.set(strips.map((s) => s.layer.dot), { scale: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: render,
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${vh() * 7.5}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: () => {
          measure();
          render();
        },
      },
    });
    tl0 = tl;
    const open = (active, at, d = 0.9) =>
      strips.forEach((s) => tl.to(s.el, { flexBasis: s === active ? '74%' : '13%', duration: d, ease: 'power2.inOut' }, at));
    const pop = (s, at) =>
      tl.to(s.layer.dot, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2.4)' }, at).to(s.layer.label, { autoAlpha: 1, duration: 0.25 }, at + 0.1);

    // ENTRADA: o mapa se desenha antes de qualquer veículo
    tl.addLabel('entrada', 0);
    draw(mar, 0);
    draw(terra, 0.45);
    draw(ar, 0.9);
    pop(mar, 0.5);
    pop(terra, 0.95);
    pop(ar, 1.4);

    // MAR — o navio entra pela base e segue a rota até o porto
    tl.addLabel('mar', 1.6);
    open(mar, 1.6);
    tl.to([terra.body, terra.top, ar.body, ar.top], { opacity: 0, duration: 0.3 }, 1.6)
      .to([terra.layer.svg, ar.layer.svg, terra.layer.label, ar.layer.label], { opacity: 0.3, duration: 0.3 }, 1.6)
      .to([terra.tab, ar.tab], { opacity: 1, duration: 0.3 }, 2.1)
      .to(mar.tel, { opacity: 1, duration: 0.3 }, 2.1)
      .to([mar.veh, mar.layer.tag], { autoAlpha: 1, duration: 0.05 }, 2.4)
      .to(mar, { t: 0.9, duration: 2.8, ease: 'power1.inOut' }, 2.4)
      .to(mar, { bgx: -640, duration: 3.6 }, 1.6);

    // TRANSBORDO — a carga sai do navio e continua por terra
    tl.addLabel('transbordo', 5.2)
      .to(mar, { line: 1, duration: 0.3, ease: 'power1.in' }, 5.2)
      .to(mar.layer.dot, { scale: 1.6, duration: 0.2, ease: 'power2.out' }, 5.45)
      .to(mar.layer.dot, { scale: 1, duration: 0.3, ease: 'power2.inOut' }, 5.65)
      .to(mar.cargo, { scale: 1.5, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, 5.3)
      .to(mar.layer.tag, { autoAlpha: 0, duration: 0.2 }, 5.3)
      .to(mar.veh, { autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 5.6)
      .to(mar, { k: 0.86, duration: 0.6, ease: 'power2.in' }, 5.6)
      .fromTo(terra.cargo, { scale: 1.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 5.65);
    open(terra, 5.4);
    tl.to([mar.body, mar.top, mar.tel], { opacity: 0, duration: 0.3 }, 5.4)
      .to(mar.tab, { opacity: 1, duration: 0.3 }, 5.9)
      .to(terra.tab, { opacity: 0, duration: 0.2 }, 5.4)
      .to([mar.layer.svg, mar.layer.label], { opacity: 0.3, duration: 0.3 }, 5.6)
      .to([terra.layer.svg, terra.layer.label], { opacity: 1, duration: 0.3 }, 5.4)
      .to([terra.body, terra.top, terra.tel], { opacity: 1, duration: 0.4 }, 5.9)
      .set(terra, { t: 0.08 }, 5.6)
      .to(terra.veh, { autoAlpha: 1, duration: 0.3 }, 5.6)
      .to(terra.layer.tag, { autoAlpha: 1, duration: 0.2 }, 6.3);

    // TERRA — o caminhão acelera pela estrada e chega ao terminal
    tl.addLabel('terra', 6.3)
      .to(terra, { t: 0.92, duration: 2.7, ease: 'power2.inOut' }, 6.3)
      .to(terra, { bgx: -1400, duration: 3.6 }, 5.4);

    // EMBARQUE — terra → ar
    tl.addLabel('embarque', 9)
      .to(terra, { line: 1, duration: 0.3, ease: 'power1.in' }, 9)
      .to(terra.layer.dot, { scale: 1.6, duration: 0.2, ease: 'power2.out' }, 9.2)
      .to(terra.layer.dot, { scale: 1, duration: 0.3, ease: 'power2.inOut' }, 9.4)
      .to(terra.cargo, { scale: 0.6, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, 9.1)
      .to(terra.layer.tag, { autoAlpha: 0, duration: 0.2 }, 9.1)
      .to(terra.veh, { autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 9.3)
      .to(terra, { k: 0.9, duration: 0.5, ease: 'power2.in' }, 9.3);
    open(ar, 9.2);
    tl.to([terra.body, terra.top, terra.tel], { opacity: 0, duration: 0.3 }, 9.2)
      .to(terra.tab, { opacity: 1, duration: 0.3 }, 9.7)
      .to(ar.tab, { opacity: 0, duration: 0.2 }, 9.2)
      .to([terra.layer.svg, terra.layer.label], { opacity: 0.3, duration: 0.3 }, 9.4)
      .to([ar.layer.svg, ar.layer.label], { opacity: 1, duration: 0.3 }, 9.2)
      .to([ar.body, ar.top, ar.tel], { opacity: 1, duration: 0.4 }, 9.7)
      .to(ar.clouds, { opacity: 0.85, duration: 0.5 }, 9.7)
      .set(ar, { t: 0.05 }, 9.5)
      .to(ar.veh, { autoAlpha: 1, duration: 0.3 }, 9.5)
      .to(ar.layer.tag, { autoAlpha: 1, duration: 0.2 }, 10.1);

    // AR — o avião decola, sobe e chega ao destino ●
    tl.addLabel('ar', 10.1)
      .to(ar, { t: 1, duration: 2.8, ease: 'power2.inOut' }, 10.1)
      .fromTo(ar.clouds, { xPercent: 12 }, { xPercent: -20, duration: 3.4 }, 9.7)
      .to(ar, { bgx: -600, duration: 3.6 }, 9.2);

    // CHEGADA + FINAL — a câmera se afasta: o mapa inteiro com a rota completa
    tl.addLabel('final', 12.9)
      .to(ar, { k: 0.9, duration: 0.45, ease: 'power2.inOut' }, 12.9)
      .to(ar.layer.tag, { autoAlpha: 0, duration: 0.2 }, 12.9)
      .to(ar.layer.dot, { scale: 2.1, duration: 0.35, ease: 'power2.out' }, 13.1)
      .to(ar.layer.dot, { scale: 1.4, duration: 0.4, ease: 'power2.inOut' }, 13.45);
    strips.forEach((s) => tl.to(s.el, { flexBasis: '33.3333%', duration: 1, ease: 'power2.inOut' }, 13.3));
    tl.to(strips.map((s) => s.tab), { opacity: 0, duration: 0.3 }, 13.3)
      .to(strips.map((s) => s.tel), { opacity: 0, duration: 0.3 }, 13.3)
      .to(ar.clouds, { opacity: 0, duration: 0.4 }, 13.3)
      .to(strips.flatMap((s) => [s.body, s.top]), { opacity: 1, duration: 0.4 }, 13.7)
      .to(strips.flatMap((s) => [s.layer.svg, s.layer.label]), { opacity: 1, duration: 0.4 }, 13.5)
      .to([mar.veh, terra.veh], { autoAlpha: 1, duration: 0.5 }, 13.7)
      .to([mar, terra], { k: 0.9, duration: 0.5 }, 13.7)
      .to(track, { scale: 0.92, duration: 1.1, ease: 'power2.inOut' }, 13.4)
      .set({}, {}, 15);

    const handlers = [
      [mar, 'mar'],
      [terra, 'terra'],
      [ar, 'ar'],
    ].map(([s, label]) => {
      const fn = () => scrollToLabel(tl, label);
      s.el.addEventListener('focusin', fn);
      return [s.el, fn];
    });
    measure();
    render();
    return () => {
      handlers.forEach(([el, fn]) => el.removeEventListener('focusin', fn));
      gsap.set([track, ...els], { clearProps: 'flexBasis,scale' });
    };
  });

  // ── Celular: cada modal ocupa a tela e a trilha desliza para o próximo trecho da rota ──
  mm.add('(max-width: 899px)', () => {
    build('mobile');
    const vehicles = strips.map((s) => s.veh);
    const tags = strips.map((s) => s.layer.tag);
    gsap.set([...vehicles, ...tags], { autoAlpha: 0 });
    gsap.set(strips.map((s) => s.layer.dot), { scale: 0, autoAlpha: 0 });
    gsap.set(strips.map((s) => s.layer.label), { autoAlpha: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: render,
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${vh() * 4.2}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: () => {
          measure();
          render();
        },
      },
    });
    tl0 = tl;
    const slideTo = (s, at) => tl.to(track, { x: () => -s.el.offsetLeft, duration: 0.8, ease: 'power2.inOut' }, at);
    const pop = (s, at) =>
      tl.to(s.layer.dot, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2.4)' }, at).to(s.layer.label, { autoAlpha: 1, duration: 0.25 }, at + 0.1);

    tl.addLabel('mar', 0);
    draw(mar, 0, 0.5);
    draw(terra, 0.3, 0.5);
    draw(ar, 0.5, 0.5);
    pop(mar, 0.45);
    pop(terra, 0.6);
    pop(ar, 0.75);
    tl.to(strips.map((s) => s.tel), { opacity: 1, duration: 0.3 }, 0.3)
      .to([mar.veh, mar.layer.tag], { autoAlpha: 1, duration: 0.05 }, 0.7)
      .to(mar, { t: 1, duration: 2.2, ease: 'power1.inOut' }, 0.7)
      .to(mar, { bgx: -600, duration: 3 }, 0)
      .to(mar.cargo, { scale: 1.5, autoAlpha: 0, duration: 0.3 }, 2.9)
      .to([mar.veh, mar.layer.tag], { autoAlpha: 0, duration: 0.3 }, 3);

    tl.addLabel('terra', 3);
    slideTo(terra, 3);
    tl.fromTo(terra.cargo, { scale: 1.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.3 }, 3.5)
      .to([terra.veh, terra.layer.tag], { autoAlpha: 1, duration: 0.05 }, 3.4)
      .to(terra, { t: 1, duration: 2.2, ease: 'power2.inOut' }, 3.8)
      .to(terra, { bgx: -1200, duration: 3 }, 3)
      .to([terra.veh, terra.layer.tag], { autoAlpha: 0, duration: 0.3 }, 6);

    tl.addLabel('ar', 6);
    slideTo(ar, 6);
    tl.to(ar.clouds, { opacity: 0.85, duration: 0.4 }, 6.3)
      .to([ar.veh, ar.layer.tag], { autoAlpha: 1, duration: 0.05 }, 6.4)
      .to(ar, { t: 1, duration: 2.2, ease: 'power2.inOut' }, 6.8)
      .fromTo(ar.clouds, { xPercent: 12 }, { xPercent: -20, duration: 3 }, 6.3)
      .to([ar.veh, ar.layer.tag], { autoAlpha: 0, duration: 0.3 }, 9)
      .to(ar.layer.dot, { scale: 2, duration: 0.35, ease: 'power2.out' }, 9.1)
      .to(ar.layer.dot, { scale: 1.4, duration: 0.35 }, 9.45)
      .set({}, {}, 10);

    measure();
    render();
    return () => gsap.set(track, { clearProps: 'x' });
  });
}
