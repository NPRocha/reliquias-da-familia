# Relíquias da Família — Guia de configuração e operação

Versão 1.0 · 15/10/2026 · Responsável: Paulo Rocha

Este guia reúne tudo o que foi feito para colocar o site no ar (GitHub, Supabase e Cloudflare) e o que é preciso para mantê-lo funcionando. Siga as seções na ordem ao refazer a configuração do zero.

---

## 1. Visão geral

```
Visitante / Equipe (navegador)
        │
        ▼
Cloudflare Pages ── site (React), publicado automaticamente a cada alteração no GitHub
        │
        ▼
Supabase ── banco de dados (PostgreSQL) + fotos (Storage) + login da equipe (Auth)
        │
        ▼
WhatsApp ── negociação com os interessados
```

| Item | Valor |
|---|---|
| Site público | https://reliquias-da-familia.pages.dev |
| Área administrativa | https://reliquias-da-familia.pages.dev/admin |
| Código-fonte (GitHub) | https://github.com/NPRocha/reliquias-da-familia (privado, branch `main`) |
| Projeto Supabase | `reliquias-da-familia` · ID `vvucgdnwpixokwhcvrta` · região `sa-east-1` (São Paulo) |
| URL do Supabase | https://vvucgdnwpixokwhcvrta.supabase.co |
| Projeto Cloudflare Pages | `reliquias-da-familia` (conta rochapfb@gmail.com) |
| Pasta local | `C:\PauloRocha\OneDrive\Programas\ReliquiasDaFamilia` |

**Fonte oficial do código: o GitHub.** O Cloudflare publica o que está no GitHub, não o que está na pasta do OneDrive. A pasta `.github` (tarefa automática) existe só no GitHub.

---

## 2. Chaves e segredos

| Informação | Pode ser exposta? | Onde é usada |
|---|---|---|
| URL do Supabase | Sim (pública) | Cloudflare (variável) e GitHub (segredo) |
| Publishable key (`sb_publishable_…`) | Sim (pública; a segurança é feita pelas regras do banco) | Cloudflare (variável) e GitHub (segredo) |
| **Secret key** do Supabase (`sb_secret_…`) | **Nunca** | Não é usada pelo site. Não copie para nenhum lugar. |
| **Senha do banco** (Database password) | **Nunca** | Não é usada pelo site. Guarde em local seguro. |
| Senha de login da Área da família | **Nunca** | Só o próprio usuário digita. Não envie em chat. |

Publishable key atual: `sb_publishable_T9vG0XXjIwXzJ0U89gS3PA_ZNu8Mun-`

Se um dia a publishable key for trocada no Supabase (Project Settings → API Keys), atualize-a nos **dois** lugares: Cloudflare (seção 5.3) e GitHub (seção 4.4).

---

## 3. Supabase (banco, fotos e login)

### 3.1 Criar o projeto
1. Criar conta em https://supabase.com.
2. **New project** → nome `reliquias-da-familia` → região **South America (São Paulo)** → definir e guardar a senha do banco.

### 3.2 Criar as tabelas
SQL Editor → **New query** → colar todo o conteúdo do arquivo → **Run**. Rodar nesta ordem:

| Ordem | Arquivo (pasta `database`) | O que faz | Resultado esperado |
|---|---|---|---|
| 1 | `001_estrutura_inicial.sql` | Tabelas, regras de segurança (RLS), locais das fotos (buckets `objetos` e `institucional`), estados de conservação | *Success. No rows returned* |
| 2 | `002_storage_leitura_equipe.sql` | Permite à equipe excluir fotos | *Success. No rows returned* |

Os scripts são executados **uma única vez**. Rodar de novo gera erro de "já existe".

### 3.3 Bloquear cadastro público
Authentication → **Sign In / Providers** → desmarcar **Allow new users to sign up** → Save.
Assim ninguém cria conta sozinho; só a equipe cadastrada entra na administração.

### 3.4 Criar o usuário administrador
1. Authentication → **Users** → **Add user** → **Create new user** → e-mail + senha → marcar **Auto Confirm User**.
2. SQL Editor → torná-lo administrador (trocar o e-mail):
```sql
INSERT INTO public.perfis (id, nome, papel)
SELECT id, 'Paulo Rocha', 'ADMIN'
FROM auth.users
WHERE email = 'SEU_EMAIL_AQUI';
```
Esperado: *1 row affected*. Se der 0, o e-mail não confere com o cadastrado.

