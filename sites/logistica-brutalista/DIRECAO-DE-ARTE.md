# VETOR Logística: direção de arte

> **Conceito:** "Carga pesada, tipografia pesada." O site é um pátio de contêineres: grid rígido, blocos empilhados, dados técnicos expostos. O impacto vem do choque entre escalas (título de 25vw ao lado de microtexto de 11px), não da decoração.

**Nota sobre as referências:** as imagens mencionadas no briefing não chegaram anexadas à conversa. O DNA abaixo foi construído a partir das descrições escritas de cada referência. Se você reenviar as imagens, dá para refinar composição e proporções.

---

## 1. DNA visual das referências

### 1.1 "BRUTALISMO" (RUTA / NEXO)
- **a) Composição:** a tipografia é a estrutura. A palavra ocupa a largura inteira e a imagem entra no meio dela, por cima ou por dentro das letras. Blocos duros e retangulares, sem respiro decorativo.
- **b) Tipografia:** ultra condensada, preta, caixa alta, entrelinha abaixo de 0.9, tracking negativo. Microtexto técnico ao lado.
- **c) Paleta:** preto sobre off-white. Contraste máximo com uma única cor de sinal.
- **d) Imagem:** foto em recorte duro (sem máscara suave) que "corta" a palavra, ou seja, tipo e foto disputam o mesmo espaço.
- **e) Apoio:** botões circulares com seta, pills com borda de 1px, numeração 01 / 02 com fio fino.
- **f) Premium:** a disciplina. Poucos elementos, todos alinhados ao grid, e a escala exagerada feita de propósito.

### 1.2 Contêiner laranja suspenso ("ABOUT PROJECT")
- **a)** Objeto isolado no centro, pendurado, sobrepondo a palavra gigante. Três planos claros: fundo, palavra, objeto.
- **b)** Palavra gigante atrás do objeto, legível mesmo parcialmente coberta.
- **c)** Laranja saturado contra fundo neutro frio.
- **d)** Recorte limpo (PNG), luz de estúdio, sombra dura no próprio objeto.
- **e)** Cabos como linhas finas que ligam o objeto à borda do quadro e dão tensão vertical.
- **f)** A profundidade: o texto passa por trás, criando camada real, não apenas sobreposição.

### 1.3 Guindaste laranja + céu ("INFLUENCE PRO")
- **a)** Céu como campo vazio; título gigante alinhado à direita; círculo de CTA como ponto focal.
- **b)** Título pesado com alinhamento assimétrico (direita).
- **c)** Azul-acinzentado dessaturado + laranja como cor de sinal (usada pouco, por isso funciona).
- **d)** Céu cinematográfico, nuvens com volume, luz difusa.
- **e)** Círculo laranja com seta.
- **f)** O vazio controlado: a maior parte do quadro é céu, e o que sobra ganha peso.

### 1.4 Contêineres empilhados 01 / 02 / 03
- **a)** Módulos retangulares empilhados com pequenos desalinhamentos, como num pátio real.
- **b)** Numeração grande + dados pequenos em mono.
- **c)** Preto / branco / azul, com HEX, RGB e CMYK escritos como especificação técnica.
- **d)** Superfície corrugada, cantoneiras escuras.
- **e)** Ficha técnica no canto, código do contêiner.
- **f)** A cor vira dado: a paleta é apresentada como documentação industrial.

### 1.5 Tríptico navio / caminhão / avião (vista de cima)
- **a)** Três faixas verticais de mesma largura, uma por modal, e o veículo atravessa a linha divisória.
- **b)** Nome do modal em escala grande na base de cada faixa.
- **c)** Cada faixa tem uma cor dominante (mar azul, asfalto preto, céu claro).
- **d)** Vista ortográfica de cima, sem perspectiva, quase diagramática.
- **e)** Linhas divisórias finas; o veículo "quebra" a regra do grid.
- **f)** Um único gesto (cruzar a linha) conta a história do intermodal.

### 1.6 Fotos reais (navio em alto-mar, caminhão na estrada)
- Material documental que ancora o site no mundo real. Tratamento: contraste alto, leve dessaturação, sombras profundas, laranja e azul preservados (no CSS: `filter: saturate(.86) contrast(1.08)`).

