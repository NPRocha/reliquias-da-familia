-- =====================================================================
-- Relíquias da Família — 001_estrutura_inicial.sql
-- Banco: Supabase (PostgreSQL 15+)
-- Executar no Supabase: SQL Editor > New query > colar > Run
-- Reengenharia do ScriptTabelas.sql (AMReliquias, T-SQL)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. PERFIS (equipe que administra o sistema; login via Supabase Auth)
--    Visitantes NÃO precisam de conta: o interesse é feito por formulário.
-- ---------------------------------------------------------------------
CREATE TABLE public.perfis (
    id          uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    nome        text        NOT NULL,
    papel       text        NOT NULL DEFAULT 'OPERADOR'
                            CHECK (papel IN ('ADMIN', 'OPERADOR')),
    ativo       boolean     NOT NULL DEFAULT true,
    criado_em   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. CATEGORIAS
-- ---------------------------------------------------------------------
CREATE TABLE public.categorias (
    id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        text        NOT NULL UNIQUE,
    descricao   text,
    ordem       smallint    NOT NULL DEFAULT 0,
    ativo       boolean     NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- 3. ESTADOS DE CONSERVAÇÃO
-- ---------------------------------------------------------------------
CREATE TABLE public.estados_conservacao (
    id          smallint    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descricao   text        NOT NULL UNIQUE,
    ordem       smallint    NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- 4. OBJETOS (as relíquias)
--    situacao substitui disponivel_venda + status do modelo antigo.
-- ---------------------------------------------------------------------
CREATE TABLE public.objetos (
    id                     bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo                 text          UNIQUE,              -- etiqueta física (ex.: REL-0001)
    nome                   text          NOT NULL,
    descricao              text,
    historia               text,
    procedencia            text,                              -- de quem veio / como chegou à família
    ano_origem             text,                              -- texto: "c. 1920", "década de 50"
    material               text,
    dimensoes              text,
    categoria_id           bigint        REFERENCES public.categorias (id),
    estado_conservacao_id  smallint      REFERENCES public.estados_conservacao (id),
    valor_estimado         numeric(12,2) CHECK (valor_estimado >= 0),  -- interno
    valor_venda            numeric(12,2) CHECK (valor_venda   >= 0),   -- exibido se À venda
    situacao               text          NOT NULL DEFAULT 'ACERVO'
                                         CHECK (situacao IN ('ACERVO', 'A_VENDA', 'RESERVADO', 'VENDIDO')),
    publico                boolean       NOT NULL DEFAULT true,
    observacoes_internas   text,                              -- nunca exibido ao público
    criado_em              timestamptz   NOT NULL DEFAULT now(),
    criado_por             uuid          REFERENCES public.perfis (id),
    atualizado_em          timestamptz,
    atualizado_por         uuid          REFERENCES public.perfis (id)
);

CREATE INDEX ix_objetos_categoria ON public.objetos (categoria_id);
CREATE INDEX ix_objetos_situacao  ON public.objetos (situacao) WHERE publico;

-- ---------------------------------------------------------------------
-- 5. IMAGENS DOS OBJETOS (arquivos no Supabase Storage, bucket "objetos")
-- ---------------------------------------------------------------------
CREATE TABLE public.imagens_objetos (
    id               bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    objeto_id        bigint      NOT NULL REFERENCES public.objetos (id) ON DELETE CASCADE,
    caminho_storage  text        NOT NULL UNIQUE,   -- ex.: 15/9f3c...e1.webp
    legenda          text,
    ordem            smallint    NOT NULL DEFAULT 0,
    principal        boolean     NOT NULL DEFAULT false,
    criado_em        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_imagens_objeto ON public.imagens_objetos (objeto_id, ordem);
-- no máximo 1 imagem principal por objeto
CREATE UNIQUE INDEX ux_imagens_principal ON public.imagens_objetos (objeto_id) WHERE principal;

-- ---------------------------------------------------------------------
-- 6. INTERESSES (substitui pedidos/pedido_itens)
--    Visitante clica "Tenho interesse" → registro aqui → abre WhatsApp.
-- ---------------------------------------------------------------------
CREATE TABLE public.interesses (
    id              bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    objeto_id       bigint        NOT NULL REFERENCES public.objetos (id),
    nome            text          NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 120),
    whatsapp        text          NOT NULL CHECK (whatsapp ~ '^[0-9]{10,13}$'),  -- só dígitos, com DDD
    email           text          CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    mensagem        text          CHECK (mensagem IS NULL OR char_length(mensagem) <= 1000),
    situacao        text          NOT NULL DEFAULT 'NOVO'
                                  CHECK (situacao IN ('NOVO', 'EM_CONTATO', 'NEGOCIANDO', 'CONCLUIDO', 'DESCARTADO')),
    valor_proposto  numeric(12,2) CHECK (valor_proposto >= 0),
    observacoes     text,
    criado_em       timestamptz   NOT NULL DEFAULT now(),
    atualizado_em   timestamptz
);

CREATE INDEX ix_interesses_objeto   ON public.interesses (objeto_id);
CREATE INDEX ix_interesses_situacao ON public.interesses (situacao, criado_em DESC);

-- ---------------------------------------------------------------------
-- 7. INSTITUCIONAL (antiga "anunciacao") — registro único (id = 1)
-- ---------------------------------------------------------------------
CREATE TABLE public.institucional (
    id                smallint    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nome_responsavel  text,
    titulo            text,
    apresentacao      text,
    curriculo         text,
    foto_caminho      text,        -- caminho no bucket "institucional"
    whatsapp          text CHECK (whatsapp IS NULL OR whatsapp ~ '^[0-9]{12,13}$'),  -- com 55 + DDD
    email             text,
    atualizado_em     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.institucional (id, titulo) VALUES (1, 'Relíquias da Família');

-- ---------------------------------------------------------------------
-- 8. TRIGGER: atualizado_em automático
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_objetos_atualizado       BEFORE UPDATE ON public.objetos       FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();
CREATE TRIGGER tg_interesses_atualizado    BEFORE UPDATE ON public.interesses    FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();
CREATE TRIGGER tg_institucional_atualizado BEFORE UPDATE ON public.institucional FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

-- ---------------------------------------------------------------------
-- 9. FUNÇÕES DE PERMISSÃO
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_is_equipe()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND ativo);
$$;

CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND ativo AND papel = 'ADMIN');
$$;

-- ---------------------------------------------------------------------
-- 10. SEGURANÇA (RLS) — público só lê o catálogo e registra interesse
-- ---------------------------------------------------------------------
ALTER TABLE public.perfis              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_conservacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objetos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_objetos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interesses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institucional       ENABLE ROW LEVEL SECURITY;

-- perfis
CREATE POLICY perfis_sel ON public.perfis FOR SELECT TO authenticated USING (id = auth.uid() OR public.fn_is_admin());
CREATE POLICY perfis_adm ON public.perfis FOR ALL    TO authenticated USING (public.fn_is_admin()) WITH CHECK (public.fn_is_admin());

-- domínios
CREATE POLICY categorias_sel ON public.categorias FOR SELECT TO anon, authenticated USING (ativo OR public.fn_is_equipe());
CREATE POLICY categorias_eqp ON public.categorias FOR ALL    TO authenticated USING (public.fn_is_equipe()) WITH CHECK (public.fn_is_equipe());

CREATE POLICY estados_sel ON public.estados_conservacao FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY estados_eqp ON public.estados_conservacao FOR ALL    TO authenticated USING (public.fn_is_equipe()) WITH CHECK (public.fn_is_equipe());

-- objetos: público vê só os públicos e só colunas não sensíveis
CREATE POLICY objetos_sel_pub ON public.objetos FOR SELECT TO anon          USING (publico);
CREATE POLICY objetos_sel_eqp ON public.objetos FOR SELECT TO authenticated USING (publico OR public.fn_is_equipe());
CREATE POLICY objetos_eqp     ON public.objetos FOR ALL    TO authenticated USING (public.fn_is_equipe()) WITH CHECK (public.fn_is_equipe());

REVOKE SELECT ON public.objetos FROM anon;
GRANT  SELECT (id, codigo, nome, descricao, historia, procedencia, ano_origem, material, dimensoes,
               categoria_id, estado_conservacao_id, valor_venda, situacao, publico, criado_em)
       ON public.objetos TO anon;

-- imagens
CREATE POLICY imagens_sel ON public.imagens_objetos FOR SELECT TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM public.objetos o WHERE o.id = objeto_id AND o.publico) OR public.fn_is_equipe());
CREATE POLICY imagens_eqp ON public.imagens_objetos FOR ALL TO authenticated USING (public.fn_is_equipe()) WITH CHECK (public.fn_is_equipe());

