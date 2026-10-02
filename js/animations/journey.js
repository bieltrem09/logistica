/**
 * 02 MODAIS — a jornada da carga: MAR → TERRA → AR.
 *
 * Cada modal é um capítulo com o mesmo ritmo: a faixa abre, a rota planejada aparece
 * (tracejada), o veículo percorre a rota com perfil de velocidade (acelera, cruzeiro,
 * freia) e a linha percorrida se desenha atrás dele. A telemetria conta a mesma
 * história: velocidade = derivada da posição, distância = posição.
 *
 * Entre capítulos, o contêiner VTRU 204816-3 (o mesmo do hero) sai do veículo que
 * chegou e espera o próximo: navio → caminhão → avião. É ele que o usuário acompanha.
 *
 * Desktop: acordeão (a faixa ativa abre para 74%, as outras viram abas com o
 * mini-mapa da rota já feita). Celular: uma faixa por tela, a trilha desliza.
 */
import { q, qa, clamp, smoothstep, trapezoid, pointOnPath, fmt, vh } from './utils.js';
import { splitInner, labelFromText } from './text.js';

const { gsap, ScrollTrigger } = window;

const OPEN = 0.74;
const TAB = 0.13;
const THIRD = 1 / 3;

/** Rotas em px da faixa aberta (W × H). Os veículos são vistos de cima. */
const ROUTES = {
  // Navio sobe do alto-mar até o cais, em S suave (corrente, manobra de aproximação)
  mar: (W, H) =>
    `M${0.64 * W} ${1.3 * H}C${0.5 * W} ${0.88 * H} ${0.86 * W} ${0.7 * H} ${0.74 * W} ${0.52 * H}S${0.62 * W} ${0.4 * H} ${0.7 * W} ${0.34 * H}`,
  // Caminhão desce o corredor do terminal, troca de faixa e para na doca do aeroporto
  terra: (W, H) =>
    `M${0.5 * W} ${-0.2 * H}C${0.5 * W} ${0.14 * H} ${0.465 * W} ${0.28 * H} ${0.47 * W} ${0.46 * H}S${0.505 * W} ${0.68 * H} ${0.5 * W} ${0.78 * H}`,
  // Avião decola, sobe em curva e pousa no destino
  ar: (W, H) =>
    `M${0.7 * W} ${1.1 * H}C${0.7 * W} ${0.72 * H} ${0.56 * W} ${0.48 * H} ${0.4 * W} ${0.38 * H}S${0.2 * W} ${0.3 * H} ${0.22 * W} ${0.3 * H}`,
};

/** Velocidade: [aceleração, frenagem] em fração do trajeto */
const PROFILES = { mar: trapezoid(0.3, 0.32), terra: trapezoid(0.24, 0.26), ar: trapezoid(0.42, 0.3) };

export function initModaisHead() {
  const title = q('.modais__title');
  const [l1, l2] = qa('.line', title);
  labelFromText(title);
  l1.classList.add('is-masked');
  const s1 = splitInner(l1, 'chars');
  const s2 = splitInner(l2, 'chars');

  // "TRÊS MODAIS." chega por esteira; "UM CONTATO." cai como carimbo de despacho
  gsap
    .timeline({
      scrollTrigger: { trigger: title, start: 'top 82%', once: true },
      onComplete: () => {
        s1.revert();
        s2.revert();
        l1.classList.remove('is-masked');
      },
    })
    .from(s1.chars, { x: () => window.innerWidth * 0.55, duration: 1.25, ease: 'power4.out', stagger: 0.04 })
    .from(s2.chars, { scale: 2.6, opacity: 0, duration: 0.42, ease: 'power4.in', stagger: 0.045 }, '-=0.55')
    .to(title, { keyframes: { y: [0, 5, -3, 2, 0] }, duration: 0.35, ease: 'none' }, '-=0.05');
}

/** Primeira posição (0–1) da rota que satisfaz `test` — ex.: onde ela entra na tela. */
function findPos(path, len, test) {
  for (let i = 0; i <= 200; i += 1) {
    if (test(path.getPointAtLength((len * i) / 200))) return i / 200;
  }
  return 0;
}

