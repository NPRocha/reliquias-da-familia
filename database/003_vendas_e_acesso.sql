-- =====================================================================
-- Relíquias da Família — 003_vendas_e_acesso.sql
-- Banco: Supabase (PostgreSQL 15+)
-- Executar no Supabase: SQL Editor > New query > colar > Run (uma única vez)
--
-- O que muda:
--  1. Chave geral "Vendas ativas" (só ADMIN) e textos da tela de entrada.
--  2. Usuários: ADMIN, OPERADOR e VISITANTE, pré-cadastrados pelo ADMIN.
--     O acesso é liberado por código de 6 dígitos (primeiro acesso / nova senha).
--  3. Site só com login enquanto as vendas estiverem desligadas.
--     Com vendas ligadas, público e visitantes veem só as peças "À venda".
--  4. Fotos privadas; no máximo 4 por peça; até 500 KB por arquivo.
--  5. Reserva da peça a partir do interesse (reservar / concluir / desistência).
--  6. WhatsApp removido da página Sobre.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. CONFIGURAÇÕES (registro único, id = 1)
-- ---------------------------------------------------------------------
CREATE TABLE public.configuracoes (
    id               smallint    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    vendas_ativas    boolean     NOT NULL DEFAULT false,
    entrada_frase    text,       -- frase de apresentação da tela de entrada
    entrada_convite  text,       -- texto acima do formulário de entrada
    entrada_aviso    text,       -- aviso abaixo do formulário
    vendas_texto     text,       -- aviso exibido quando as vendas estão ligadas
    atualizado_em    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.configuracoes (id, entrada_frase, entrada_convite, entrada_aviso, vendas_texto) VALUES (
    1,
    'Aqui guardamos o que o tempo nos deixou: objetos que atravessaram gerações e as histórias de quem cuidou deles.',
    'Cada peça tem um nome, uma origem e uma lembrança. Entre para conhecê-las.',
    'Acesso restrito à família e a convidados.',
    'Algumas peças do acervo estão em busca de um novo lar.'
);

CREATE TRIGGER tg_configuracoes_atualizado BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

-- ---------------------------------------------------------------------
-- 2. PERFIS → cadastro de usuários feito pelo ADMIN
--    id passa a ser próprio; usuario_id liga ao login (Supabase Auth)
--    depois do primeiro acesso.
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'public.perfis'::regclass AND contype IN ('f', 'c')
    LOOP
        EXECUTE format('ALTER TABLE public.perfis DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE public.perfis
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    ADD COLUMN usuario_id        uuid        UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL,
    ADD COLUMN email             text,
    ADD COLUMN whatsapp          text,
    ADD COLUMN codigo_hash       text,
    ADD COLUMN codigo_expira     timestamptz,
    ADD COLUMN codigo_tentativas smallint    NOT NULL DEFAULT 0,
    ADD COLUMN atualizado_em     timestamptz;

-- perfis existentes (ADMIN atual): id já era o do login
UPDATE public.perfis p
SET usuario_id = u.id, email = lower(u.email)
FROM auth.users u
WHERE u.id = p.id;

DELETE FROM public.perfis WHERE email IS NULL;   -- perfil sem login correspondente

ALTER TABLE public.perfis
    ALTER COLUMN email SET NOT NULL,
    ALTER COLUMN papel SET DEFAULT 'VISITANTE',
    ADD CONSTRAINT ck_perfis_papel    CHECK (papel IN ('ADMIN', 'OPERADOR', 'VISITANTE')),
    ADD CONSTRAINT ck_perfis_nome     CHECK (char_length(trim(nome)) BETWEEN 2 AND 120),
    ADD CONSTRAINT ck_perfis_email    CHECK (email = lower(trim(email)) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    ADD CONSTRAINT ck_perfis_whatsapp CHECK (whatsapp IS NULL OR whatsapp ~ '^[0-9]{10,13}$');

CREATE UNIQUE INDEX ux_perfis_email ON public.perfis (email);

CREATE TRIGGER tg_perfis_atualizado BEFORE UPDATE ON public.perfis
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

-- ---------------------------------------------------------------------
-- 3. FUNÇÕES DE PERMISSÃO
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_meu_papel()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT papel FROM public.perfis WHERE usuario_id = auth.uid() AND ativo;
$$;

CREATE OR REPLACE FUNCTION public.fn_meu_perfil_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT id FROM public.perfis WHERE usuario_id = auth.uid() AND ativo;
$$;

CREATE OR REPLACE FUNCTION public.fn_is_membro()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT public.fn_meu_papel() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.fn_is_equipe()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce(public.fn_meu_papel() IN ('ADMIN', 'OPERADOR'), false);
$$;

CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce(public.fn_meu_papel() = 'ADMIN', false);
$$;

CREATE OR REPLACE FUNCTION public.fn_vendas_ativas()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce((SELECT vendas_ativas FROM public.configuracoes WHERE id = 1), false);
$$;

-- Peça visível no site para quem está consultando:
--   equipe: todas; vendas ligadas: só "À venda" (público e visitantes);
--   vendas desligadas: só usuários com login (família/convidados).
CREATE OR REPLACE FUNCTION public.fn_objeto_visivel(p_objeto bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT public.fn_is_equipe() OR EXISTS (
        SELECT 1 FROM public.objetos o
        WHERE o.id = p_objeto AND o.publico
          AND CASE WHEN public.fn_vendas_ativas() THEN o.situacao = 'A_VENDA' ELSE public.fn_is_membro() END
    );
$$;

-- ---------------------------------------------------------------------
-- 4. REGRAS DOS PERFIS (o ADMIN gerencia; cada um lê o próprio)
--    O código de acesso nunca é lido pelo site (só o hash, só pelo banco).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS perfis_sel ON public.perfis;
DROP POLICY IF EXISTS perfis_adm ON public.perfis;
CREATE POLICY perfis_sel ON public.perfis FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR public.fn_is_admin());
CREATE POLICY perfis_adm ON public.perfis FOR ALL    TO authenticated USING (public.fn_is_admin()) WITH CHECK (public.fn_is_admin());

REVOKE ALL ON public.perfis FROM anon, authenticated;
GRANT SELECT (id, nome, email, whatsapp, papel, ativo, usuario_id, codigo_expira, criado_em) ON public.perfis TO authenticated;
GRANT INSERT (nome, email, whatsapp, papel, ativo) ON public.perfis TO authenticated;
GRANT UPDATE (nome, email, whatsapp, papel, ativo) ON public.perfis TO authenticated;
GRANT DELETE ON public.perfis TO authenticated;

-- Protege: e-mail não muda depois do primeiro acesso; sempre resta 1 ADMIN ativo.
CREATE OR REPLACE FUNCTION public.fn_perfis_protecao()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.usuario_id IS NOT NULL AND NEW.email <> OLD.email THEN
        RAISE EXCEPTION 'O e-mail não pode ser alterado depois do primeiro acesso.';
    END IF;
    IF OLD.papel = 'ADMIN' AND OLD.ativo
       AND (TG_OP = 'DELETE' OR NEW.papel <> 'ADMIN' OR NOT NEW.ativo)
       AND NOT EXISTS (SELECT 1 FROM public.perfis
                       WHERE id <> OLD.id AND papel = 'ADMIN' AND ativo AND usuario_id IS NOT NULL) THEN
        RAISE EXCEPTION 'O sistema precisa de pelo menos um administrador ativo.';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_perfis_protecao BEFORE UPDATE OR DELETE ON public.perfis
    FOR EACH ROW EXECUTE FUNCTION public.fn_perfis_protecao();

-- ---------------------------------------------------------------------
-- 5. CÓDIGO DE ACESSO (gerado pelo ADMIN, enviado por WhatsApp)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_gerar_codigo(p_perfil uuid)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_codigo text;
BEGIN
    IF NOT public.fn_is_admin() THEN
        RAISE EXCEPTION 'Sem permissão para esta operação.';
    END IF;
    v_codigo := lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
    UPDATE public.perfis
    SET codigo_hash = extensions.crypt(v_codigo, extensions.gen_salt('bf')),
        codigo_expira = now() + interval '48 hours',
        codigo_tentativas = 0
    WHERE id = p_perfil AND ativo;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuário não encontrado ou inativo.';
    END IF;
    RETURN v_codigo;
END;
$$;

-- Primeiro acesso ou nova senha. Devolve 'OK' ou a mensagem de erro
-- (sem exceção, para que a contagem de tentativas erradas seja gravada).
CREATE OR REPLACE FUNCTION public.fn_primeiro_acesso(p_email text, p_codigo text, p_senha text)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_email text := lower(trim(coalesce(p_email, '')));
    v_p     public.perfis%ROWTYPE;
    v_uid   uuid;
    v_hash  text;
    c_invalido constant text := 'E-mail ou código inválido, ou código vencido. Peça um novo código ao administrador.';
BEGIN
    IF char_length(coalesce(p_senha, '')) < 8 THEN
        RETURN 'A senha precisa ter pelo menos 8 caracteres.';
    END IF;

    SELECT * INTO v_p FROM public.perfis WHERE email = v_email AND ativo FOR UPDATE;
    IF NOT FOUND OR v_p.codigo_hash IS NULL OR v_p.codigo_expira < now() THEN
        RETURN c_invalido;
    END IF;
    IF v_p.codigo_tentativas >= 5 THEN
        RETURN 'Código bloqueado após 5 tentativas erradas. Peça um novo código ao administrador.';
    END IF;
    IF extensions.crypt(trim(coalesce(p_codigo, '')), v_p.codigo_hash) <> v_p.codigo_hash THEN
        UPDATE public.perfis SET codigo_tentativas = codigo_tentativas + 1 WHERE id = v_p.id;
        RETURN c_invalido;
    END IF;

    v_hash := extensions.crypt(p_senha, extensions.gen_salt('bf'));
    v_uid  := v_p.usuario_id;
    IF v_uid IS NULL THEN
        SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_email;
    END IF;

    IF v_uid IS NULL THEN
        v_uid := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token)
        VALUES (
            '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, v_hash, now(),
            '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome', v_p.nome), now(), now(),
            '', '', '', '', '', '', '', '');
        INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_uid, v_uid::text,
                jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
                'email', now(), now(), now());
    ELSE
        UPDATE auth.users
        SET encrypted_password = v_hash,
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = v_uid;
    END IF;

    UPDATE public.perfis
    SET usuario_id = v_uid, codigo_hash = NULL, codigo_expira = NULL, codigo_tentativas = 0
    WHERE id = v_p.id;
    RETURN 'OK';
