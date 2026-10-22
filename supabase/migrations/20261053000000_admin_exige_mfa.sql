-- ============================================================
-- Migration: 20261053000000_admin_exige_mfa.sql
--
-- MFA do admin, etapa 2 (a etapa 1 — cadastro do autenticador e tela de desafio — foi a PR #132). A partir daqui as ações de admin
-- exigem que a SESSÃO tenha passado pelo código do autenticador (aal2), não só por Google/senha:
--   * treino.is_admin() passa a exigir também `aal = 'aal2'` no token. Ela é chamada por TODAS as funções admin_* (resumo, listar
--     personais, alterar trial/plano/CPF, regiões, consentimentos) e pela policy de leitura de admin_logs, então a exigência cobre tudo.
--   * a Edge Function admin-actions (reset de senha) confere a mesma função (deploy junto).
-- O front (/admin) já pede o código antes de montar o painel e leva quem ainda não tem autenticador para /admin/seguranca.
--
-- ACESSO DE EMERGÊNCIA (perdeu o celular/autenticador): o SQL Editor roda como dono e não passa por is_admin(). Para cadastrar de novo:
--   DELETE FROM auth.mfa_factors WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contato@personalperto.com.br');
-- (depois entre no painel e cadastre outro autenticador em /admin/seguranca).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT is_admin FROM treino.professionals WHERE id = (SELECT auth.uid())), false)
         -- sessão que também passou pelo segundo fator (TOTP): o token traz aal = 'aal2'
         AND COALESCE((SELECT auth.jwt()) ->> 'aal', '') = 'aal2'
$$;

REVOKE ALL ON FUNCTION treino.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.is_admin() TO authenticated;

COMMIT;