### 3.5 Copiar URL e chave
- **Project URL**: Project Settings → General → Project ID → a URL é `https://<Project ID>.supabase.co`.
- **Publishable key**: Project Settings → **API Keys** → seção *Publishable key* (`sb_publishable_…`).

### 3.6 Recomendado: endereço do site no Supabase
Authentication → **URL Configuration** → **Site URL** = `https://reliquias-da-familia.pages.dev` → Save.
Necessário para que e-mails do Supabase (ex.: recuperação de senha) apontem para o site, e não para `localhost`.

### 3.7 Usuários da equipe

**Conferir usuários e perfis:**
```sql
SELECT u.email, u.email_confirmed_at, p.nome, p.papel, p.ativo
FROM auth.users u
LEFT JOIN public.perfis p ON p.id = u.id;
```

**Incluir um operador** (pode cadastrar peças e atender interesses): criar o usuário como em 3.4 e rodar:
```sql
INSERT INTO public.perfis (id, nome, papel)
SELECT id, 'NOME DA PESSOA', 'OPERADOR'
FROM auth.users
WHERE email = 'EMAIL_DA_PESSOA';
```

**Bloquear o acesso de alguém** (sem apagar o histórico):
```sql
UPDATE public.perfis SET ativo = false
WHERE id = (SELECT id FROM auth.users WHERE email = 'EMAIL_DA_PESSOA');
```

**Trocar senha** (o Supabase não tem campo para digitar senha nova):
```sql
UPDATE auth.users
SET encrypted_password = extensions.crypt('SUA_NOVA_SENHA', extensions.gen_salt('bf')),
    updated_at = now()
WHERE email = 'SEU_EMAIL_AQUI';
```
Esperado: *1 row affected*. Depois de usar, **apague essa query do histórico do SQL Editor** (ela contém a senha).

---

## 4. GitHub (código-fonte e tarefa automática)

### 4.1 Conta e repositório
1. Criar conta em https://github.com (usuário atual: `NPRocha`).
2. Criar repositório **privado** e **vazio** (sem README) chamado `reliquias-da-familia`.

### 4.2 Dar acesso ao Claude
Necessário para o Claude enviar o código e as futuras alterações.
1. claude.ai → **Configurações → Conectores** → conectar o **GitHub**.
2. Instalar o aplicativo do Claude no GitHub: https://github.com/apps/claude/installations/select_target → conta **NPRocha** → **Only select repositories** → marcar `reliquias-da-familia` → **Install/Save**.
3. Se o envio continuar recusado, reconectar: https://claude.ai/customize/connectors?auth_start=github&auth_start_force=1

Só o passo 1 não basta: sem o aplicativo instalado no repositório, o Claude consegue ler, mas não enviar.

### 4.3 Primeiro envio
Feito pelo Claude em 15/10/2026 (commit inicial na branch `main`). A partir daí, toda alteração enviada ao GitHub é publicada pelo Cloudflare automaticamente.

### 4.4 Segredos da tarefa "Manter Supabase ativo"
O plano grátis do Supabase **pausa o projeto após 7 dias sem acesso**. A tarefa `.github/workflows/manter-ativo.yml` acessa o banco todo dia às 06:17 (Fortaleza) para evitar isso. Ela precisa de dois segredos:

Repositório → **Settings** → **Secrets and variables** → **Actions** → seção **Repository secrets** (não usar *Environment secrets*) → **New repository secret**:

| Name | Secret |
|---|---|
| `SUPABASE_URL` | `https://vvucgdnwpixokwhcvrta.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_T9vG0XXjIwXzJ0U89gS3PA_ZNu8Mun-` |

Nomes exatamente assim (maiúsculas e sublinhado).

**Testar:** aba **Actions** → **Manter Supabase ativo** → **Run workflow** → **Run workflow**. Esperado: ✅ verde em ~30 segundos.

Se o GitHub desativar a tarefa por longa inatividade do repositório (ele avisa por e-mail), reative: aba Actions → **Manter Supabase ativo** → **Enable workflow**. Vale conferir a aba Actions uma vez por mês.

---

## 5. Cloudflare Pages (publicação do site)

### 5.1 Conta
1. Criar conta em https://dash.cloudflare.com.
2. **Confirmar o e-mail** (rochapfb@gmail.com — ver também Spam/Promoções). Sem a confirmação, a tela **Workers & Pages** mostra apenas "Confirme sua conta".

