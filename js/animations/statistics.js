/**
 * Números da operação: contadores precisos (sem dígitos girando ao acaso).
 *
 * Valores grandes sobem por ordem de grandeza (0 → 1 → 12 → 120 → 1.200 → 12.000),
 * valores pequenos e porcentagens sobem em linha com desaceleração (0% → 42% → 98,7%).
 * A largura do número fica travada no valor final, então nada empurra o layout.
 * Leitores de tela recebem só o valor final.
 */
import { q, qa, fmt } from './utils.js';
import { maskLines, splitInner, labelFromText } from './text.js';

const { gsap } = window;

/** Anima um número dentro de `el` até `to`. Devolve o tween (pausado se `paused`). */
export function countUp(el, { to, decimals = 0, pad = 0, duration = 2.2, ease = 'power3.out', mode = 'auto', paused = false } = {}) {
  const final = fmt(to, { decimals, pad });
  el.textContent = final;
  el.style.display = 'inline-block';
  el.style.minWidth = `${el.getBoundingClientRect().width}px`;
  const log = mode === 'log' || (mode === 'auto' && to >= 1000 && decimals === 0);
  const o = { t: 0 };
  const render = () => {
    const v = log ? Math.pow(to + 1, o.t) - 1 : to * o.t;
    el.textContent = fmt(o.t >= 1 ? to : decimals ? v : Math.floor(v), { decimals, pad });
  };
  render();
  return gsap.to(o, { t: 1, duration, ease, paused, onUpdate: render });
}

/** Troca o texto por contadores: "+12.000" → [12000], "24/7" → [24, 7]. */
export function prepareCounters(el) {
  const text = el.textContent.trim();
  const dataCount = el.dataset.count;
  el.innerHTML = `<span class="sr-only">${text}</span><span class="count" aria-hidden="true"></span>`;
  const out = q('.count', el);
  const parts = dataCount
    ? [{ num: Number(dataCount), decimals: Number(el.dataset.decimals || 0) }]
    : text.split(/(\d+(?:[.,]\d+)?)/).map((chunk) => {
        if (!/^\d/.test(chunk)) return { text: chunk };
        // zeros à esquerda só quando o texto original já tem ("0012"), nunca em "24/7"
        const pad = chunk.startsWith('0') ? chunk.length : 0;
        return { num: Number(chunk.replace(/\./g, '').replace(',', '.')), decimals: (chunk.split(',')[1] || '').length, pad };
      });
  return parts
    .map((part) => {
      const span = document.createElement('span');
      out.append(span);
      if (part.text !== undefined) {
        span.textContent = part.text;
        return null;
      }
      return { span, ...part };
    })
    .filter(Boolean);
}

/** 04 Números: "PESO PESADO." cai com peso, "PRAZO LEVE." desliza; contadores com precisão. */
export function initStatistics() {
  const title = q('.numbers__title');
  labelFromText(title);
  const [l1, l2] = maskLines(title);
  const s1 = splitInner(l1, 'chars');
  const s2 = splitInner(l2, 'chars');
  gsap
    .timeline({
      scrollTrigger: { trigger: title, start: 'top 80%', once: true },
      onComplete: () => {
        s1.revert();
        s2.revert();
      },
    })
    .from(s1.chars, { yPercent: -200, duration: 1.15, ease: 'bounce.out', stagger: 0.045 })
    .from(s2.chars, { x: () => window.innerWidth * 0.6, duration: 0.8, ease: 'power3.out', stagger: 0.02 }, '-=0.6');

  qa('.stat').forEach((stat, si) => {
    const counters = qa('[data-anim="counter"]', stat).flatMap(prepareCounters);
    const tl = gsap
      .timeline({ scrollTrigger: { trigger: stat, start: 'top 88%', once: true }, delay: (si % 3) * 0.12 })
      .from(stat.children, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 });
    counters.forEach((c, i) => {
      // "24/7": o número da esquerda encosta na barra enquanto conta
      if (i < counters.length - 1) c.span.style.textAlign = 'right';
      tl.add(countUp(c.span, { to: c.num, decimals: c.decimals, pad: c.pad, duration: 2.1, ease: 'expo.out' }), 0.2 + i * 0.12);
    });
    // O código do KPI é impresso da esquerda para a direita quando o número assenta
    tl.from(q('.stat__code', stat), { clipPath: 'inset(0% 100% 0% 0%)', duration: 0.7, ease: 'power2.inOut' }, 1.1);
    const affix = qa('.stat__affix', stat);
    if (affix.length) tl.from(affix, { opacity: 0, x: 10, duration: 0.5 }, 1.2);
  });
}
