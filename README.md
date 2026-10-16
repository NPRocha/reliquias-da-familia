# Relíquias da Família

Site para catalogar e organizar os objetos antigos da coleção da família. A venda (contato pelo WhatsApp) só aparece quando o ADMIN liga a chave "Vendas".
Antigo **AMReliquias**, migrado para o Claude em 15/10/2026. Decisões em `docs/ARQUITETURA.md`. Configuração e operação em `docs/GUIA_CONFIGURACAO.md`.

## Stack
React 19 + Vite + TypeScript · Supabase (PostgreSQL, Storage, Auth) · Cloudflare Pages · GitHub

## Páginas
| Site (login; com vendas ligadas, também o público) | Administração (`/admin`, só ADMIN e OPERADOR) |
|---|---|
| `/` entrada (login) · início do acervo | `/admin` painel |
| `/primeiro-acesso` criar senha com o código | `/admin/pecas` peças, fotos (máx. 4), valores |
| `/acervo` acervo ou peças disponíveis | `/admin/interesses` funil e reserva |
| `/peca/:id` ficha + "Tenho interesse" | `/admin/categorias` · `/admin/institucional` |
| `/sobre` família (vendas desligadas) | `/admin/usuarios` · `/admin/configuracoes` (só ADMIN) |

## Estrutura
```
database/      scripts SQL (executar em ordem no Supabase)
docs/          arquitetura, reengenharia e guia de configuração
public/        arquivos estáticos
src/
  lib/         supabase, autenticação, rotas, fotos, formatação, tipos
  components/  layout público, cartão de peça, etiqueta, carimbo
  pages/       páginas públicas
  pages/admin/ área administrativa
.github/workflows/manter-ativo.yml   evita a pausa do Supabase grátis
.github/workflows/verificar.yml      confere TypeScript e build a cada envio
```

## Configuração
Variáveis (arquivo `.env.local` ou Cloudflare Pages → Settings → Variables):
```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Rodar no computador (opcional)
```
npm install
npm run dev
```

## Publicação (Cloudflare Pages)
Build command `npm run build` · Output `dist` · variáveis acima.

## Status
- [x] Reengenharia e arquitetura
- [x] Banco (scripts 001 e 002)
- [x] Site público e administração (testados com dados simulados)
- [x] Conectado ao Supabase real e testado (15/10/2026)
- [x] Publicado: https://reliquias-da-familia.pages.dev
- [ ] Segredos do GitHub para a tarefa "Manter Supabase ativo"
