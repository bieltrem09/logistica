/**
 * NÚMEROS — dados da operação.
 *
 * O título cai com peso ("Peso pesado.") e desliza leve ("Prazo leve.").
 * Cada número conta de 0 até o valor real, sem saltos aleatórios:
 *   - milhares contam em escala logarítmica, passando por cada ordem de grandeza
 *     (0 → 1 → 12 → 120 → 1.200 → 12.000) e desaceleram no fim;
 *   - porcentagens e números pequenos contam em linha reta com easing de saída
 *     (0 → 15 → 42 → 78 → 98,7);
 *   - "24/7" conta as duas partes.
 * A largura final é reservada para os sufixos (%, m², anos) não andarem.
 * Leitores de tela recebem o valor final desde o início.
 */
import { qa, fmt } from './utils.js';

const { gsap } = window;

/** Transforma o texto do contador em partes numéricas animáveis. */
function buildCounter(el) {
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  const parts = text.split(/(\d+(?:\.\d{3})*(?:,\d+)?)/).filter(Boolean);
  el.innerHTML = parts
    .map((part) => {
      if (!/^\d/.test(part)) return `<span class="count__sep" aria-hidden="true">${part}</span>`;
      const decimals = (part.split(',')[1] || '').length;
      const value = Number(part.replace(/\./g, '').replace(',', '.'));
      return `<span class="count__num" aria-hidden="true" data-value="${value}" data-decimals="${decimals}">${part}</span>`;
    })
    .join('');
  return qa('.count__num', el).map((node) => ({
    node,
    value: Number(node.dataset.value),
    decimals: Number(node.dataset.decimals),
  }));
}

/** Valor exibido para o tempo t (0–1) da contagem. */
function valueAt({ value }, t) {
  if (value >= 1000) return (value + 1) ** gsap.parseEase('power2.out')(t) - 1; // uma ordem de grandeza por vez
  return value * gsap.parseEase('power3.out')(t);
}

export function initStatistics() {
  qa('.stat').forEach((stat, si) => {
    const counters = qa('[data-anim="counter"]', stat).flatMap(buildCounter);
    const affix = qa('.stat__affix', stat);

    // Reserva a largura final (em em, acompanha o tamanho da fonte): o número cresce sem empurrar o sufixo
    counters.forEach((c) => {
      const em = c.node.getBoundingClientRect().width / parseFloat(getComputedStyle(c.node).fontSize);
      c.node.style.minWidth = `${em.toFixed(3)}em`;
      c.node.textContent = fmt(0, 0, c.decimals);
    });
    const leadingAffix = affix.length && stat.querySelector('.stat__value').firstElementChild === affix[0];
    stat.classList.toggle('stat--lead-affix', !!leadingAffix);

    const o = { t: 0 };
    const render = () =>
      counters.forEach((c) => {
        c.node.textContent = fmt(valueAt(c, o.t), 0, c.decimals);
      });

    const tl = gsap
      .timeline({ scrollTrigger: { trigger: stat, start: 'top 88%', once: true }, delay: (si % 3) * 0.12 })
      .from(stat.children, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 })
      .to(o, { t: 1, duration: 2.4, ease: 'none', onUpdate: render }, 0.15);
    if (affix.length) tl.from(affix, { opacity: 0, x: leadingAffix ? -8 : 8, duration: 0.5, ease: 'power2.out' }, 1.2);
  });
}
