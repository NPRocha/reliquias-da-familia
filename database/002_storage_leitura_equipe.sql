-- =====================================================================
-- Relíquias da Família — 002_storage_leitura_equipe.sql
-- Permite à equipe listar/remover fotos no Storage (a remoção exige SELECT).
-- Executar no Supabase: SQL Editor > New query > colar > Run
-- =====================================================================
CREATE POLICY storage_eqp_sel ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id IN ('objetos', 'institucional') AND public.fn_is_equipe());
