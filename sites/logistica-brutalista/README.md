# VETOR Logística: site institucional

Site one-page de uma transportadora (rodoviário, marítimo e aéreo) em **brutalismo editorial**.
HTML semântico + CSS moderno + JavaScript vanilla (ES modules). Sem frameworks e sem build.

A direção de arte, os prompts de imagem, o contrato de animação e o checklist do que trocar
estão em [`DIRECAO-DE-ARTE.md`](DIRECAO-DE-ARTE.md).

## Rodar localmente

```bash
cd sites/logistica-brutalista
npx serve .          # ou: python3 -m http.server 8080
```

Abra o endereço exibido. Um servidor é necessário porque `js/main.js` é um ES module.

## Estrutura

```
index.html                 Página: entrada + hero em 4 camadas + 8 seções + rodapé
css/style.css              Tokens, temas por seção, layout mobile-first; seção 19 = estados com animação
js/main.js                 Cabeçalho que inverte a cor, menu em tela cheia, fallback de imagens, rastreio
js/motion.js               Orquestrador da animação: liga GSAP e chama um módulo por seção
js/animations/             Uma função por seção:
  hero.js                    initHeroAnimation      contêiner no guindaste, linhas de rota, portas
  section2.js                initSection2Animation  manifesto palavra a palavra (scrub)
  section3.js                initSection3Animation  texto, ficha técnica e foto do "Sobre"
  journey.js                 initLogisticsJourney   MAR → TERRA → AR com rota desenhada
  section5.js                initSection5Animation  o azul nasce do ● e corta "SERVIÇOS"
  carousel.js                initContainerCarousel  pátio: carrossel horizontal fixo
  statistics.js              initStatistics         contadores
  closing.js, global.js      processo, clientes, rastreio, contato, rodapé; cabeçalhos, cursor, âncoras
  text-effects.js            initTitleEffects       títulos das seções: entram com desfoque (TextBlurReveal) e uma palavra troca (TextMorph)
  intro.js, utils.js         porta de enrolar de entrada; ajudantes de texto e números
js/hero-3d.js              Contêiner 3D do hero (Three.js)
js/hero-rig.js             Geometria do hero + piloto que converte rolagem em comando de guindaste
js/cable-physics.js        Física do cabo: balanço, profundidade, giro, elasticidade
js/textures.js             Texturas do contêiner em canvas (lateral, portas, frente, teto)
assets/img/                Fotos finais (ver lista em DIRECAO-DE-ARTE.md)
assets/img/fallback/       Vetores de reserva: navio, caminhão e avião vistos de cima
assets/fonts/              Opcional: fontes auto-hospedadas
```

## Animação

Bibliotecas por CDN (jsDelivr): GSAP 3.13 (ScrollTrigger, ScrollSmoother, SplitText) e Three.js 0.169.
A sequência completa está descrita em `DIRECAO-DE-ARTE.md` (seção 4). Onde ajustar:

| O quê | Onde |
|---|---|
| Fases do hero (repouso, descida, aproximação, portas) | `HERO_PHASES` em `js/hero-rig.js`; rolagem total = hero + `.hero-spacer` (2 × hero) em `js/animations/hero.js` |
| Peso do balanço (gravidade, amortecimento, folga das lingas, quique do cabo) | constantes em `js/cable-physics.js` |
| Quanto o carro anda e quanto a rolagem rápida sacode o contêiner | `targetX` / `targetZ` em `js/hero-rig.js` |
| Traçado das rotas da seção 4 (desktop e celular) | `ROUTES` em `js/animations/journey.js` (coordenadas 0–1 da faixa; cada rota termina onde a próxima começa) |
| Duração da jornada e de cada veículo | `initLogisticsJourney()` (`end: vh() * 7.5` no desktop, `5.4` no celular) |
| Forma e tempo do azul da seção 5 | `initSection5Animation()` (`DOT`, `start`/`end` do ScrollTrigger) |
| Transição do carrossel e encaixe | `focus()` e `snap` em `js/animations/carousel.js` |
| Palavras que trocam nos títulos | atributo `data-morph="a\|b\|c"` no `index.html` (cada alternativa não pode ser mais larga que a linha mais longa do título); tempos em `js/animations/text-effects.js` |

**Robustez:** a tela de entrada some sozinha em 9 s se algo falhar. Sem WebGL, o mesmo movimento roda no vetor 2D.
Com `prefers-reduced-motion`, sem JS ou sem acesso ao CDN, o site fica no estado estático completo.

## Decisões que importam

- **Títulos a 100% da largura:** cada título display tem `--fit`, a largura (em `em`) da sua linha mais
  longa medida em Anton. `font-size = largura útil / --fit`. O JS informa a largura da barra de rolagem
  (`--sbw`) para o cálculo ser exato. Se mudar o texto de um título, meça de novo e atualize `--fit`.
- **Acentos e entrelinha 0.85:** as quebras de linha foram escolhidas para que Ã, É, Á caiam sobre espaço
  vazio da linha de cima. Ao reescrever um título de várias linhas, confira se algum acento colide.
- **Imagens ausentes não quebram o layout:** `main.js` troca o `src` por `data-fallback` (vetores) ou marca
  o bloco com `.is-missing`, que mostra cor sólida, fundo desenhado em CSS ou etiqueta técnica.
- **Hero:** céu (0.6) → título (0.85) → contêiner com cabo (1.15) → interface. A posição do contêiner é
  calculada a partir do tamanho do título (`--fs`, `--w`, `--cable`), então ele cai sempre sobre as letras.
- **Estado estático primeiro:** toda animação parte do layout estático e só liga com `html.has-motion`;
  nada fica invisível se o JS falhar.

## Verificado

- Layout em 360, 390, 768, 1024, 1280, 1366, 1440 e 1920 px, sem rolagem horizontal.
- axe-core (WCAG 2.1 AA + boas práticas): 0 violações em 1440 px e 360 px (e com movimento reduzido).
- Animação percorrida de ponta a ponta em 1440 px e 390 px sem erros nem avisos no console;
  testada também sem WebGL (vetor 2D), com movimento reduzido (site estático) e trocando de
  desktop para celular com a página aberta.
- Física do hero simulada a 60 fps com rolagem lenta, média, rápida, vai-e-volta e salto por âncora:
  balanço máximo de ~7° numa rolagem média, assenta em poucos segundos, sem valores inválidos.
- Contadores conferidos quadro a quadro: sobem sem pular para trás e terminam no valor exato.
- Menu mobile: foco no primeiro link, `Esc` fecha e devolve o foco, conteúdo `inert` enquanto aberto.
- Cabeçalho herda o tema da seção sob ele (claro, escuro, azul, laranja).
