-- ============================================================
-- Migration: 20261057000000_apagar_aluno_exige_arquivado.sql
--
-- "Arquivar antes de apagar": o personal só consegue APAGAR um aluno que já esteja ARQUIVADO (active = false).
-- O app já esconde o botão de apagar do aluno ativo; esta trava vale para qualquer caminho do cliente (inclusive uma versão
-- antiga do app ainda instalada no celular) e protege a promessa de "todo o histórico do aluno": apagar é irreversível e
-- leva junto, em cascata, sessões, séries, treinos, avaliações e faturas.
--
-- Só as roles de cliente (`authenticated`, `anon`) são barradas. Não afeta:
--   * o SQL Editor / service_role (suporte e manutenção);
--   * a exclusão em cascata ao apagar um personal (a ação de FK roda como dono da tabela, não como `authenticated`).
-- Reversão: DROP TRIGGER tg_exigir_aluno_arquivado ON treino.alunos; DROP FUNCTION treino.exigir_aluno_arquivado_para_apagar();
-- Teste (transação desfeita no final): supabase/tests/apagar_aluno_exige_arquivado.sql
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.exigir_aluno_arquivado_para_apagar()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND OLD.active IS TRUE THEN
    RAISE EXCEPTION 'Arquive o aluno antes de apagar.' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tg_exigir_aluno_arquivado ON treino.alunos;
CREATE TRIGGER tg_exigir_aluno_arquivado
  BEFORE DELETE ON treino.alunos
  FOR EACH ROW EXECUTE FUNCTION treino.exigir_aluno_arquivado_para_apagar();

COMMIT;
