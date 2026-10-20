-- =====================================================================
-- Relíquias da Família — 004_textos_entrada.sql
-- Atualiza os textos da tela de entrada para o estilo "álbum de família".
-- Necessário porque o 003 gravou os textos antigos na tabela configuracoes,
-- e o site usa o texto do banco antes do texto padrão do código.
-- Executar no Supabase: SQL Editor > New query > colar > Run
-- =====================================================================

BEGIN;

UPDATE public.configuracoes
SET entrada_frase   = 'Para quem cuida do que veio antes: objetos que atravessaram gerações, preservados com carinho para as que ainda virão.',
    entrada_convite = 'Cada peça tem um nome, uma origem e uma lembrança.'
WHERE id = 1;

-- Conferência: deve mostrar os textos novos
SELECT entrada_frase, entrada_convite FROM public.configuracoes WHERE id = 1;

COMMIT;
