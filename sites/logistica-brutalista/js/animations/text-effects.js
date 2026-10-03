/**
 * Títulos das seções: os componentes TextBlurReveal e TextMorph (React + Motion)
 * portados para o GSAP do site, com os mesmos tempos. O site é HTML/JS puro, sem React.
 *
 *   blurReveal  as palavras entram desfocadas de cima e assentam em dois passos
 *               (desfoque 10 → 5 → 0, opacidade 0 → 0,5 → 1, y −50 → 5 → 0), 200 ms entre palavras
 *   textMorph   uma palavra do título troca a cada 2,5 s: as letras da antiga sobem e desfocam,
 *               as da nova sobem do desfoque, 30 ms entre letras
 *
 * Os componentes foram desenhados para texto de ~36 px. Aqui distâncias e desfoque crescem
 * com o corpo do título (até 1,6×; no celular ficam no tamanho original, mais leve).
 * Com movimento reduzido nada disso roda (motion.js não inicia): os títulos ficam parados.
 */
import { qa, clamp, labelFromText } from './utils.js';

const { gsap, ScrollTrigger, SplitText } = window;

const BASE_PX = 36;
// desfoque é caro em letras gigantes: o efeito cresce com o título só até 1,6× (no celular, 1×)
const MAX_SCALE = window.matchMedia('(max-width: 899px)').matches ? 1 : 1.6;
const scaleOf = (el) => clamp(parseFloat(getComputedStyle(el).fontSize) / BASE_PX, 1, MAX_SCALE);
const blur = (px) => `blur(${px}px)`;

/** TextBlurReveal: revela o título palavra a palavra (ou letra a letra) ao entrar na tela. */
export function blurReveal(title, { by = 'words', direction = 'top', delay = 200, stepDuration = 0.35, start = 'top 85%', onComplete } = {}) {
  labelFromText(title);
  const splits = qa('.line__inner', title).map((inner) =>
    SplitText.create(inner, { type: by === 'letters' ? 'words,chars' : 'words', tag: 'span', aria: 'none' }),
  );
  const segments = splits.flatMap((s) => (by === 'letters' ? s.chars : s.words));
  gsap.set(segments, { opacity: 0 });

  const play = () => {
    const k = scaleOf(title);
    const fromY = (direction === 'top' ? -50 : 50) * k;
    const midY = (direction === 'top' ? 5 : -5) * k;
    gsap.set(segments, { y: fromY, filter: blur(10 * k) });
    gsap.to(segments, {
      keyframes: {
        opacity: [0, 0.5, 1],
        y: [fromY, midY, 0],
        filter: [blur(10 * k), blur(5 * k), blur(0)],
        easeEach: 'power1.out',
      },
      ease: 'none',
      duration: Math.max(0.1, stepDuration * 2),
      stagger: delay / 1000,
      onComplete: () => {
        splits.forEach((s) => s.revert()); // HTML original de volta (kerning e quebras intactos)
        onComplete?.();
      },
    });
  };

  ScrollTrigger.create({ trigger: title, start, once: true, onEnter: play });
}

/** Troca o texto de um elemento por uma letra por <span> (espaços viram não separáveis). */
function splitChars(el) {
  const chars = Array.from(el.textContent).map((ch) => {
    const span = document.createElement('span');
    span.className = 'morph__char';
    span.textContent = ch === ' ' ? ' ' : ch;
    return span;
  });
  el.replaceChildren(...chars);
  return chars;
}

/**
 * TextMorph: o elemento `host` (uma palavra do título, com data-morph="a|b|c") passa a
 * alternar entre as palavras. Só troca com o título na tela e a aba visível.
 */
export function textMorph(host, { interval = 2500 } = {}) {
  const words = (host.dataset.morph || '').split('|').map((w) => w.trim()).filter(Boolean);
  if (words.length < 2) return;

  const title = host.closest('h1, h2, h3') || host;
  // Linha alinhada à direita: a palavra que sai fica presa pela direita, como estava
  const anchor = getComputedStyle(host.closest('.line') || host.parentElement).textAlign;
  const side = anchor === 'right' || anchor === 'end' ? 'right' : 'left';

  const makeWord = (text) => {
    const w = document.createElement('span');
    w.className = 'morph__word';
    w.textContent = text;
    return w;
  };

  let index = words.indexOf(host.textContent.trim());
  if (index < 0) index = 0;
  let current = makeWord(words[index]);
  host.replaceChildren(current);
  host.classList.add('is-morphing');

  let visible = false;
  ScrollTrigger.create({
    trigger: title,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      visible = self.isActive;
    },
  });

  const morph = () => {
    const k = scaleOf(host);
    const old = current;
    const fromWidth = host.offsetWidth;
    index = (index + 1) % words.length;
    current = makeWord(words[index]);

    // A palavra antiga sai do fluxo (popLayout) e some letra a letra, subindo
    gsap.set(old, { position: 'absolute', top: 0, [side]: 0 });
    const oldChars = splitChars(old);
    gsap.to(old, { opacity: 0, y: -5 * k, duration: 0.4, onComplete: () => old.remove() });
    gsap.to(oldChars, { opacity: 0, y: -5 * k, filter: blur(5 * k), duration: 0.3, stagger: 0.03 });

    // A nova entra letra a letra; a largura acompanha sem empurrar a linha de uma vez
    const word = current;
    const text = words[index];
    host.append(word);
    const chars = splitChars(word);
    gsap.fromTo(host, { width: fromWidth }, { width: word.offsetWidth, duration: 0.4, ease: 'power2.out', clearProps: 'width' });
    gsap.fromTo(word, { opacity: 0, y: 5 * k }, { opacity: 1, y: 0, duration: 0.4 });
    gsap.fromTo(
      chars,
      { opacity: 0, y: 5 * k, filter: blur(5 * k) },
      {
        opacity: 1,
        y: 0,
        filter: blur(0),
        duration: 0.3,
        stagger: 0.03,
        onComplete: () => {
          word.textContent = text; // de volta ao texto corrido: o kerning da fonte volta a valer
        },
      },
    );
  };

  const loop = () => {
    if (visible && !document.hidden) morph();
    gsap.delayedCall(interval / 1000, loop);
  };
  gsap.delayedCall(interval / 1000, loop);
}

/** Títulos das seções: revelação com desfoque e, onde houver data-morph, a palavra que troca. */
export function initTitleEffects(titles) {
  titles.filter(Boolean).forEach((title) => {
    blurReveal(title, {
      onComplete: () => qa('[data-morph]', title).forEach((host) => textMorph(host)),
    });
  });
}
