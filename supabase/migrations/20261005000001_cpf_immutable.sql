-- ============================================================
-- Migration: 20261005000001_cpf_immutable.sql
--
-- Impede alteração de CPF depois de definido — defesa em profundidade
-- além do frontend (campo disabled em Configurações): mesmo um UPDATE
-- direto pela REST API é bloqueado no banco. Permite gravar o CPF pela
-- primeira vez (NULL → valor), só bloqueia valor → valor diferente.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.bloquear_alteracao_cpf()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.cpf IS NOT NULL AND NEW.cpf IS DISTINCT FROM OLD.cpf THEN
    RAISE EXCEPTION 'CPF não pode ser alterado após o cadastro';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_bloquear_cpf ON treino.professionals;
CREATE TRIGGER tg_bloquear_cpf
  BEFORE UPDATE ON treino.professionals
  FOR EACH ROW EXECUTE FUNCTION treino.bloquear_alteracao_cpf();

COMMIT;