END;
$$;

REVOKE ALL ON FUNCTION public.fn_gerar_codigo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_gerar_codigo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_primeiro_acesso(text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. CONFIGURAÇÕES: todos leem (a tela de entrada precisa); só ADMIN altera
-- ---------------------------------------------------------------------
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY configuracoes_sel ON public.configuracoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY configuracoes_adm ON public.configuracoes FOR UPDATE TO authenticated USING (public.fn_is_admin()) WITH CHECK (public.fn_is_admin());

-- ---------------------------------------------------------------------
-- 7. PEÇAS
--    Tabela: só a equipe. Site: visão "catalogo", que aplica as regras
--    da chave de vendas e esconde o que cada um não pode ver.
-- ---------------------------------------------------------------------
ALTER TABLE public.objetos ADD COLUMN reservado_para bigint REFERENCES public.interesses (id) ON DELETE SET NULL;

DROP POLICY IF EXISTS objetos_sel_pub ON public.objetos;
DROP POLICY IF EXISTS objetos_sel_eqp ON public.objetos;
REVOKE ALL ON public.objetos FROM anon;

CREATE VIEW public.catalogo WITH (security_barrier = true) AS
SELECT o.id, o.codigo, o.nome, o.descricao, o.historia, o.procedencia, o.ano_origem,
       o.material, o.dimensoes, o.categoria_id, o.estado_conservacao_id,
       CASE WHEN c.vendas_ativas THEN o.situacao ELSE 'ACERVO' END                AS situacao,
       CASE WHEN c.vendas_ativas AND o.situacao = 'A_VENDA' THEN o.valor_venda END AS valor_venda,
       CASE WHEN NOT c.vendas_ativas THEN o.valor_estimado END                   AS valor_estimado,
       o.criado_em
FROM public.objetos o
JOIN public.configuracoes c ON c.id = 1
WHERE o.publico
  AND CASE WHEN c.vendas_ativas THEN o.situacao = 'A_VENDA' ELSE public.fn_is_membro() END;

GRANT SELECT ON public.catalogo TO anon, authenticated;

-- Autoria automática e limpeza da reserva quando a peça deixa de estar reservada
CREATE OR REPLACE FUNCTION public.fn_objetos_auditoria()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.criado_por := public.fn_meu_perfil_id();
    ELSE
        NEW.atualizado_por := public.fn_meu_perfil_id();
    END IF;
    IF NEW.situacao <> 'RESERVADO' THEN
        NEW.reservado_para := NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_objetos_auditoria BEFORE INSERT OR UPDATE ON public.objetos
    FOR EACH ROW EXECUTE FUNCTION public.fn_objetos_auditoria();

-- ---------------------------------------------------------------------
-- 8. FOTOS: visíveis conforme a peça; no máximo 4 por peça
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS imagens_sel ON public.imagens_objetos;
CREATE POLICY imagens_sel ON public.imagens_objetos FOR SELECT TO anon, authenticated
    USING (public.fn_objeto_visivel(objeto_id));

CREATE OR REPLACE FUNCTION public.fn_imagens_limite()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF (SELECT count(*) FROM public.imagens_objetos WHERE objeto_id = NEW.objeto_id) >= 4 THEN
        RAISE EXCEPTION 'Cada peça pode ter no máximo 4 fotos.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_imagens_limite BEFORE INSERT ON public.imagens_objetos
    FOR EACH ROW EXECUTE FUNCTION public.fn_imagens_limite();

-- Arquivos privados; até 500 KB por arquivo
UPDATE storage.buckets SET public = false, file_size_limit = 512000 WHERE id = 'objetos';
UPDATE storage.buckets SET public = false WHERE id = 'institucional';

DROP POLICY IF EXISTS storage_eqp_sel ON storage.objects;
CREATE POLICY storage_sel ON storage.objects FOR SELECT TO anon, authenticated
    USING (
        (bucket_id = 'objetos' AND (
            public.fn_is_equipe()
            OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9]+$'
                    THEN public.fn_objeto_visivel(((storage.foldername(name))[1])::bigint)
                    ELSE false END))
        OR (bucket_id = 'institucional' AND (public.fn_is_equipe() OR (public.fn_is_membro() AND NOT public.fn_vendas_ativas())))
    );