### 1.7 Tradução para a VETOR
| Referência | Onde entrou | Como foi adaptada |
|---|---|---|
| Brutalismo | Todo o site; "SERVIÇOS" | Palavra a 100% da largura; a foto corta as letras e, sobre a foto, a palavra continua **em contorno** (não em cor sólida). |
| Contêiner suspenso | Hero | Contêiner laranja com estêncil "VETOR", código ISO real (`VTRU 204816 3`, `22G1`) e etiqueta técnica ligada por fio. |
| Guindaste + céu | Hero | Céu azul-acinzentado; "O BRASIL" alinhado à direita; CTA circular laranja **sobreposto** à letra S. |
| Contêineres 01/02/03 | Serviços | Seis contêineres em mosaico de pátio (20' e 40'), cada um com sua cor e ficha HEX/RGB/CMYK. |
| Tríptico | Modais | MAR / TERRA / AR em tela cheia; o navio cruza MAR→TERRA e o avião cruza AR→TERRA. |
| Fotos reais | Sobre, Serviços | Caminhão em bloco duro que sangra até a borda direita; navio cortando "SERVIÇOS". |

---

## 2. Direção de arte final

### Paleta
| Token | HEX | RGB | CMYK | Uso |
|---|---|---|---|---|
| `--ink` | `#0C0C0C` | 12 12 12 | 0 0 0 95 | Preto contêiner. Texto no claro, seções escuras. |
| `--paper` | `#EDE8DF` | 237 232 223 | 0 2 6 7 | Off-white concreto. Fundo principal. |
| `--white` | `#F7F7F7` | 247 247 247 | 0 0 0 3 | Texto sobre azul, contêiner branco. |
| `--blue` | `#1C58D7` | 28 88 215 | 87 59 0 16 | Azul contêiner. Seção Rastreamento, faixa MAR. |
| `--signal` | `#FF4D1A` | 255 77 26 | 0 70 90 0 | Laranja guindaste. Só CTA, destaques e setas. |
| `--steel` | `#8A8F94` | 138 143 148 | 7 3 0 42 | Texto secundário **no escuro**. |
| `--steel-dark` | `#585D62` | 88 93 98 | 10 5 0 62 | **Ajuste:** texto secundário **no claro**. |

**Ajustes de contraste (AA):**
- `--steel` sobre `--paper` dá 2,7:1 e reprova. Por isso entrou `--steel-dark` (5,2:1) para o texto secundário nas seções claras.
- Laranja sobre off-white dá 2,7:1: o laranja nunca é cor de texto no claro, só **bloco** com texto preto (5,9:1). Exemplo: o "NÃO." do manifesto.
- Texto branco sobre laranja dá 3,3:1 e reprova, então todo botão laranja usa texto e seta pretos.
- A auditoria axe-core (WCAG 2.1 AA) passou sem nenhuma violação em 1440 px e 360 px.

### Tipografia
- **Display:** Anton, sempre caixa alta, entrelinha 0.85, tracking −0.01em. Os títulos usam `--fit` (a largura medida da linha mais longa, em `em`) para ocupar **exatamente** 100% da largura útil em qualquer tela.
- **Texto:** Inter Tight 400/500/600.
- **Dados técnicos:** JetBrains Mono 400/500 (códigos, coordenadas, HEX, rastreio, microtexto 11 px com tracking 0.15em).
- **Regra dos acentos:** com entrelinha 0.85, os acentos do português (Ã, É, Á) invadem a linha de cima. As quebras dos títulos foram escolhidas medindo a posição de cada acento, para que ele caia sobre espaço vazio. Onde não há como evitar, a linha ganha um respiro próprio (o "NÃO." do manifesto).

### Layout
- Grid de 12 colunas (4 no celular) visível em fios de 1 px, fixo sobre a página.
- Raio 0 em tudo, exceto pills e círculos. Nada de sombra suave, vidro ou card genérico.
- Seções alternam blocos duros: céu → claro → escuro → claro → escuro → claro → escuro → **azul** → **laranja** → escuro.

---

## 3. Imagens: arquivos e prompts de geração

Enquanto as imagens não existem, o site já funciona: o JS detecta a ausência e mostra
(1) o **contêiner vetorial** no hero, (2) **navio, caminhão e avião vetoriais** em `assets/img/fallback/`,
(3) **fundos desenhados em CSS** (céu, mar, asfalto com faixas, espaço aéreo) e
(4) **blocos técnicos** (fundo sólido + X + nome do arquivo) no lugar das fotos.

**Tratamento para todas:** contraste alto, leve dessaturação, sombras profundas, laranja e azul preservados. Os prompts abaixo estão no formato do Midjourney. No Gemini/Imagen, remova os parâmetros `--` e escolha a proporção na interface.

