-- ============================================================
-- Migration: 20261061000000_lixeira_esconde_aluno.sql
--
-- Continuação da lixeira de alunos (20261059): o aluno na lixeira some das demais telas.
--   1. Ao MANDAR para a lixeira (apagado_em: NULL -> preenchido), o banco tira o aluno da agenda:
--        * remove dele as aulas futuras ainda não realizadas (as aulas que ficarem sem ninguém saem da agenda);
--        * remove o vínculo com horários fixos (e desativa o horário que ficar sem alunos);
--        * desativa a cobrança dele (aluno_cobranca.ativo = false), para não gerar aviso de ciclo.
--      Isso NÃO volta ao restaurar (o aluno volta como ARQUIVADO; ao reativar, cadastre de novo horário e cobrança).
--   2. Policies RESTRICTIVE de leitura: enquanto o aluno está na lixeira, o app não enxerga as linhas dele em faturas, cobrança,
--      participações em aulas, notificações, execuções à distância e sessões (Financeiro, Agenda, Hoje, métricas e feed deixam de
--      incluí-lo). Os dados continuam no banco até a limpeza dos 30 dias. Edge Functions (service_role) não passam por RLS: a de
--      avisos financeiros filtra por conta própria (deploy junto).
--   3. RPC resumo_apagar_aluno(): a confirmação de "Apagar agora" precisa contar o que será perdido, e a leitura direta passa a
--      mostrar zero para aluno na lixeira (policy do item 2). A função (SECURITY DEFINER, só do próprio personal) conta de verdade.
-- Reversão: DROP POLICY lixeira_esconde ON <tabela> (nas 6 tabelas); DROP TRIGGER tg_aluno_lixeira_limpa_agenda ON treino.alunos;
--           DROP FUNCTION treino.aluno_lixeira_limpa_agenda(); DROP FUNCTION treino.resumo_apagar_aluno(UUID);
-- Teste (transação desfeita no final): supabase/tests/lixeira_esconde_aluno.sql
-- ============================================================

BEGIN;

-- ----- 1. Limpeza da agenda ao mandar para a lixeira -----
CREATE OR REPLACE FUNCTION treino.aluno_lixeira_limpa_agenda()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_aulas UUID[];
  v_horarios UUID[];
BEGIN
  -- aulas futuras, agendadas, em que ele está previsto e que ainda não foram cobradas
  SELECT COALESCE(array_agg(DISTINCT ap.aula_id), ARRAY[]::UUID[]) INTO v_aulas
  FROM treino.aula_participantes ap
  JOIN treino.aulas au ON au.id = ap.aula_id
  WHERE ap.aluno_id = NEW.id AND ap.status = 'previsto' AND ap.fatura_id IS NULL
    AND au.status = 'agendada' AND au.starts_at > now();

  DELETE FROM treino.aula_participantes
  WHERE aluno_id = NEW.id AND aula_id = ANY (v_aulas) AND status = 'previsto' AND fatura_id IS NULL;

  -- aulas que ficaram sem ninguém saem da agenda
  DELETE FROM treino.aulas au
  WHERE au.id = ANY (v_aulas) AND NOT EXISTS (SELECT 1 FROM treino.aula_participantes p WHERE p.aula_id = au.id);

  -- horários fixos: tira o vínculo; o que ficar vazio é desativado
  SELECT COALESCE(array_agg(horario_id), ARRAY[]::UUID[]) INTO v_horarios FROM treino.horario_alunos WHERE aluno_id = NEW.id;
  DELETE FROM treino.horario_alunos WHERE aluno_id = NEW.id;
  UPDATE treino.horarios_fixos h SET active = FALSE
  WHERE h.id = ANY (v_horarios) AND NOT EXISTS (SELECT 1 FROM treino.horario_alunos ha WHERE ha.horario_id = h.id);

  UPDATE treino.aluno_cobranca SET ativo = FALSE WHERE aluno_id = NEW.id AND ativo;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tg_aluno_lixeira_limpa_agenda ON treino.alunos;
CREATE TRIGGER tg_aluno_lixeira_limpa_agenda
  AFTER UPDATE OF apagado_em ON treino.alunos
  FOR EACH ROW
  WHEN (OLD.apagado_em IS NULL AND NEW.apagado_em IS NOT NULL)
  EXECUTE FUNCTION treino.aluno_lixeira_limpa_agenda();

-- ----- 2. Esconde as linhas do aluno na lixeira (leitura pelo app) -----
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['faturas', 'aluno_cobranca', 'aula_participantes', 'notificacoes_professor', 'execucoes_assincrono', 'sessoes']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS lixeira_esconde ON treino.%I', t);
    EXECUTE format(
      'CREATE POLICY lixeira_esconde ON treino.%I AS RESTRICTIVE FOR SELECT TO authenticated '
      || 'USING (NOT EXISTS (SELECT 1 FROM treino.alunos a WHERE a.id = %I.aluno_id AND a.apagado_em IS NOT NULL))',
      t, t);
  END LOOP;
END $$;

-- ----- 3. Contagem para a confirmação de "Apagar agora" -----
CREATE OR REPLACE FUNCTION treino.resumo_apagar_aluno(p_aluno_id UUID)
RETURNS TABLE (sessoes BIGINT, treinos BIGINT, avaliacoes BIGINT, faturas BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT count(*) FROM treino.sessoes s WHERE s.aluno_id = a.id),
    (SELECT count(*) FROM treino.planos p WHERE p.aluno_id = a.id),
    (SELECT count(*) FROM treino.pesos w WHERE w.aluno_id = a.id),
    (SELECT count(*) FROM treino.faturas f WHERE f.aluno_id = a.id)
  FROM treino.alunos a
  WHERE a.id = p_aluno_id AND a.professional_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION treino.resumo_apagar_aluno(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.resumo_apagar_aluno(UUID) TO authenticated;

COMMIT;