### 5.2 Criar o projeto
1. **Workers & Pages** → **Create application**.
2. O Cloudflare abre o fluxo novo (*Workers*). Clicar no link pequeno **"Continuar para o Pages"** (abaixo de *Upload your static files*). Não usar o fluxo de Workers.
3. **Import an existing Git repository** → autorizar o GitHub → `NPRocha` → `reliquias-da-familia` → **Begin setup**.

### 5.3 Configurações de build
| Campo | Valor |
|---|---|
| Project name | `reliquias-da-familia` |
| Production branch | `main` |
| Framework preset | `React (Vite)` (ou `None`) |
| Build command | `npm run build` |
| Build output directory | `dist` |

**Environment variables (advanced):**
| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://vvucgdnwpixokwhcvrta.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_T9vG0XXjIwXzJ0U89gS3PA_ZNu8Mun-` |
| `NODE_VERSION` | `22` |

→ **Save and Deploy**. Em 1–2 minutos o site fica em `https://reliquias-da-familia.pages.dev`.

### 5.4 Depois de publicado
- **Publicação automática:** cada envio ao GitHub (branch `main`) gera uma nova publicação.
- **Mudou uma variável?** Ela só vale na próxima publicação: Workers & Pages → `reliquias-da-familia` → **Deployments** → no último item, **⋯ → Retry deployment**.
- Variáveis ficam em: projeto → **Settings** → **Variables and Secrets** (em algumas telas, *Environment variables*).
- Histórico e erros de publicação: projeto → **Deployments** → clicar no item → **Build log**.

---

## 6. Primeiro uso do sistema

1. Acessar https://reliquias-da-familia.pages.dev/admin e entrar com e-mail e senha (seção 3.4).
2. **Página Sobre** (menu da administração): preencher nome, título, apresentação, trajetória, **WhatsApp para negociação** e foto.
   O WhatsApp informado aqui é o número para onde os interessados são direcionados. Sem ele, o botão de WhatsApp não aparece para o visitante.
3. **Categorias**: cadastrar (ex.: Relógios, Louças e cristais, Mobiliário).
4. **Peças → Cadastrar peça**: preencher e clicar em **Cadastrar e adicionar fotos**. Em seguida enviar as fotos (são reduzidas automaticamente) e escolher a foto de capa.
5. Para a peça aparecer com o botão **Tenho interesse**: situação **À venda** e **Mostrar no site** marcado.

### Regras de exibição
| Situação | No site |
|---|---|
| Acervo da família | Aparece, sem carimbo e sem preço |
| À venda | Carimbo "À venda", preço e formulário "Tenho interesse" |
| Reservado | Carimbo "Reservado", sem formulário |
| Vendido | Carimbo "Vendido", fica como registro do acervo |
| "Mostrar no site" desmarcado | Não aparece para o visitante |

**Nunca aparecem no site:** valor estimado e observações internas.

### Interesses
Visitante preenche **Tenho interesse** → o registro aparece no **Painel** e em **Interesses** → a equipe usa o botão **WhatsApp** do cartão para responder e atualiza a situação (Novo → Em contato → Negociando → Concluído/Descartado).
Uma peça com interesses registrados não pode ser excluída: para tirá-la do site, desmarque **Mostrar no site**.

---

## 7. Segurança (o que o banco garante)

Testado no banco real em 15/10/2026:

| O visitante… | Resultado |
|---|---|
| vê peças marcadas como públicas | Sim |
| vê valor estimado / observações internas | Não (bloqueado pelo banco) |
| lê interesses ou usuários | Não |
| cadastra, altera ou exclui peças | Não |
| registra interesse em peça "À venda" | Sim (só nela) |
| envia ou apaga fotos | Não |

---

## 8. Limites, custos e backup

| Serviço | Plano | Limites relevantes | Se crescer |
|---|---|---|---|
| Supabase | Grátis | 500 MB de banco · 1 GB de fotos (~3.000 fotos) · 5 GB de tráfego/mês · **pausa após 7 dias sem acesso** · **sem backup automático** | Pro: US$ 25/mês (sem pausa, backups diários) |
| Cloudflare Pages | Grátis | 500 publicações/mês; uso comercial permitido | — |
| GitHub | Grátis | Repositório privado | — |
| Domínio próprio | Opcional | ~R$ 40/ano (Registro.br) | — |