| Arquivo | Tamanho | Fonte |
|---|---|---|
| `assets/img/hero-sky.webp` | 2560×1440 | gerar |
| `assets/img/hero-container.png` (+ `.webp` com alfa) | 2000×1560, **transparente** | gerar + recortar |
| `assets/img/sobre-patio.webp` | 1600×1067 | equipe no pátio: licenciar iStock **1464340066** (ou foto própria) |
| `assets/img/servicos-navio.webp` | 2000×1200 | navio visto de cima com rastro: licenciar iStock **1334975219** (ou foto própria) |
| `assets/img/modal-mar.webp` | 1200×2000 | gerar |
| `assets/img/modal-terra.webp` | 1125×2000 | ✓ **já no site**: sua foto aérea do pátio à noite |
| `assets/img/modal-ar.webp` | 1200×2000 | gerar |
| `assets/img/veiculo-navio.png` | 520×2200, **transparente** | gerar + recortar |
| `assets/img/veiculo-caminhao.png` | 260×1560, **transparente** | gerar + recortar |
| `assets/img/veiculo-aviao.png` | 1600×1600, **transparente** | gerar + recortar |
| `assets/img/og-cover.jpg` | 1200×630 | print do hero final |

### hero-sky.webp: camada 1 do hero
```
Cinematic overcast sky above a container port, heavy layered stratocumulus clouds with real volume,
blue-grey steel palette (#34404C to #A7AFB6), faint silhouettes of ship-to-shore gantry cranes along
the very bottom edge, 80% of the frame is empty sky for giant typography, low-angle view, 24mm lens,
diffuse light breaking through the clouds at upper right, high contrast, slightly desaturated,
deep shadows, editorial photography, photorealistic, 8k, no text, no logos --ar 16:9 --style raw --v 7
```

### hero-container.png: camada 3 do hero (sujeito recortado)
Com animação, o hero usa o contêiner 3D (Three.js), modelado a partir da referência enviada (iStock 1077168930: vista de baixo, portas à esquerda, gancho amarelo e preto). O PNG abaixo só aparece no site estático (sem JS ou sem WebGL).
```
A single orange 20-foot ISO shipping container (#FF4D1A) suspended in mid-air, lifted by four steel
wire slings converging to one crane hook placed at the exact top-center of the frame, the hook
touching the top edge, long side facing the camera, very slight low angle, corrugated steel walls
with subtle wear, dark corner castings, white stencil markings, isolated on a flat solid neutral grey
background (#808080), studio lighting from upper left, crisp hard shadows on the container itself,
no ground, no sky, product photography, photorealistic, 8k --ar 9:7 --style raw --v 7
```
- Remova o fundo e **exporte em PNG com alfa** (e WebP com alfa, se quiser trocar o `src`).
- Enquadre com o **gancho encostado no topo, centralizado**: o CSS desenha o cabo que continua do gancho até o topo da tela.
- Proporção final 1000:780 (ex.: 2000×1560). O contêiner deve ocupar a metade de baixo do quadro, como no vetor de reserva.
- Opcional: troque o estêncil por "VETOR" no Photoshop, ou com inpainting.

### sobre-patio.webp: equipe caminhando entre as pilhas de contêineres
A referência enviada (iStock 1464340066) tem marca d'água: licencie a foto (o arquivo licenciado vem sem marca) ou use uma foto própria da equipe. Recorte em 3:2 e exporte em WebP (qualidade 80). Alternativa gerada (caminhão na estrada):
```
Front three-quarter view of a modern heavy truck pulling a blue shipping container on an empty
Brazilian highway at dusk, long straight road, low angle, 35mm lens, dramatic overcast sky,
headlights on, orange reflections on the cab, high contrast, slightly desaturated, deep shadows,
editorial photography, photorealistic, 8k --ar 16:11 --style raw --v 7
```

### servicos-navio.webp: navio visto de cima, com rastro branco
A referência enviada (iStock 1334975219) tem marca d'água: licencie a foto ou use uma própria. Recorte em 5:3; ela entra por cima da palavra "SERVIÇOS". Se precisar gerar:
```
Container ship at open sea seen from a low side angle, stacks of blue, black, white and orange
containers, rough dark ocean, overcast steel-grey sky, 70mm telephoto compression, high contrast,
slightly desaturated, deep shadows, editorial photography, photorealistic, 8k --ar 5:3 --style raw --v 7
```

