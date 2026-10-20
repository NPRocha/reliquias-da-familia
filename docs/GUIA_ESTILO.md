# Relíquias da Família — Guia de Estilo

Estilo: **Museu clássico** · 15/10/2026 · Definido em `src/estilos.css` (`:root`).

## Cores

| Variável | Cor | Uso |
|---|---|---|
| `--papel` | `#F5EFE4` creme | Fundo das páginas |
| `--folha` | `#FBF8F2` | Cartões, molduras de foto, formulários |
| `--tinta` | `#3E2C23` marrom | Texto principal, menu da administração |
| `--tinta-2` | `#6B5A4E` | Texto secundário |
| `--linha` | `#DDD2BF` | Bordas e fios |
| `--acao` | `#7A5C2E` dourado escuro | Botões, links, carimbo "À venda" |
| `--acao-escuro` | `#5E4622` | Botão/link ao passar o mouse |
| `--latao` | `#B08D57` dourado | Só decoração (ilhós da etiqueta, letra capitular) |
| `--lacre` | `#8C2F25` vinho | Carimbos "Reservado"/"Vendido", erros |
| `--acao-suave` | `#EFE3CC` | Fundo de mensagens de sucesso e selos "À venda/Novo" |
| `--alerta-suave` | `#F3E3D8` | Fundo de erros e selos "Reservado/Negociando" |

O dourado `#B08D57` não é usado em texto: o contraste com o creme é baixo. Para texto e botões usa-se `--acao`. Todas as combinações de texto passam no padrão de acessibilidade WCAG AA (≥ 4,5:1).

## Fontes (Google Fonts, gratuitas)

| Uso | Fonte |
|---|---|
| Títulos, nome da peça, história | **Playfair Display** |
| Texto, menus, botões, formulários | **Source Sans 3** |

## Elementos visuais
- **Etiqueta** com o código da peça (forma de etiqueta de acervo, ilhó dourado).
- **Carimbo** inclinado para a situação (À venda, Reservado, Vendido).
- Muito espaço em branco, cantos pouco arredondados (3–6 px), sem sombras.

## Para mudar o estilo
Alterar apenas as variáveis em `:root` no `src/estilos.css`, a cor `theme-color` e o link das fontes no `index.html`, e o `public/favicon.svg`.

## Tela de entrada — "Álbum de família" (19/10/2026)
A tela de entrada (e a de primeiro acesso) tem um visual próprio, mais alegre; o restante do site segue o Museu clássico.

| Elemento | Definição |
|---|---|
| Fundo | `#F6ECDF` com pontinhos terracota suaves |
| Destaque | Terracota `#A24A26` (botões, links, "da Família"); hover `#7E381C` |
| Fontes extras | **Fraunces** (título "Relíquias *da Família*" e título da ficha) e **Caveat** (manuscrito) |
| Foto | Polaroid inclinada com fita adesiva: `public/retrato.jpg` (Maria Anunciação Miguel entre flores) |
| Legenda da foto | "Maria Anunciação Miguel" (marrom) / "artista plástica e esteta." (terracota), em Caveat |
| Ficha de entrada | "Bem-vindo de volta!" (Caveat) · "Veja as relíquias da família" · fita verde no canto |
| Frase de apresentação | "Para quem cuida do que veio antes: objetos que atravessaram gerações, preservados com carinho para as que ainda virão." (editável em Configurações) |

Página Sobre: foto em formato retrato 4:5, também na administração.