**Backup (fazer mensalmente no plano grátis):**
- Dados: Supabase → **Table Editor** → abrir cada tabela (`objetos`, `imagens_objetos`, `categorias`, `interesses`, `institucional`, `perfis`) → **Export → CSV**. Salvar em `ReliquiasDaFamilia\backup\AAAA-MM`.
- Fotos: Supabase → **Storage** → bucket `objetos` → baixar os arquivos (cada pasta é o número da peça; os arquivos `_m` são miniaturas e não precisam de backup).
- O código já está protegido no GitHub.

**Projeto pausado?** Supabase → abrir o projeto → **Restore project**. Os dados não se perdem; o site volta em alguns minutos.

---

## 9. Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Tela "Configuração pendente" | Variáveis do Cloudflare ausentes | Conferir 5.3 e fazer **Retry deployment** (5.4) |
| Página em branco por alguns segundos | Carregamento inicial | Aguardar; se persistir, Ctrl+F5 |
| Site sem peças / erro de conexão | Supabase pausado | **Restore project** (seção 8) |
| "E-mail ou senha incorretos" | Senha ou e-mail diferente do cadastrado | Conferir com a consulta de 3.7 e trocar a senha (3.7) |
| "Sem acesso à administração" | Usuário sem perfil ou inativo | `INSERT` em `perfis` (3.4 / 3.7) ou `ativo = true` |
| Erro ao excluir foto | Script 002 não executado | Rodar `002_storage_leitura_equipe.sql` |
| Visitante não vê botão de WhatsApp | WhatsApp não preenchido na Página Sobre | Preencher na administração |
| Peça não aparece no site | "Mostrar no site" desmarcado | Marcar e salvar |
| Peça sem "Tenho interesse" | Situação diferente de "À venda" | Mudar para "À venda" |
| ❌ na tarefa do GitHub | Segredos ausentes ou com nome errado | Refazer 4.4 |
| Publicação com erro no Cloudflare | Falha de build | Deployments → Build log (enviar ao Claude) |
| Claude não consegue enviar ao GitHub | Aplicativo do Claude sem acesso ao repositório | Refazer 4.2 |

---

## 10. Domínio próprio (opcional)
1. Registrar o domínio (ex.: `reliquiasdafamilia.com.br`) no https://registro.br.
2. Cloudflare → projeto → **Custom domains** → **Set up a custom domain** → seguir as instruções de DNS.
3. Atualizar o **Site URL** no Supabase (3.6) para o novo endereço.

---

## 11. Como as alterações chegam ao site
1. O Paulo pede a mudança ao Claude (projeto "Relíquias da Família" no claude.ai).
2. O Claude altera o código, testa e envia ao GitHub.
3. O Cloudflare publica sozinho em 1–2 minutos.
4. Mudanças de banco vêm como novos scripts numerados em `database` (003, 004…), para rodar no SQL Editor na ordem.

---

## 12. Estrutura do projeto
```
ReliquiasDaFamilia/
├─ README.md
├─ database/   scripts SQL (001, 002…)
├─ docs/       ARQUITETURA.md · REENGENHARIA_AMRELIQUIAS.md · GUIA_CONFIGURACAO.md
├─ public/     ícone do site
├─ src/        código do site (páginas públicas e administração)
├─ index.html · package.json · tsconfig.json · vite.config.ts
├─ .env.example      modelo das variáveis
└─ .github/workflows/manter-ativo.yml   (só no GitHub)
```

---

## 13. Checklist de configuração

- [x] Supabase: projeto criado em São Paulo
- [x] Supabase: scripts 001 e 002 executados
- [x] Supabase: cadastro público bloqueado
- [x] Supabase: usuário ADMIN criado e testado
- [ ] Supabase: Site URL configurado (3.6)
- [x] GitHub: repositório privado criado e código enviado
- [x] GitHub: Claude conectado e aplicativo instalado
- [ ] GitHub: segredos `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` + teste da tarefa (4.4)
- [x] Cloudflare: conta confirmada e projeto Pages publicado
- [x] Teste completo no banco real (cadastro, foto, interesse, segurança, limpeza)
- [ ] Página Sobre preenchida (com WhatsApp)
- [ ] Categorias e primeiras peças cadastradas
- [ ] Rotina mensal de backup definida
- [ ] Pasta antiga: apagar `C:\PauloRocha\OneDrive\Programas\AMReliquias\_claude_tmp_supabase.tgz` (arquivo temporário usado na migração)