### modal-mar.webp / modal-terra.webp / modal-ar.webp: fundos do tríptico
```
Top-down aerial drone view of deep open ocean, dark cobalt blue water (#0F2F74), subtle wave texture,
one thin white wake line crossing diagonally, no boats, flat graphic composition, high contrast,
slightly desaturated, photorealistic, 8k --ar 3:5 --style raw --v 7
```
```
Top-down aerial drone view of a straight dark asphalt highway filling the frame vertically, two lanes,
crisp white edge lines and dashed center line, no vehicles, matte black asphalt texture, hard midday
light, high contrast, slightly desaturated, photorealistic, 8k --ar 3:5 --style raw --v 7
```
```
Top-down aerial view of a thin layer of white clouds with grey concrete airport apron visible through
the gaps, painted taxiway lines, pale steel-grey palette (#B3BAC0), minimal, high key, soft shadows,
photorealistic, 8k --ar 3:5 --style raw --v 7
```

### veiculo-navio.png / veiculo-caminhao.png / veiculo-aviao.png: veículos que cruzam as divisões
```
Perfectly top-down orthographic view of a container ship heading up (bow at the top), full hull
visible, deck loaded with blue, black, white and orange containers in a tight grid, white bridge
superstructure near the stern, isolated on a flat solid neutral grey background (#808080), no water,
no shadow, photorealistic, 8k --ar 1:4 --style raw --v 7
```
```
Perfectly top-down orthographic view of a semi-truck carrying a blue 40ft shipping container, white
cab at the bottom of the frame driving downward, isolated on a flat solid neutral grey background
(#808080), no road, no shadow, photorealistic, 8k --ar 1:6 --style raw --v 7
```
```
Perfectly top-down orthographic view of a white four-engine wide-body cargo jet, nose pointing up,
small orange accents on the wingtips, isolated on a flat solid neutral grey background (#808080),
no shadow, photorealistic, 8k --ar 1:1 --style raw --v 7
```
Remova o fundo e exporte em PNG com alfa. Se a proporção final mudar, atualize `width`/`height` do `<img>` correspondente.
Mantenha a orientação dos prompts (navio com a proa para cima, caminhão com a cabine para baixo, avião com o nariz para cima): a seção 4 gira cada veículo na direção da rota a partir dela (`FACING` em `js/animations/journey.js`).

### og-cover.jpg
Com as imagens finais no lugar, faça um print do hero em 1200×630 e salve em `assets/img/og-cover.jpg`.

---

## 4. Animação (GSAP + ScrollTrigger + ScrollSmoother + SplitText + Three.js)

Regra: cada movimento vem do mundo da logística. Nada de fade genérico.

A página conta a viagem de **uma** carga: o contêiner laranja VTRU 204816-3 do hero é o mesmo que o usuário acompanha no navio, no caminhão e no avião, até o ponto azul de destino, que vira o azul da seção 5.

