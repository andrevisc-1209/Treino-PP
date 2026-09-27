# Identidade visual — Personal Perto

Origem de cada arquivo/valor usado na identidade do Treino-PP, pra quem for mexer
nisso depois não ter que reconferir do zero.

## Logo

**Fonte**: `~/PersonalPerto2/public/logo.png` (repositório do Personal Perto no
mesmo Mac, lido só para consulta — nada foi alterado lá). É a única imagem de logo
encontrada no repo do PP; os outros PNGs de ícone (`ios/App/App/Assets.xcassets/...`,
`android/.../ic_launcher*.png`) são o ícone placeholder padrão do Capacitor/Ionic
(um "X" azul genérico), não a marca real — não foram usados aqui.

PNG, 1536×1024, com canal alfa (fundo realmente transparente — o preto que aparece
ao abrir o arquivo num visualizador comum é só o visualizador compondo sobre preto,
não faz parte da imagem).

Arquivos copiados pra `src/assets/brand/`:

| Arquivo | O que é |
|---|---|
| `logo-personal-perto-original.png` | Cópia exata, sem nenhuma edição, do `public/logo.png` do PP (1536×1024) |
| `logo-personal-perto.png` | A mesma imagem com a margem transparente recortada (`sharp().trim()` — não altera nenhum pixel de conteúdo, só remove borda vazia), 1485×565 |
| `icon-mark.png` | Recorte só do símbolo (o pino verde/azul com a pessoa e o haltere), sem a palavra "Personal Perto" nem o slogan — 605×555. Necessário porque a logo completa é um wordmark largo (proporção ~2.6:1) e ilegível nos tamanhos pequenos pedidos (cabeçalho 24px, ícone PWA, favicon, splash) |

**Não há SVG oficial.** Segui a instrução de não tentar vetorizar à mão e usei o PNG
em alta resolução — **um SVG oficial do símbolo deixaria os ícones pequenos (favicon,
PWA, splash) nítidos em qualquer densidade de tela; nos tamanhos atuais (favicon 32px,
ícone PWA 192px) o PNG escalado já fica bom, mas vale pedir o vetor pro time do PP se
for usar em telas muito grandes ou impressão.**

## Paleta

Também lida do código real do repositório do PP (`App.tsx`, `components/*.tsx`,
`capacitor.config.ts`), não só amostrada da imagem da logo — mais confiável, porque
a logo tem gradientes (a mesma "cor" varia de pixel a pixel) e o código tem as cores
exatas que eles realmente usam como marca:

| Cor | Hex | Uso no código do PP | Ocorrências |
|---|---|---|---|
| Verde primário (CTA) | `#4CAF50` | Botões, destaques, contadores | 294 |
| Navy (cor dominante) | `#0F2537` | Texto, cabeçalhos, fundo de modais, splash do Capacitor, fundo de e-mails | 484 |
| Verde escuro (hover) | `#388E3C` | Hover do CTA verde — já é o tom escuro deles mesmos | 2 |
| Azul céu (acento) | `#0284C7` | Uso pontual, não central | 53 |
| Vermelho iOS | `#FF3B30` | Erro/destrutivo (fora do escopo desta tarefa) | 6 |

`#25D366` (verde do WhatsApp) também aparece no código do PP, mas é a cor oficial do
WhatsApp, não da marca Personal Perto — o Treino-PP já usa essa cor só no ícone do
botão de WhatsApp (`BotaoWhatsApp.tsx`) e isso não muda aqui.

### Contraste — por que `brand` ≠ `brand-bright`

O verde primário de verdade do PP, `#4CAF50`, dá **2,78:1** contra branco — não passa
nem o limiar de 3:1 de texto grande, muito menos os 4,5:1 de texto normal. Até o tom
de hover deles, `#388E3C`, fica em 4,12:1 — passa 3:1 mas não 4,5:1.

Segui a regra combinada: manter a cor original só onde ela não precisa de 4,5:1 (logo
em imagem — não é texto, não entra na regra — e como base de um tom "aceso" pra
ícone/texto grande/detalhe), e criar um tom mais escuro da mesma família **só** pra
fundo de botão/texto normal.

| Token CSS | Hex | Contraste c/ branco | Onde usar |
|---|---|---|---|
| `--color-brand` | `#367c39` | 5,12:1 | Botões, chips selecionados, qualquer fundo com texto branco em cima |
| `--color-brand-hover` | `#2a602c` | 7,48:1 | `:hover`/`:active`, links de texto |
| `--color-brand-soft` | `#eaf6ea` | — (fundo) | Fundos claros de badge/destaque |
| `--color-brand-ink` | `#ffffff` | — | Texto sobre `--color-brand` |
| `--color-brand-bright` | `#388e3c` (= hover do PP) | 4,12:1 | Ícones, texto grande (≥ 18,7px bold ou 24px), detalhes — **nunca** texto normal nem fundo de botão |
| `--color-accent` | `#0f2537` (navy do PP) | 15,67:1 | Destaque secundário |

`#4CAF50` em si **não virou token CSS** — só existe dentro do PNG da logo (que é
imagem, isenta da regra de contraste de texto). Usar essa cor crua em qualquer texto
ou ícone do app violaria WCAG AA.

Teste automatizado: `src/lib/contraste.test.ts` — trava esses pares no CI; se algum
valor mudar em `src/index.css` sem atualizar o teste, o build de testes quebra.

## Fonte

O PP usa duas fontes do Google Fonts (confirmado em `index.css` do repositório
deles): **Montserrat** (`h1`–`h6`) e **Open Sans** (corpo, `body`/`p`/`span`/
`input`/`button`). Ambas carregadas aqui via `<link>` no `index.html` (preconnect +
`display=swap`, com fallback de sistema em `--font-heading`/`--font-sans` em
`src/index.css`) — mesmo esquema que eles já usam, sem custo de licença.

## Neutros

O PP não define uma paleta de cinzas própria (não achei nenhum token nem uso
consistente de cinza fora do padrão do Tailwind). Os neutros do Treino-PP continuam
sendo a paleta `slate` do Tailwind, sem mudança — já era usada e já passa AA (ver
auditoria de UX, `docs/ux-audit/RELATORIO.md`).
