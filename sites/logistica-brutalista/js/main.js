/**
 * VETOR Logística — main.js
 *
 * Comportamentos base (funcionam sem animação). A camada de movimento fica em
 * js/motion.js (GSAP + ScrollTrigger + ScrollSmoother + SplitText + Three.js) e usa os ganchos:
 *   data-anim="fade-up | split-text | parallax | reveal-img | counter | stagger |
 *              pin | horizontal | magnetic | marquee"
 *   data-speed (camadas do hero: céu 0.6, título 0.85, contêiner 1.15)
 *   #smooth-wrapper > #smooth-content, <canvas id="webgl">, #preloader, #cursor
 */

const root = document.documentElement;
const header = document.getElementById('site-header');
const desktopNav = window.matchMedia('(min-width: 1180px)');

root.classList.add('js');

/* Largura real da barra de rolagem → --sbw.
   Os títulos gigantes usam esse valor para ocupar exatamente 100% da largura útil. */
function measureScrollbar() {
  root.style.setProperty('--sbw', `${window.innerWidth - root.clientWidth}px`);
}

/* Imagem ausente: troca pelo vetor de reserva (data-fallback)
   ou marca o bloco com .is-missing (cor sólida + etiqueta técnica). */
function initMediaFallbacks() {
  const handle = (img) => {
    const { fallback } = img.dataset;
    if (fallback && img.getAttribute('src') !== fallback) {
      img.src = fallback;
      return;
    }
    img.closest('.media')?.classList.add('is-missing');
  };

  document.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => handle(img));
    if (img.complete && img.naturalWidth === 0) handle(img);
  });
}

/* Observa uma faixa de 1px na altura `offset` da janela e avisa qual seção está nela. */
function watchBand(targets, offset, onEnter) {
  let observer;

  const build = () => {
    observer?.disconnect();
    const top = Math.round(offset());
    const bottom = Math.max(window.innerHeight - top - 1, 0);
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) onEnter(entry.target);
        });
      },
      { rootMargin: `-${top}px 0px -${bottom}px 0px` },
    );
    targets.forEach((target) => observer.observe(target));
  };

  build();
  return build;
}

/* Cabeçalho: herda o tema da seção que passa por baixo dele e fica sólido após rolar. */
function initHeader() {
  const sections = document.querySelectorAll('main > section[data-theme], .site-footer[data-theme]');
  const navLinks = [...document.querySelectorAll('.site-nav a')];

  const rebuildTheme = watchBand(
    sections,
    () => header.offsetHeight / 2,
    (section) => {
      header.dataset.theme = section.dataset.theme;
    },
  );

  const rebuildCurrent = watchBand(
    sections,
    () => window.innerHeight / 2,
    (section) => {
      navLinks.forEach((link) => {
        if (link.hash === `#${section.id}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    },
  );

  let ticking = false;
  const updateState = () => {
    header.dataset.state = window.scrollY > 8 ? 'scrolled' : 'top';
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateState);
      }
    },
    { passive: true },
  );
  updateState();

  return () => {
    rebuildTheme();
    rebuildCurrent();
  };
}

/* Menu em tela cheia (celular e tablet). */
function initMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu');
  const label = toggle.querySelector('.menu-toggle__label');
  const page = document.getElementById('smooth-wrapper');

  const open = () => {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    label.textContent = 'Fechar';
    root.classList.add('is-menu-open');
    page.inert = true;
    menu.querySelector('a')?.focus();
  };

  const close = ({ restoreFocus = true } = {}) => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    label.textContent = 'Menu';
    root.classList.remove('is-menu-open');
    page.inert = false;
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => (menu.hidden ? open() : close()));

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) close({ restoreFocus: false });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) close();
  });

  desktopNav.addEventListener('change', (event) => {
    if (event.matches && !menu.hidden) close({ restoreFocus: false });
  });
}

/* Rastreamento: o formulário envia o código para o portal real (GET ?codigo=). */
function initTracking() {
  const form = document.querySelector('.track-form');
  if (!form) return;

  const input = form.querySelector('.track-form__input');
  const error = document.getElementById('track-error');

  const clearError = () => {
    error.textContent = '';
    input.removeAttribute('aria-invalid');
  };

  form.addEventListener('submit', (event) => {
    const code = input.value.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) {
      event.preventDefault();
      error.textContent = 'Digite o código de rastreio que está na nota fiscal ou no WhatsApp.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    input.value = code;
    clearError();
  });

  input.addEventListener('input', () => {
    if (error.textContent) clearError();
  });
}

function initYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = year;
  });
}

measureScrollbar();
initMediaFallbacks();
const rebuildObservers = initHeader();
initMenu();
initTracking();
initYear();

/* Camada de animação (GSAP + Three.js). Se falhar, o site segue no estado estático. */
import('./motion.js')
  .then(({ initMotion }) =>
    initMotion({
      setHeaderTheme: (theme) => {
        header.dataset.theme = theme;
      },
    }),
  )
  .catch((err) => {
    console.warn('[vetor] animação indisponível:', err);
    clearTimeout(window.__vetorLoadTimer);
    root.classList.remove('is-loading');
  });

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    measureScrollbar();
    rebuildObservers();
  }, 150);
});