| Momento | O que acontece | Por quê |
|---|---|---|
| **Entrada** | Tela preta em lâminas de aço, manifesto de carga sendo conferido (Carga, Lacre, Rota, Status), contador 000→100 e um trolley laranja correndo no trilho. No fim, a porta de enrolar sobe; a rota planejada do hero se desenha e o ponto de descarga aparece. | Abrir a doca: o site começa como um galpão abrindo. |
| **Hero: repouso (0–18%)** | O contêiner fica parado, só respira com o vento. A interface sai em velocidades diferentes, a rota de chegada (mar → Santos) é desenhada e, no fim, o guincho recolhe um palmo de cabo: o suporte reage antes da carga. | Movimento → pausa → informação. Estrutura → suporte → carga. |
| **Hero: descida (18–56%)** | A carga desce, ganha velocidade, inclina, balança, corrige e segue. O gancho segue o cabo e o contêiner atrasa em ângulo e em altura (as lingas esticam e devolvem). Uma linha de prumo liga a base do contêiner ao ponto de descarga com a altura em metros; a rota de saída (Santos → 27 UF) é desenhada. Céu quase parado, título em velocidade média, linhas presas ao chão. | Peso, inércia e balanço com física real (pêndulo com suspensão móvel, giro no cabo, cabo elástico, folga das lingas). |
| **Hero: aproximação (56–78%)** | O contêiner gira e vem até a câmera; o cenário escurece, as linhas ficam para trás e o título se apaga. | A câmera encosta na carga. |
| **Hero → 2 (78–96%)** | As portas (DOM, mesma textura) destravam com uma folga de poucos graus e abrem ganhando velocidade, com a câmera atravessando; a seção 2 sobe por trás. | O conteúdo é a carga dentro do contêiner. |
| **2 Manifesto** | Palavras sobem de dentro de cada linha conforme a rolagem; as linhas chegam de lados alternados em velocidades diferentes; a fita laranja corre e o "NÃO." assenta. Ao sair, as linhas continuam deslizando devagar. | Leitura no ritmo do usuário. |
| **3 Sobre** | Linguagem lateral, de documento impresso: linhas do texto correm da esquerda dentro da máscara, a ficha técnica é traçada linha a linha e os números (340 veículos, 48.000 m²) contam. A foto abre de baixo e assenta de 1,08 → 1, com parallax leve. | Diferente da seção 2, mesma família. |
| **4 Entrada** | "TRÊS MODAIS." chega por esteira e "UM CONTATO." é carimbado. Fixado o tríptico, o mapa se desenha antes de qualquer veículo: rota planejada tracejada, porto, terminal e destino ●. | Preparar a viagem. |
| **4 Mar** | A faixa do mar abre. O navio entra pela base e segue a rota curva, girando na direção do trajeto, com balanço mínimo de água e rastro que cresce com a velocidade; a rota feita fica laranja; telemetria em nós e milhas. A etiqueta da carga acompanha o navio. | Navegar, não deslizar. |
| **4 Transbordo** | O navio atraca antes do porto; a linha laranja segue até o nó; o contêiner laranja sai do navio e aparece na carreta do caminhão; a câmera (acordeão) segue a rota para a faixa da terra e o navio sai menor. | "A carga saiu do navio e continua por terra." |
| **4 Terra** | O caminhão acelera, faz as curvas inclinando e vibra na suspensão conforme anda; freia no terminal. | Peso de estrada. |
| **4 Embarque → Ar** | A carga deixa o caminhão no terminal, a faixa do ar abre, nuvens entram. O avião parte pequeno, acelera, sobe (cresce e a sombra se afasta), inclina nas curvas e chega ao destino ●, onde encolhe até sumir. | Terra → ar → entregue. |
| **4 Final** | A câmera se afasta: o tríptico volta a terços e diminui, mostrando a rota inteira atravessando as três faixas, navio e caminhão parados nos pontos de troca e o ● azul pulsando. | Visão do mapa; continuidade para a seção 5. |
| **5 Serviços** | O azul nasce como um ponto no meio de "SERVIÇOS", vira círculo, se estica em cápsula e ganha os cantos de contêiner, cortando as letras (que aparecem em contorno por dentro); depois desliza pela palavra. Só clip-path e transform. | O ● de destino vira o bloco azul. |
| **6 Pátio** | Carrossel horizontal fixado: o contêiner em foco fica pendurado no cabo; o que sai vai a 0,96 e escurece, o que entra vem de 1,04 → 1 descendo alguns px; inclinação máxima de 1,5–1,8°; o nome anda um pouco atrás da caixa; o contador do HUD rola para o novo número. Encaixa em cada contêiner. | Limpo, industrial, sem cansar. |
| **Números** | "PESO PESADO." cai acelerando e o título sente o impacto; "PRAZO LEVE." chega deslizando. Os números contam de 0 até o valor exato: milhares em escala logarítmica (0 → 1 → 12 → 120 → 1.200 → 12.000), porcentagens com easing (0 → 15 → 42 → 78 → 98,7), "24/7" nas duas partes. A largura final é reservada para os sufixos não andarem. | Dados da operação, precisos. |
| **Processo** | A linha da rota se desenha com a rolagem e um bloco laranja (a carga) percorre o caminho; cada etapa acende quando a carga chega. | Rota de verdade. |
| **Clientes** | Letreiro contínuo que acelera, inverte e inclina com a velocidade da rolagem; depoimentos chegam girando e encaixam. | Movimento de pátio. |
| **Rastreio** | O código de exemplo é digitado no campo; o ticket sai "impresso" em passos; o status pisca. | Impressora térmica de terminal. |
| **Contato** | "VAMOS" cai pesado, "CARREGAR?" sobe; o botão do WhatsApp entra com mola. | Fechamento com peso. |
| **Rodapé** | A palavra VETOR sobe da base enquanto a página termina. | Assinatura. |
| **Transição de blocos** | Seções escuras e coloridas entram recortadas e se expandem até a borda. | Bloco duro encaixando no lugar. |
| **Microinterações** | Botões principais magnéticos; quadrado laranja seguindo o cursor, com rótulo em áreas de rolagem; seta dos botões avança no hover; sublinhado do menu se desenha; pulso lento no ponto de descarga e no destino. | Só em mouse; nunca no toque. |

