-- ============================================================
-- Migration: 20261051000000_saude_exige_consentimento.sql
--
-- Auditoria de segurança (3ª revisão, item "dado de saúde aceito pelo banco sem consentimento"): a trava dos campos clínicos
-- era só do front (ConsentimentoSaudeBloco / AlunoFormPage). Pela API, o personal gravava lesão, cirurgia, medicamentos,
-- altura e peso de um aluno sem consentimento ativo — contra o espírito do Art. 11 da LGPD (dado sensível).
--
-- "Ter consentimento" = existir linha ATIVA (revoked_at nulo) em treino.consentimentos do próprio personal para o aluno
-- (method 'app' ou 'link'), exatamente o que a tela usa para liberar os campos.
--
-- Regra por coluna (só roles de cliente; service_role/SQL Editor passam): é recusado ESCREVER um valor clínico NÃO VAZIO e
-- DIFERENTE do atual sem consentimento ativo. Gravar o mesmo valor ou ESVAZIAR passa livre (a revogação do consentimento limpa os
-- campos, e alunos antigos com dado e sem consentimento continuam editáveis nos outros campos).
-- Campos clínicos: injury, injury_regions, injury_notes, surgery, surgery_regions, surgery_notes, medications, height_cm.
-- Peso: nova medida em treino.pesos exige consentimento ativo (as já registradas continuam legíveis; a tela informa isso).
-- Fora da trava (decisão: só dados clínicos): esporte praticado, objetivos e a pré-avaliação do treino.
-- ============================================================

BEGIN;

-- Existe consentimento ativo do PRÓPRIO personal para o aluno? (filtra por auth.uid(): chamar com id de aluno alheio nunca revela nada)
CREATE OR REPLACE FUNCTION treino.aluno_tem_consentimento(p_aluno_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM treino.consentimentos c
    WHERE c.aluno_id = p_aluno_id AND c.revoked_at IS NULL AND c.professional_id = (SELECT auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION treino.aluno_tem_consentimento(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.aluno_tem_consentimento(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION treino.exigir_consentimento_saude()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_precisa BOOLEAN;
BEGIN
  -- Só trava as roles de cliente; service_role (Edge Functions) e o SQL Editor passam.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_precisa :=
      NEW.injury OR cardinality(NEW.injury_regions) > 0 OR NEW.injury_notes IS NOT NULL
      OR NEW.surgery OR cardinality(NEW.surgery_regions) > 0 OR NEW.surgery_notes IS NOT NULL
      OR NEW.medications IS NOT NULL OR NEW.height_cm IS NOT NULL;
  ELSE
    v_precisa :=
      (NEW.injury AND NEW.injury IS DISTINCT FROM OLD.injury)
      OR (cardinality(NEW.injury_regions) > 0 AND NEW.injury_regions IS DISTINCT FROM OLD.injury_regions)
      OR (NEW.injury_notes IS NOT NULL AND NEW.injury_notes IS DISTINCT FROM OLD.injury_notes)
      OR (NEW.surgery AND NEW.surgery IS DISTINCT FROM OLD.surgery)
      OR (cardinality(NEW.surgery_regions) > 0 AND NEW.surgery_regions IS DISTINCT FROM OLD.surgery_regions)
      OR (NEW.surgery_notes IS NOT NULL AND NEW.surgery_notes IS DISTINCT FROM OLD.surgery_notes)
      OR (NEW.medications IS NOT NULL AND NEW.medications IS DISTINCT FROM OLD.medications)
      OR (NEW.height_cm IS NOT NULL AND NEW.height_cm IS DISTINCT FROM OLD.height_cm);
  END IF;

  IF v_precisa AND NOT treino.aluno_tem_consentimento(NEW.id) THEN
    RAISE EXCEPTION 'O aluno ainda não autorizou o registro de dados de saúde.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_exigir_consentimento_saude ON treino.alunos;
CREATE TRIGGER tg_exigir_consentimento_saude
  BEFORE INSERT OR UPDATE ON treino.alunos
  FOR EACH ROW EXECUTE FUNCTION treino.exigir_consentimento_saude();

-- Peso: nova medida só com consentimento ativo (a policy anterior só checava que o aluno é do personal).
DROP POLICY IF EXISTS pesos_own ON treino.pesos;
CREATE POLICY pesos_own ON treino.pesos
  FOR ALL TO authenticated
  USING (aluno_id IN (SELECT a.id FROM treino.alunos a))
  WITH CHECK (
    aluno_id IN (SELECT a.id FROM treino.alunos a)
    AND treino.aluno_tem_consentimento(aluno_id)
  );

COMMIT;
