/**
 * Depoimentos — o componente "Unique Testimonial" (21st.dev) em JS puro.
 *
 * Uma fala por vez. Ao escolher outro cliente: a fala some com desfoque e leve
 * encolhida e o cargo desce (CSS, 0,4–0,5 s); aos 200 ms o texto troca; 400 ms
 * depois tudo volta. Enquanto troca, novos cliques são ignorados (como no original).
 * Os avatares formam uma lista de abas: setas ←/→, Home e End navegam pelo teclado.
 * Com movimento reduzido a troca é imediata. Sem JS, as falas ficam todas visíveis.
 */
export function initTestimonials() {
  const root = document.querySelector('[data-voices]');
  if (!root) return;
  const items = [...root.querySelectorAll('.voices__item')];
  const tabs = [...root.querySelectorAll('.voice')];
  if (!items.length || items.length !== tabs.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = Math.max(0, tabs.findIndex((t) => t.classList.contains('is-active')));
  let busy = false;

  const show = (index) => {
    items.forEach((item, i) => {
      const on = i === index;
      item.classList.toggle('is-active', on);
      item.hidden = false;
      item.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    active = index;
  };

  const select = (index) => {
    if (index === active || busy) return;
    if (reduce.matches) {
      show(index);
      return;
    }
    busy = true;
    root.classList.add('is-switching');
    setTimeout(() => {
      show(index);
      setTimeout(() => {
        root.classList.remove('is-switching');
        busy = false;
      }, 400);
    }, 200);
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      const to = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: last }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      if (busy) return;
      const next = (to + tabs.length) % tabs.length;
      tabs[next].focus();
      select(next);
    });
  });

  show(active);
  root.classList.add('is-ready');
}
