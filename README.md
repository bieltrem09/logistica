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
js/motion.js               Toda a animação (GSAP + ScrollTrigger + ScrollSmoother + SplitText)
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
| Duração das fases do hero (descida, aproximação, portas) | `HERO_PHASES` em `js/hero-rig.js` e altura do `.hero-spacer` (1,5 × hero) em `js/motion.js` |
| Peso do balanço (gravidade, amortecimento, quique do cabo) | constantes em `js/cable-physics.js` |
| Quanto a rolagem rápida sacode o contêiner | `targetX` / `targetZ` em `js/hero-rig.js` |
| Duração do tríptico e de cada veículo | `buildModais()` em `js/motion.js` (`end: vh() * 5`) |
| Velocidade do carrossel e encaixe | `buildYard()` em `js/motion.js` |

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