/** Inverte o perfil: em que instante do trecho o veículo passa pela posição `pos`. */
function timeAt(profile, pos) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i += 1) {
    const m = (lo + hi) / 2;
    if (profile.pos(m) < pos) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

function readStrip(el) {
  const route = q('.modal-strip__route', el);
  return {
    el,
    key: el.classList.contains('modal-strip--mar') ? 'mar' : el.classList.contains('modal-strip--terra') ? 'terra' : 'ar',
    veh: q('.modal-strip__vehicle', el),
    bg: q('.modal-strip__bg', el),
    body: q('.modal-strip__body', el),
    top: q('.modal-strip__top', el),
    tab: q('.modal-strip__tab', el),
    tel: q('.modal-strip__tel', el),
    speed: q('[data-tel="speed"]', el),
    dist: q('[data-tel="dist"]', el),
    wake: q('.vehicle__wake', el),
    clouds: q('.modal-strip__clouds', el),
    route,
    plan: q('.route__plan', route),
    done: q('.route__done', route),
    dots: qa('.route__dot', route),
    labels: qa('.route__label', route),
    len: 1,
    entry: 0,
    W: 1,
    H: 1,
  };
}

/**
 * Desenha as rotas no tamanho da faixa ABERTA (não no tamanho atual: durante o acordeão
 * a faixa muda de largura, a rota só é comprimida com scaleX).
 */
function layoutRoutes(strips, pin) {
  const desktop = window.matchMedia('(min-width: 900px)').matches;
  strips.forEach((s) => {
    s.W = desktop ? pin.offsetWidth * OPEN : s.el.offsetWidth;
    s.H = pin.offsetHeight;
    s.route.style.width = `${s.W}px`;
    s.route.setAttribute('viewBox', `0 0 ${s.W} ${s.H}`);
    const d = ROUTES[s.key](s.W, s.H);
    s.plan.setAttribute('d', d);
    s.done.setAttribute('d', d);
    s.len = s.done.getTotalLength();
    s.done.style.strokeDasharray = `${s.len} ${s.len}`;
    // Origem visível: onde a rota entra na tela (o veículo vem de fora do quadro).
    // É também ali que o contêiner espera o próximo veículo.
    s.entry =
      s.key === 'terra'
        ? findPos(s.done, s.len, (p) => p.y >= 0.24 * s.H)
        : findPos(s.done, s.len, (p) => p.y <= 0.84 * s.H);
    const ends = [pointOnPath(s.done, s.len, s.entry), pointOnPath(s.done, s.len, 1)];
    ends.forEach((p, i) => {
      s.dots[i].setAttribute('d', `M${p.x} ${p.y}h0`);
      const label = s.labels[i];
      const right = p.x > s.W * 0.45;
      label.setAttribute('x', right ? p.x - 16 : p.x + 16);
      label.setAttribute('y', p.y + 4);
      label.setAttribute('text-anchor', right ? 'end' : 'start');
    });
  });
}

/** Lê a pose de repouso do CSS (tríptico estático) em px, para o quadro final. */
function restPose(s, stripW) {
  const cs = getComputedStyle(s.veh);
  const px = (v, size) => (parseFloat(v) / 100) * size;
  return {
    x: px(cs.getPropertyValue('--vx'), stripW),
    y: px(cs.getPropertyValue('--vy'), s.el.offsetHeight),
    rotation: parseFloat(cs.getPropertyValue('--rot')) || 0,
  };
}

/**
 * Move um veículo pela rota. `t` é o tempo do trecho (0–1), o perfil decide a posição.
 * Devolve { s, vel, pt } para quem quiser reagir (telemetria, rastro, sombra).
 */
function placeOnRoute(s, t) {
  const prof = PROFILES[s.key];
  const pos = prof.pos(t);
  const vel = prof.vel(t);
  const pt = pointOnPath(s.done, s.len, pos);
  s.done.style.strokeDashoffset = s.len * (1 - pos);
  return { pos, vel, pt };
}

/** Telemetria: velocidade = perfil, distância = posição. */
function telemetry(s, pos, vel, speedMax, distMax, pad) {
  s.speed.textContent = fmt(speedMax * vel, { pad });
  s.dist.textContent = fmt(distMax * pos);
}

/** Cada veículo tem o seu jeito de andar. */
const DRIVE = {
  // Navio: rumo da rota + balanço lento de mar; o rastro cresce com a velocidade
  mar(s, t) {
    const { pos, vel, pt } = placeOnRoute(s, t);
    const sway = Math.sin(pos * Math.PI * 5) * 1.6 * (0.4 + vel);
    gsap.set(s.veh, { x: pt.x, y: pt.y, rotation: pt.angle + 90 + sway, scale: 1 });
    gsap.set(s.wake, { scaleY: 0.3 + 1.7 * vel, opacity: 0.35 + 0.65 * vel });
    telemetry(s, pos, vel, 18, 412, 2);
  },
  // Caminhão: a carreta atrasa nas curvas (rumo médio) e a suspensão sente o piso
  terra(s, t) {
    const { pos, vel, pt } = placeOnRoute(s, t);
    const back = pointOnPath(s.done, s.len, Math.max(0, pos - 0.03));
    const yaw = (pt.angle + back.angle) / 2 - 90;
    const bump = 1 + Math.sin(pos * Math.PI * 22) * 0.008 * vel;
    gsap.set(s.veh, { x: pt.x, y: pt.y, rotation: yaw, scale: bump });
    telemetry(s, pos, vel, 80, 1240, 2);
  },
  // Avião: sobe (escala + sombra afastando), inclina nas curvas e desce no destino
  ar(s, t) {
    const { pos, vel, pt } = placeOnRoute(s, t);
    const alt = smoothstep(0.1, 0.5, t) * (1 - smoothstep(0.74, 1, t));
    const a0 = pointOnPath(s.done, s.len, Math.max(0, pos - 0.02)).angle;
    const a1 = pointOnPath(s.done, s.len, Math.min(1, pos + 0.02)).angle;
    const bank = clamp((a1 - a0) / 18, -1, 1);
    gsap.set(s.veh, {
      x: pt.x,
      y: pt.y,
      rotation: pt.angle + 90,
      scaleX: (1 + 0.16 * alt) * (1 - Math.abs(bank) * 0.14),
      scaleY: 1 + 0.16 * alt,
      '--alt': 8 + 112 * alt,
    });
    if (s.clouds) gsap.set(s.clouds, { opacity: 0.15 + 0.75 * alt });
    s.speed.textContent = fmt(850 * Math.max(vel, alt * 0.9), { pad: 3 });
    s.dist.textContent = fmt(10000 * alt);
  },
};

export function initLogisticsJourney({ smoother }) {
  const section = q('.modais');
  const pin = q('.modais__pin');
  const track = q('.modais__track');
  const cargo = q('.journey-cargo', pin);
  const strips = qa('.modal-strip').map(readStrip);
  const [mar, terra, ar] = strips;
  const pinW = () => pin.offsetWidth;

  layoutRoutes(strips, pin);
  ScrollTrigger.addEventListener('refreshInit', () => layoutRoutes(strips, pin));

  const scrollToLabel = (tl, label) => {
    const st = tl.scrollTrigger;
    if (!st) return;
    smoother.scrollTo(st.start + (st.end - st.start) * (tl.labels[label] / tl.duration()), true);
  };

  // O cenário entra antes de fixar: faixas sobem como blocos de mapa, cada uma no seu tempo
  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: pin, start: 'top bottom', end: 'top top', scrub: 0.5 } })
    // (laterais negativas: os veículos do quadro final continuam cruzando as divisões)
    .fromTo(strips.map((s) => s.el), { clipPath: 'inset(22% -100% 0% -100%)' }, { clipPath: 'inset(0% -100% 0% -100%)', stagger: 0.12, duration: 0.7 }, 0)
    .fromTo(strips.map((s) => s.bg), { scale: 1.22 }, { scale: 1, stagger: 0.12, duration: 0.9 }, 0)
    .from(strips.map((s) => s.top), { yPercent: -60, opacity: 0, stagger: 0.1, duration: 0.4 }, 0.45);

  const mm = gsap.matchMedia();

  /* ─────────── Desktop: acordeão + contêiner que troca de veículo ─────────── */
  mm.add('(min-width: 900px)', () => {
    const els = strips.map((s) => s.el);
    const routeScale = (basis) => basis / OPEN;
    gsap.set(strips.map((s) => s.veh), { autoAlpha: 0, x: 0, y: 0, rotation: 0 });
    gsap.set(strips.map((s) => s.route), { scaleX: routeScale(THIRD), transformOrigin: '0% 50%' });
    gsap.set(cargo, { autoAlpha: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${vh() * 6}`, pin: true, scrub: true, invalidateOnRefresh: true },
    });

    /** Abre um capítulo: faixa ativa 74%, demais viram abas; rotas acompanham a largura. */
    const open = (active, at) => {
      strips.forEach((s) => {
        const basis = s === active ? OPEN : TAB;
        tl.to(s.el, { flexBasis: `${basis * 100}%`, duration: 0.9, ease: 'power2.inOut' }, at).to(
          s.route,
          { scaleX: routeScale(basis), duration: 0.9, ease: 'power2.inOut' },
          at,
        );
      });
    };
    /** A rota planejada aparece tracejada; pontos de origem e destino acendem. */
    const plan = (s, at) => {
      tl.fromTo(s.plan, { opacity: 0 }, { opacity: 1, duration: 0.35 }, at)
        .fromTo(s.plan, { strokeDashoffset: 400 }, { strokeDashoffset: 0, duration: 0.9 }, at)
        .fromTo(s.dots, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.25 }, at + 0.2)
        .fromTo(s.labels, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.25 }, at + 0.3);
    };
    /** Rótulos da rota saem quando a faixa vira aba (o mini-mapa fica). */
    const fold = (s, at) => tl.to(s.labels, { opacity: 0, duration: 0.2 }, at).to(s.plan, { opacity: 0.4, duration: 0.3 }, at);
    const travel = (s, at, duration) => {
      const o = { t: 0 };
      tl.fromTo(o, { t: 0 }, { t: 1, duration, onUpdate: () => DRIVE[s.key](s, o.t) }, at);
    };
    /** Posição global (no pin) de um ponto da rota de `s`, com a faixa de `s` começando em `left`. */
    const routePoint = (s, pos, left) => {
      const p = pointOnPath(s.done, s.len, pos);
      return { x: left * pinW() + p.x, y: p.y };
    };
    const pickT = { terra: timeAt(PROFILES.terra, terra.entry), ar: timeAt(PROFILES.ar, ar.entry) };

    // ── MAR ──
    tl.addLabel('mar', 0).set(els, { overflow: 'hidden' }, 0.001);
    open(mar, 0);
    plan(mar, 0.35);
    tl.to([terra.body, terra.top, ar.body, ar.top], { opacity: 0, duration: 0.3 }, 0)
      .to([terra.tab, ar.tab], { opacity: 1, duration: 0.3 }, 0.5)
      .to(mar.tel, { opacity: 1, duration: 0.3 }, 0.6)
      .set(mar.veh, { autoAlpha: 1 }, 0.9)
      .to(mar.bg, { '--bgy': '900px', duration: 3.6 }, 0)
      .fromTo(q('img', mar.bg), { yPercent: -10 }, { yPercent: 10, duration: 3.6 }, 0);
    travel(mar, 0.9, 2.6);

    // Navio atracado: o contêiner sai do convés (sobe no guindaste do cais)
    const dockMar = () => routePoint(mar, 1, 0);
    tl.fromTo(
      cargo,
      { autoAlpha: 0, scale: 0.8, x: () => dockMar().x, y: () => dockMar().y },
      { autoAlpha: 1, scale: 1.25, duration: 0.3, ease: 'power2.out' },
      3.5,
    );

    // ── MAR → TERRA ── a câmera acompanha a carga; o cenário desliza por baixo dela
    tl.addLabel('terra', 3.8);
    open(terra, 3.8);
    fold(mar, 3.8);
    plan(terra, 4.1);
    const pickTerra = () => routePoint(terra, terra.entry, TAB);
    tl.to([mar.body, mar.top, mar.tel], { opacity: 0, duration: 0.3 }, 3.8)
      .to(mar.veh, { autoAlpha: 0, duration: 0.4 }, 3.8)
      .to(mar.tab, { opacity: 1, duration: 0.3 }, 4.2)
      .to(terra.tab, { opacity: 0, duration: 0.2 }, 3.8)
      .to([terra.body, terra.top, terra.tel], { opacity: 1, duration: 0.4 }, 4.2)
      .to(cargo, { x: () => pickTerra().x, y: () => pickTerra().y, scale: 1, duration: 0.9, ease: 'power2.inOut' }, 3.8)
      .set(terra.veh, { autoAlpha: 1 }, 4.4)
      .to(terra.bg, { '--bgy': '-1700px', duration: 3.4 }, 3.8)
      .fromTo(q('img', terra.bg), { yPercent: 10 }, { yPercent: -10, duration: 3.4 }, 3.8);
    travel(terra, 4.4, 2.6);
    // O caminhão passa pelo ponto de coleta e leva o contêiner
    tl.to(cargo, { autoAlpha: 0, scale: 0.8, duration: 0.12 }, 4.4 + 2.6 * pickT.terra);

    // Caminhão na doca do aeroporto: o contêiner é descarregado
    const dockTerra = () => routePoint(terra, 1, TAB);
    tl.fromTo(
      cargo,
      { x: () => dockTerra().x, y: () => dockTerra().y },
      { autoAlpha: 1, scale: 1.25, duration: 0.3, ease: 'power2.out', immediateRender: false },
      7.0,
    );

    // ── TERRA → AR ── da estrada para a pista
    tl.addLabel('ar', 7.3);
    open(ar, 7.3);
    fold(terra, 7.3);
    plan(ar, 7.6);
    const pickAr = () => routePoint(ar, ar.entry, 2 * TAB);
    tl.to([terra.body, terra.top, terra.tel], { opacity: 0, duration: 0.3 }, 7.3)
      .to(terra.veh, { autoAlpha: 0, duration: 0.4 }, 7.3)
      .to(terra.tab, { opacity: 1, duration: 0.3 }, 7.7)
      .to(ar.tab, { opacity: 0, duration: 0.2 }, 7.3)
      .to([ar.body, ar.top, ar.tel], { opacity: 1, duration: 0.4 }, 7.7)
      .to(cargo, { x: () => pickAr().x, y: () => pickAr().y, scale: 1, duration: 0.9, ease: 'power2.inOut' }, 7.3)
      .to(ar.veh, { autoAlpha: 1, duration: 0.3 }, 7.9)
      .fromTo(ar.clouds, { yPercent: -12 }, { yPercent: 26, duration: 3.2 }, 7.6)
      .to(ar.bg, { '--bgx': '320px', '--bgy': '520px', duration: 3.6 }, 7.3)
      .fromTo(q('img', ar.bg), { yPercent: -10 }, { yPercent: 10, duration: 3.6 }, 7.3);
    travel(ar, 7.9, 2.8);
    tl.to(cargo, { autoAlpha: 0, scale: 0.8, duration: 0.12 }, 7.9 + 2.8 * pickT.ar);

    // Pouso: o contêiner desce no destino e o ponto final pulsa
    // (ao lado do avião, para a etiqueta não ficar embaixo dele)
    const destAr = () => routePoint(ar, 1, 2 * TAB);
    tl.fromTo(
      cargo,
      { x: () => destAr().x + 0.07 * pinW(), y: () => destAr().y + 0.12 * vh(), scale: 1.4 },
      { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power3.out', immediateRender: false },
      10.7,
    )
      .call(() => ar.route.classList.add('is-arrived'), null, 10.75)
      .call(() => ar.route.classList.remove('is-arrived'), null, 10.7);

    // ── FINAL ── a câmera se afasta: o tríptico se recompõe com as três rotas feitas
    tl.addLabel('final', 11.2);
    strips.forEach((s) =>
      tl
        .to(s.el, { flexBasis: `${THIRD * 100}%`, duration: 1, ease: 'power2.inOut' }, 11.2)
        .to(s.route, { scaleX: routeScale(THIRD), duration: 1, ease: 'power2.inOut' }, 11.2),
    );
    fold(ar, 11.2);
    tl.to(strips.map((s) => s.tab), { opacity: 0, duration: 0.3 }, 11.2)
      .to(strips.map((s) => s.tel), { opacity: 0, duration: 0.3 }, 11.2)
      .to(ar.clouds, { opacity: 0, duration: 0.4 }, 11.2)
      .to(cargo, { autoAlpha: 0, duration: 0.3 }, 11.2)
      .to(strips.map((s) => s.plan), { opacity: 0.25, duration: 0.4 }, 11.4)
      .to(strips.flatMap((s) => [s.body, s.top]), { opacity: 1, duration: 0.4 }, 11.6);
    strips.forEach((s) =>
      tl.set(
        s.veh,
        {
          x: () => restPose(s, pinW() * THIRD).x,
          y: () => restPose(s, pinW() * THIRD).y,
          rotation: () => restPose(s, pinW() * THIRD).rotation,
          scale: 1,
          scaleX: 1,
          scaleY: 1,
          '--alt': 14,
        },
        11.65,
      ),
    );
    tl.set(mar.wake, { scaleY: 1, opacity: 1 }, 11.65)
      .set(els, { overflow: 'visible' }, 11.65)
      .to(strips.map((s) => s.veh), { autoAlpha: 1, duration: 0.5, stagger: 0.12 }, 11.7)
      .set({}, {}, 12.6);

    const handlers = [
      [mar, 'mar'],
      [terra, 'terra'],
      [ar, 'ar'],
    ].map(([s, label]) => {
      const fn = () => scrollToLabel(tl, label);
      s.el.addEventListener('focusin', fn);
      return [s.el, fn];
    });
    return () => handlers.forEach(([el, fn]) => el.removeEventListener('focusin', fn));
  });

  /* ─────────── Celular: uma faixa por tela, a trilha desliza ─────────── */
  mm.add('(max-width: 899px)', () => {
    gsap.set(strips.map((s) => s.veh), { autoAlpha: 0, x: 0, y: 0, rotation: 0 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${vh() * 4.2}`, pin: true, scrub: true, invalidateOnRefresh: true },
    });
    const travel = (s, at, duration) => {
      const o = { t: 0 };
      tl.fromTo(o, { t: 0 }, { t: 1, duration, onUpdate: () => DRIVE[s.key](s, o.t) }, at);
    };
    const plan = (s, at) =>
      tl.fromTo(s.plan, { opacity: 0, strokeDashoffset: 400 }, { opacity: 1, strokeDashoffset: 0, duration: 0.6 }, at).fromTo(
        [...s.dots, ...s.labels],
        { opacity: 0 },
        { opacity: 1, duration: 0.2, stagger: 0.1 },
        at + 0.2,
      );
    const slideTo = (s, at) => tl.to(track, { x: () => -s.el.offsetLeft, duration: 0.8, ease: 'power2.inOut' }, at);

    tl.addLabel('mar', 0).set(strips.map((s) => s.el), { overflow: 'hidden' }, 0.001);
    plan(mar, 0);
    tl.to(strips.map((s) => s.tel), { opacity: 1, duration: 0.3 }, 0)
      .set(mar.veh, { autoAlpha: 1 }, 0.3)
      .to(mar.bg, { '--bgy': '700px', duration: 2.6 }, 0);
    travel(mar, 0.3, 2.1);

    tl.addLabel('terra', 2.6).to(mar.veh, { autoAlpha: 0, duration: 0.3 }, 2.6);
    slideTo(terra, 2.6);
    plan(terra, 3.2);
    tl.set(terra.veh, { autoAlpha: 1 }, 3.4)
      .to(terra.bg, { '--bgy': '-1300px', duration: 2.8 }, 2.6)
      .fromTo(q('img', terra.bg), { yPercent: 10 }, { yPercent: -10, duration: 2.8 }, 2.6);
    travel(terra, 3.4, 2);

    tl.addLabel('ar', 5.6).to(terra.veh, { autoAlpha: 0, duration: 0.3 }, 5.6);
    slideTo(ar, 5.6);
    plan(ar, 6.2);
    tl.set(ar.veh, { autoAlpha: 1 }, 6.4)
      .fromTo(ar.clouds, { yPercent: -12 }, { yPercent: 26, duration: 2.6 }, 6);
    travel(ar, 6.4, 2.2);
    tl.call(() => ar.route.classList.add('is-arrived'), null, 8.62)
      .call(() => ar.route.classList.remove('is-arrived'), null, 8.6)
      .set({}, {}, 9);
  });

  return section;
}
