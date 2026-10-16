# Relíquias da Família — Arquitetura (decisões)

Data: 15/10/2026 · Origem: reengenharia do AMReliquias (ver `REENGENHARIA_AMRELIQUIAS.md`)

## Visão geral

```
Visitante / Equipe (navegador)
        │
        ▼
Cloudflare Pages  ──  site React (estático, HTTPS, CDN)
        │  supabase-js (chave pública + RLS)
        ▼
Supabase
  ├─ PostgreSQL ── dados (objetos, categorias, interesses...)
  ├─ Storage ───── fotos (buckets "objetos" e "institucional")
  └─ Auth ──────── login da equipe (e-mail/senha)
        │
        ▼
WhatsApp (link wa.me com mensagem pronta) → negociação
```

## Decisões

| # | Tema | Decisão | Motivo |
|---|------|---------|--------|
| 1 | Banco | **Supabase (PostgreSQL)** | Banco + armazenamento de imagens + login no mesmo serviço, gerenciado (sem servidor para manter), segurança por linha (RLS), plano gratuito. |
| 2 | Imagens | **Supabase Storage**, compressão no navegador para WebP (~1600 px, ~300 KB) antes do envio | 1 GB grátis ≈ 3.000 fotos. Banco guarda só o caminho do arquivo. |
| 3 | Backend | **Sem servidor próprio** (Express removido) | O site fala direto com o Supabase; RLS garante a segurança. Menos peças = menos manutenção. |
| 4 | Frontend | **React + Vite + TypeScript**, CSS próprio e roteador próprio | Gratuito, open source; TypeScript reduz erros; mínimo de dependências (só React e supabase-js) = menos manutenção. |
| 5 | Hospedagem | **Cloudflare Pages (grátis)** | Permite uso comercial no plano grátis; HTTPS e CDN inclusos. Vercel Hobby proíbe anunciar venda de produtos. |
| 6 | Código-fonte | **GitHub (repositório privado, grátis)** | Versionamento e publicação automática no Cloudflare a cada alteração. |
| 7 | Venda | **"Tenho interesse"** → grava em `interesses` → abre WhatsApp com mensagem pronta | Sem carrinho/pagamento; negociação humana. |
| 8 | Login | **ADMIN, OPERADOR e VISITANTE**, pré-cadastrados pelo ADMIN; senha criada pelo próprio usuário com **código de 6 dígitos** (função `fn_primeiro_acesso`) | Sem e-mails nem chave secreta; o ADMIN controla o acesso pelo cadastro. |
| 10 | Chave de vendas | `configuracoes.vendas_ativas` (só ADMIN). Desligada: site só com login, sem nada de venda. Ligada: público e visitantes veem só peças "À venda" | O sistema começa como acervo da família; a venda é opcional. |
| 11 | Leitura do site | Visão `catalogo` aplica as regras da chave; tabela `objetos` só para a equipe | Uma regra só, garantida pelo banco. |
| 12 | Fotos | Privadas (endereços temporários), máx. 4 por peça, 500 KB por arquivo | O site exige login; as fotos acompanham a regra. |
| 9 | Domínio | Opcional: `.com.br` no Registro.br (~R$ 40/ano) | Sem domínio, o site fica em `reliquias-da-familia.pages.dev`. |

iCloud e Microsoft 365 não hospedam aplicações web; o e-mail do M365 pode ser usado como contato.

## Custos

| Item | Início | Se crescer |
|------|--------|-----------|
| Supabase | Grátis (500 MB banco, 1 GB fotos, 5 GB tráfego/mês) | Pro US$ 25/mês (8 GB banco, 100 GB fotos, backups diários, sem pausa) |
| Cloudflare Pages | Grátis | — |
| GitHub | Grátis | — |
| Domínio | Opcional | ~R$ 40/ano |

**Atenção:** projeto Supabase grátis **pausa após 7 dias sem acesso**. Mitigação: `.github/workflows/manter-ativo.yml` acessa o banco diariamente. Sem backup automático no grátis → exportação periódica.

## Modelo de dados (resumo)

`perfis` · `categorias` · `estados_conservacao` · `objetos` · `imagens_objetos` · `interesses` · `institucional`

Mudanças em relação ao AMReliquias:
- T-SQL → PostgreSQL.
- `usuarios.senha_hash` → Supabase Auth + `perfis`; tipo CLIENTE removido.
- `disponivel_venda` + `status` → `situacao` (ACERVO, A_VENDA, RESERVADO, VENDIDO).
- `pedidos` + `pedido_itens` → `interesses` (com funil: NOVO → EM_CONTATO → NEGOCIANDO → CONCLUIDO/DESCARTADO).
- Novos: `codigo` (etiqueta), `procedencia`, `observacoes_internas`, `ordem` nas imagens, 1 foto principal garantida por índice.
- `anunciacao` → `institucional` (registro único).
- Público não vê `valor_estimado` nem `observacoes_internas` (permissão por coluna).

## Funcionalidades (MVP)

**Público:** início/institucional · catálogo com filtros (categoria, situação) · página da peça com galeria e história · botão "Tenho interesse" (formulário + WhatsApp).

**Equipe (login):** painel · CRUD de peças com envio de fotos · categorias · interesses (funil) · página institucional · usuários (ADMIN).

## Próximas etapas

1. Contas: GitHub, Supabase, Cloudflare (Paulo).
2. Executar `database/001` e `002` no Supabase.
3. ~~Criar o site React (público + administração)~~ — feito em 15/10/2026.
4. Publicar no Cloudflare Pages.
5. Backup/keep-alive via GitHub Actions; anti-spam no formulário (Cloudflare Turnstile, grátis).

## Futuro (fora do MVP)
Histórico de valores · relatórios · marca d'água nas fotos · domínio próprio.