-- ---------------------------------------------------------------------
-- 9. INTERESSES: só com vendas ligadas e em peça "À venda"
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_aceita_interesse(p_objeto bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT public.fn_vendas_ativas() AND EXISTS (
        SELECT 1 FROM public.objetos o WHERE o.id = p_objeto AND o.publico AND o.situacao = 'A_VENDA');
$$;

DROP POLICY IF EXISTS interesses_ins ON public.interesses;
CREATE POLICY interesses_ins ON public.interesses FOR INSERT TO anon, authenticated
    WITH CHECK (situacao = 'NOVO' AND valor_proposto IS NULL AND observacoes IS NULL
                AND public.fn_aceita_interesse(objeto_id));

-- Reserva a peça para o interessado (À venda → Reservado; interesse → Negociando)
CREATE OR REPLACE FUNCTION public.fn_reservar(p_interesse bigint)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_obj bigint;
BEGIN
    IF NOT public.fn_is_equipe() THEN RAISE EXCEPTION 'Sem permissão para esta operação.'; END IF;
    SELECT objeto_id INTO v_obj FROM public.interesses WHERE id = p_interesse;
    UPDATE public.objetos SET situacao = 'RESERVADO', reservado_para = p_interesse
    WHERE id = v_obj AND situacao = 'A_VENDA';
    IF NOT FOUND THEN RAISE EXCEPTION 'A peça não está "À venda" (pode já estar reservada ou vendida).'; END IF;
    UPDATE public.interesses SET situacao = 'NEGOCIANDO' WHERE id = p_interesse;
END;
$$;

-- Conclui a venda (Reservado → Vendido; interesse → Concluído)
CREATE OR REPLACE FUNCTION public.fn_concluir_venda(p_interesse bigint)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_obj bigint;
BEGIN
    IF NOT public.fn_is_equipe() THEN RAISE EXCEPTION 'Sem permissão para esta operação.'; END IF;
    SELECT objeto_id INTO v_obj FROM public.interesses WHERE id = p_interesse;
    UPDATE public.objetos SET situacao = 'VENDIDO'
    WHERE id = v_obj AND situacao = 'RESERVADO' AND reservado_para = p_interesse;
    IF NOT FOUND THEN RAISE EXCEPTION 'A peça precisa estar reservada para este interessado.'; END IF;
    UPDATE public.interesses SET situacao = 'CONCLUIDO' WHERE id = p_interesse;
END;
$$;

-- Desistência (Reservado → À venda; interesse → Descartado)
CREATE OR REPLACE FUNCTION public.fn_desistencia(p_interesse bigint)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_obj bigint;
BEGIN
    IF NOT public.fn_is_equipe() THEN RAISE EXCEPTION 'Sem permissão para esta operação.'; END IF;
    SELECT objeto_id INTO v_obj FROM public.interesses WHERE id = p_interesse;
    UPDATE public.objetos SET situacao = 'A_VENDA', reservado_para = NULL
    WHERE id = v_obj AND situacao = 'RESERVADO' AND reservado_para = p_interesse;
    IF NOT FOUND THEN RAISE EXCEPTION 'A peça precisa estar reservada para este interessado.'; END IF;
    UPDATE public.interesses SET situacao = 'DESCARTADO' WHERE id = p_interesse;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_reservar(bigint), public.fn_concluir_venda(bigint), public.fn_desistencia(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_reservar(bigint), public.fn_concluir_venda(bigint), public.fn_desistencia(bigint) TO authenticated;

-- ---------------------------------------------------------------------
-- 10. PÁGINA SOBRE: só família/convidados com vendas desligadas; sem WhatsApp
-- ---------------------------------------------------------------------
ALTER TABLE public.institucional DROP COLUMN whatsapp;

DROP POLICY IF EXISTS institucional_sel ON public.institucional;
CREATE POLICY institucional_sel ON public.institucional FOR SELECT TO authenticated
    USING (public.fn_is_equipe() OR (public.fn_is_membro() AND NOT public.fn_vendas_ativas()));
REVOKE SELECT ON public.institucional FROM anon;

COMMIT;
