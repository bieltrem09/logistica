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
js/motion.js               Orquestrador da animação: entrada, ScrollSmoother e a ordem das seções
js/animations/
  utils.js                 Ajudantes: perfil de velocidade (trapézio), mola, ponto na rota, formato pt-BR
  text.js                  Máscara por linha e SplitText
  hero.js                  Hero: entrada, física, telemetria, parallax, mouse, portas (initHeroAnimation)
  about.js                 01: manifesto ligado à rolagem + ficha lateral (initSection2/3Animation)
  journey.js               02: MAR → TERRA → AR com rotas e a carga trocando de veículo (initLogisticsJourney)
  services.js              03: guindaste baixa o contêiner azul, que vira campo (initSection5Animation)
  yard.js                  03b: carrossel do pátio com pêndulo (initContainerCarousel)
  statistics.js            04: contadores precisos (initStatistics, countUp)
  sections.js              05–08, rodapé, cabeçalhos de seção, fade-ups, encaixe dos blocos
  pointer.js               Cursor, magnéticos, foto do Sobre com o mouse, âncoras
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
| Fases do hero (espera, descida, aproximação, portas) | `HERO_PHASES` em `js/hero-rig.js` e altura do `.hero-spacer` (1,5 × hero) em `js/animations/hero.js` |
| Antecipação (cabo tensiona, carro anda antes da carga) | `preload` / `lead` em `js/hero-rig.js` |
| Quanto a lança desce, cede e sobe | `boomDrop`, `sag` e `lift` em `js/hero-rig.js`; tamanho em `--crane-h` (`css/style.css`) |
| Peso do balanço (gravidade, amortecimento, quique do cabo) | constantes em `js/cable-physics.js` |
| Quanto a rolagem rápida sacode o contêiner | `targetX` / `targetZ` em `js/hero-rig.js` |
| Rotas do navio, caminhão e avião | `ROUTES` em `js/animations/journey.js` (em px da faixa aberta) |
| Aceleração e frenagem de cada veículo | `PROFILES` em `js/animations/journey.js` |
| Duração da jornada | `end: vh() * 6` (desktop) e `vh() * 4.2` (celular) em `js/animations/journey.js` |
| Peso do contêiner azul (mola) | `createSpring({ stiffness, damping })` em `js/animations/services.js` |
| Pêndulo do pátio e encaixe | `pendulum` e `snap` em `js/animations/yard.js` |

**Fotos do hero (opcionais, entram sozinhas quando o arquivo existe):**

| Arquivo | O que deve ser | Sem o arquivo |
|---|---|---|
| `assets/img/hero-container.png` | Recorte com fundo transparente, proporção 1000 × 780, gancho no centro do topo (como o vetor). O hero usa a foto com a mesma física e as portas recebem a foto. | Contêiner 3D (ou vetor 2D sem WebGL) |
| `assets/img/hero-guindaste.png` | Recorte com fundo transparente **só da lança** (sem os ganchos da foto), na horizontal, com a polia da ponta encostada na borda direita. Ajuste fino da posição da polia em `--crane-ax` / `--crane-ay` (`css/style.css`). | Lança vetorial |

Use somente arquivos licenciados, sem marca-d'água (a prévia com marca-d'água de banco de imagens não pode ser publicada).

**Guindaste:** a lança é basculante. Na carga da página a ponta fica acima da tela; rolando, é ela que desce levando
o contêiner e aparece por baixo do cabeçalho. A lança acompanha o carro (mouse e rolagem rápida), cede quando o cabo
estica e sobe para fora de quadro quando o contêiner vem para a câmera. A física considera a lança descendo
(gravidade efetiva e cabo elástico) em `js/cable-physics.js`.

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
  testada também sem WebGL (vetor 2D) e com movimento reduzido (site estático).
- Menu mobile: foco no primeiro link, `Esc` fecha e devolve o foco, conteúdo `inert` enquanto aberto.
- Cabeçalho herda o tema da seção sob ele (claro, escuro, azul, laranja).
