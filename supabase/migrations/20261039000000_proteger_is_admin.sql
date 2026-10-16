-- ============================================================
-- Migration: 20261039000000_proteger_is_admin.sql
--
-- CORREÇÃO DE SEGURANÇA (CRÍTICA) — escalada de privilégio em treino.professionals.
--
-- Problema: a policy professionals_self_update permite ao personal atualizar a
-- PRÓPRIA linha, e o GRANT de UPDATE era na tabela inteira. Logo, qualquer
-- usuário autenticado podia executar, pela REST API,
--   UPDATE treino.professionals SET is_admin = true WHERE id = auth.uid()
-- e passar a chamar as funções admin_* e a Edge Function admin-actions
-- (que gera link de recuperação de senha de qualquer e-mail).
--
-- Correção em duas camadas (defesa em profundidade):
--   1. GRANT de UPDATE por coluna: o cliente só atualiza as colunas que o app
--      realmente edita (src/features/auth/api.ts).
--   2. Trigger BEFORE UPDATE que bloqueia mudança de is_admin vinda de um papel
--      de cliente (authenticated/anon). Mudanças feitas pelo SQL Editor / service_role
--      (papéis postgres/service_role) continuam permitidas.
--
-- Não desabilita RLS: as policies de professionals seguem como estavam.
-- ============================================================

BEGIN;

-- 1) Camada de privilégio -------------------------------------------------
REVOKE UPDATE ON treino.professionals FROM authenticated;
GRANT UPDATE (name, cpf, phone, whatsapp_opt_in, uf, cidade, bairro)
  ON treino.professionals TO authenticated;

-- 2) Camada de trigger ----------------------------------------------------
CREATE OR REPLACE FUNCTION treino.bloquear_alteracao_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'is_admin não pode ser alterado pelo cliente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_bloquear_is_admin ON treino.professionals;
CREATE TRIGGER tg_bloquear_is_admin
  BEFORE UPDATE ON treino.professionals
  FOR EACH ROW EXECUTE FUNCTION treino.bloquear_alteracao_is_admin();

COMMIT;
