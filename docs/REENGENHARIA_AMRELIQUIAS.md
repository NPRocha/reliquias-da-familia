# Reengenharia do projeto AMReliquias

Origem: C:\PauloRocha\OneDrive\Programas\AMReliquias (arquivos de 22/06/2026). Varredura em 15/10/2026.

## Conteúdo encontrado
- 7 arquivos próprios + node_modules (dependências instaladas).
- `package.json` — Node.js (ES Modules), script `dev` com nodemon.
- `src/server.js` — servidor Express 5, CORS, JSON, porta 3000 fixa.
- `src/routes.js` — `GET /` (teste) e `GET /objetos` (lista todos os objetos).
- `src/supabaseClient.js` — cliente Supabase via `.env`.
- `.env` — SUPABASE_URL e SUPABASE_KEY (chave publishable/anon).
- `ScriptTabelas.sql` — DDL de 8 tabelas em sintaxe SQL Server.
- `npm` — arquivo vazio (criado por engano).
- Não havia frontend, autenticação, upload de imagens, testes nem documentação.

## Modelo de dados antigo
usuarios (ADMIN/OPERADOR/CLIENTE) · categorias · estado_conservacao · objetos · imagens_objetos · pedidos · pedido_itens · anunciacao

## Inconsistências encontradas
1. Script em T-SQL não roda no Supabase/PostgreSQL usado pelo backend.
2. `status` e `tipo_usuario` em texto livre, sem CHECK.
3. `pedido_itens.quantidade` sem sentido para peça única; sem bloqueio de venda dupla.
4. `data_atualizacao` sem trigger.
5. Senha própria em `usuarios` duplicando o Supabase Auth.
6. Armazenamento das imagens não definido.
7. API sem validação, sem tratamento de erro, sem autenticação.

## Estágio
~5% — esqueleto de API com 1 endpoint e modelo preliminar.

Todas as decisões de continuidade estão em `ARQUITETURA.md`.
