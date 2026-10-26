-- ============================================================
-- Migration: 20261059000000_lixeira_alunos.sql
--
-- Lixeira de 30 dias para alunos. Antes: o personal arquivava e depois apagava de vez (irreversível).
-- Agora: arquivado -> "Mover para a lixeira" (apagado_em preenchido) -> some de vez depois de 30 dias,
-- ou antes, se o personal escolher "Apagar agora" dentro da lixeira. Enquanto estiver na lixeira, dá para restaurar.
--
-- Modelo: o aluno na lixeira continua sendo um aluno ARQUIVADO (active = false) com `apagado_em` preenchido. O app o tira da
-- lista de Arquivados e o mostra na aba Lixeira. Os dados dele (sessões, faturas…) ficam intactos até a limpeza.
--
-- Regras no banco (valem para qualquer versão do app):
--   * `apagado_em` só pode ser preenchido em aluno já arquivado; o cliente não escolhe a data (o banco grava now());
--   * aluno na lixeira não pode ser reativado sem antes ser restaurado da lixeira;
--   * o cliente (authenticated/anon) só consegue APAGAR (DELETE) aluno que está na lixeira. Quem roda como dono do banco
--     (SQL Editor, pg_cron, cascata de FK) não é afetado.
-- A limpeza dos vencidos (30 dias) é um job do pg_cron: supabase/cron/lixeira_alunos.sql (rodar UMA vez no SQL Editor).
--
-- Reversão: DROP TRIGGER tg_controlar_lixeira_aluno ON treino.alunos; DROP FUNCTION treino.controlar_lixeira_aluno();
--           ALTER TABLE treino.alunos DROP CONSTRAINT alunos_lixeira_arquivado; ALTER TABLE treino.alunos DROP COLUMN apagado_em;
--           e recriar exigir_aluno_arquivado_para_apagar() como na migration 20261057.
-- Teste (transação desfeita no final): supabase/tests/lixeira_aluno.sql
-- ============================================================

BEGIN;

ALTER TABLE treino.alunos ADD COLUMN IF NOT EXISTS apagado_em TIMESTAMPTZ NULL;

ALTER TABLE treino.alunos DROP CONSTRAINT IF EXISTS alunos_lixeira_arquivado;
ALTER TABLE treino.alunos ADD CONSTRAINT alunos_lixeira_arquivado CHECK (apagado_em IS NULL OR active = FALSE);

CREATE INDEX IF NOT EXISTS idx_alunos_apagado_em ON treino.alunos (apagado_em) WHERE apagado_em IS NOT NULL;

CREATE OR REPLACE FUNCTION treino.controlar_lixeira_aluno()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.apagado_em := NULL;
    ELSE
      IF NEW.apagado_em IS DISTINCT FROM OLD.apagado_em AND NEW.apagado_em IS NOT NULL THEN
        IF OLD.active IS TRUE THEN
          RAISE EXCEPTION 'Arquive o aluno antes de mandar para a lixeira.' USING ERRCODE = 'P0001';
        END IF;
        NEW.apagado_em := now(); -- o cliente não escolhe a data
      END IF;
      IF NEW.apagado_em IS NOT NULL AND NEW.active IS TRUE THEN
        RAISE EXCEPTION 'Restaure o aluno da lixeira antes de reativar.' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_controlar_lixeira_aluno ON treino.alunos;
CREATE TRIGGER tg_controlar_lixeira_aluno
  BEFORE INSERT OR UPDATE ON treino.alunos
  FOR EACH ROW EXECUTE FUNCTION treino.controlar_lixeira_aluno();

-- Apagar de vez (cliente): só aluno que está na lixeira. Substitui a regra da 20261057 ("só arquivado").
CREATE OR REPLACE FUNCTION treino.exigir_aluno_arquivado_para_apagar()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF OLD.active IS TRUE THEN
      RAISE EXCEPTION 'Arquive o aluno antes de apagar.' USING ERRCODE = 'P0001';
    END IF;
    IF OLD.apagado_em IS NULL THEN
      RAISE EXCEPTION 'Mande o aluno para a lixeira antes de apagar de vez.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

COMMIT;