**Celular:** a mesma narrativa, simplificada. No hero o contêiner desce pouco (já começa baixo) e o título sobe mais, como uma câmera acompanhando; as etiquetas técnicas saem e ficam só as linhas. Na seção 4 cada modal ocupa a tela, a trilha desliza para o próximo trecho e as rotas passam pela faixa livre entre a telemetria e o texto.

**Acessibilidade e desempenho:** com `prefers-reduced-motion` nada disso roda e o site estático completo aparece. Títulos animados mantêm o texto para leitores de tela. O WebGL só renderiza enquanto o hero está na tela. Sem WebGL, o mesmo movimento roda no vetor 2D do contêiner.

**Referências:** o 21st.dev e o Dribbble foram sugeridos como fonte de transições. Preferi derivar cada uma do próprio assunto (doca, guindaste, portas, rota, transbordo, contador, ticket) para não cair em efeito de template. A skill /web-animation-skills não estava instalada nesta sessão; as técnicas seguem GSAP/ScrollTrigger diretamente.

---

## 5. Checklist: o que você precisa trocar

Tudo abaixo é **placeholder** e precisa de dado real antes de publicar.

**Marca e dados**
- [ ] Nome **VETOR**: `index.html` (textos, `<title>`, metas, schema), estêncil do contêiner SVG no hero e `assets/img/favicon.svg`.
- [ ] Cidade e coordenadas **Santos/SP, 23°57′39″S 46°20′01″W**: hero, rodapé e `geo` no schema.
- [ ] Endereço **Av. Portuária, 1500, CEP 11015-000** (fictício): contato, rodapé, schema e link do Google Maps.
- [ ] **CNPJ 00.000.000/0001-00** no rodapé.
- [ ] Horário de atendimento (contato + `openingHoursSpecification`).

**Links**
- [ ] WhatsApp: buscar e substituir `5513900000000` (16 links `wa.me`) e o número exibido `(13) 90000-0000`, mais `telephone` no schema.
- [ ] E-mail `comercial@vetorlogistica.com.br` e Instagram `@vetorlogistica`.
- [ ] Domínio `https://www.vetorlogistica.com.br/` em canonical, `og:url`, `og:image`, `twitter:image` e schema.
- [ ] Portal de rastreamento `https://rastreio.vetorlogistica.com.br/` e o nome do parâmetro `codigo` (formulário + botão "Acessar o portal").
- [ ] Formato do código de rastreio no placeholder (`VTR-0000-0000-BR`) e o bloco "Exemplo de status".

**Números (só publique o que for verdade)**
- [ ] +12.000 entregas/mês · 27 estados · 98,7% no prazo · 15 anos · 48.000 m² · torre 24/7.
- [ ] Fundação 2011 · frota 340 veículos · +1.200 empresas atendidas · ISO 9001 · SASSMAQ.
- [ ] Prazos médios de cada modal (18–35 dias, 6–12 dias, 1–7 dias úteis, 24–72 h).
- [ ] Especificações dos serviços (57 t, 36 docas, 120 rotas/dia, D+1, GRU/VCP, atualização 30 s).
- [ ] Rota-exemplo "Santos → Manaus · 3.989 km · ETA 6 dias".

**Conteúdo**
- [ ] **Depoimentos:** os três são **exemplos fictícios**. Troque por depoimentos reais e autorizados, ou remova o bloco.
- [ ] Faixa de clientes: hoje mostra segmentos. Troque cada `<li>` por um `<img>` SVG do logo (com autorização).

**Imagens**
- [ ] As imagens da seção 3 que ainda faltam (o pátio aéreo do TERRA já está no site; confirme que você tem direito de uso dela).
- [ ] Fotos do iStock enviadas como referência: licenciar antes de usar (as versões com marca d'água não podem ir para o site).
- [ ] `og-cover.jpg` depois das imagens finais.

**Técnico (opcional)**
- [ ] Hospedar as fontes em `assets/fonts/` (ver `assets/fonts/README.md`).
- [ ] Revisar o schema: `MovingCompany` foi pedido no briefing, mas no vocabulário schema.org ele significa "empresa de mudanças". Para transportadora, `LocalBusiness` sozinho é o mais preciso.