-- interesses: público só insere (em objeto público e à venda); equipe gerencia
CREATE POLICY interesses_ins ON public.interesses FOR INSERT TO anon, authenticated
    WITH CHECK (situacao = 'NOVO' AND valor_proposto IS NULL AND observacoes IS NULL
                AND EXISTS (SELECT 1 FROM public.objetos o WHERE o.id = objeto_id AND o.publico AND o.situacao = 'A_VENDA'));
CREATE POLICY interesses_eqp ON public.interesses FOR ALL TO authenticated USING (public.fn_is_equipe()) WITH CHECK (public.fn_is_equipe());

-- institucional
CREATE POLICY institucional_sel ON public.institucional FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY institucional_eqp ON public.institucional FOR UPDATE TO authenticated USING (public.fn_is_equipe()) WITH CHECK (public.fn_is_equipe());

-- ---------------------------------------------------------------------
-- 11. STORAGE (imagens) — leitura pública, gravação só da equipe
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('objetos',       'objetos',       true, 2097152, ARRAY['image/webp', 'image/jpeg', 'image/png']),
       ('institucional', 'institucional', true, 2097152, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_eqp_ins ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('objetos', 'institucional') AND public.fn_is_equipe());
CREATE POLICY storage_eqp_upd ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id IN ('objetos', 'institucional') AND public.fn_is_equipe());
CREATE POLICY storage_eqp_del ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id IN ('objetos', 'institucional') AND public.fn_is_equipe());

-- ---------------------------------------------------------------------
-- 12. DADOS INICIAIS
-- ---------------------------------------------------------------------
INSERT INTO public.estados_conservacao (descricao, ordem) VALUES
    ('Excelente', 1), ('Muito bom', 2), ('Bom', 3), ('Regular', 4), ('Precisa de restauro', 5);

COMMIT;
