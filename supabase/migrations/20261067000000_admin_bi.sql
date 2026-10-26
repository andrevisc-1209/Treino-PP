-- ============================================================
-- Migration: 20261067000000_admin_bi.sql
--
-- Indicadores (BI) do painel /admin: números do NEGÓCIO por período, sempre comparados com o período anterior de mesmo tamanho.
-- Só AGREGADOS (regra do projeto: o admin não vê dados de alunos). Exige is_admin() (que exige MFA).
--   admin_bi(p_dias) com p_dias em 1, 15, 30, 90, 180 ou 365 (24 h, 15 dias, mês, trimestre, semestre, ano — janelas móveis até agora):
--     atual / anterior : { cadastros, novos_pagantes, pagamentos, receita, alunos_novos, treinos_montados, treinos_presencial,
--                          treinos_distancia, aulas_realizadas, faturas_geradas, personais_ativos, trials_encerrados,
--                          trials_sem_conversao, planos_vencidos, relatos }
--     serie            : um ponto por dia (America/Sao_Paulo) do período atual { dia, cadastros, alunos_novos, treinos, pagamentos, receita }
--   `receita` e `pagamentos` vêm do livro treino.pagamentos_assinatura (existe só desde a migration 20261066: períodos anteriores a ela
--   aparecem zerados, e o painel avisa). "Personais ativos" = personais com alguma atividade no período (treino realizado, aula
--   realizada, aluno ou treino novo).
-- Reversão: DROP FUNCTION treino.admin_bi(INT); DROP FUNCTION treino.admin_bi_janela(TIMESTAMPTZ, TIMESTAMPTZ);
-- Teste: supabase/tests/admin_bi.sql
-- ============================================================

BEGIN;

-- Métricas de uma janela [p_ini, p_fim). Interna: só o dono do banco e admin_bi() a chamam.
CREATE OR REPLACE FUNCTION treino.admin_bi_janela(p_ini TIMESTAMPTZ, p_fim TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH pers AS (SELECT id FROM treino.professionals WHERE is_admin = FALSE),
  dia_ini AS (SELECT (p_ini AT TIME ZONE 'America/Sao_Paulo')::date AS d),
  dia_fim AS (SELECT (p_fim AT TIME ZONE 'America/Sao_Paulo')::date AS d),
  sess AS (
    SELECT s.professional_id FROM treino.sessoes s, dia_ini i, dia_fim f
    WHERE s.status = 'concluida' AND s.session_date >= i.d AND s.session_date < f.d
  ),
  exec AS (
    SELECT e.professional_id, e.origem FROM treino.execucoes_assincrono e
    WHERE e.status = 'concluido' AND e.concluido_em >= p_ini AND e.concluido_em < p_fim
  ),
  aulas_r AS (
    SELECT a.professional_id FROM treino.aulas a WHERE a.status = 'realizada' AND a.starts_at >= p_ini AND a.starts_at < p_fim
  ),
  alunos_n AS (SELECT professional_id FROM treino.alunos WHERE created_at >= p_ini AND created_at < p_fim),
  planos_n AS (SELECT professional_id, tipo_execucao FROM treino.planos WHERE created_at >= p_ini AND created_at < p_fim),
  primeiro_pag AS (
    SELECT professional_id, MIN(pago_em) AS primeiro FROM treino.pagamentos_assinatura GROUP BY professional_id
  ),
  ass AS (
    SELECT a.*, (a.mp_payment_id IS NOT NULL OR EXISTS (SELECT 1 FROM treino.pagamentos_assinatura g WHERE g.professional_id = a.professional_id)) AS ja_pagou
    FROM treino.assinaturas a JOIN pers ON pers.id = a.professional_id
  )
  SELECT jsonb_build_object(
    'cadastros', (SELECT COUNT(*) FROM treino.professionals WHERE is_admin = FALSE AND created_at >= p_ini AND created_at < p_fim),
    'novos_pagantes', (SELECT COUNT(*) FROM primeiro_pag pp JOIN pers ON pers.id = pp.professional_id WHERE pp.primeiro >= p_ini AND pp.primeiro < p_fim),
    'pagamentos', (SELECT COUNT(*) FROM treino.pagamentos_assinatura WHERE pago_em >= p_ini AND pago_em < p_fim),
    'receita', (SELECT COALESCE(SUM(valor), 0) FROM treino.pagamentos_assinatura WHERE pago_em >= p_ini AND pago_em < p_fim),
    'alunos_novos', (SELECT COUNT(*) FROM alunos_n),
    'treinos_montados', (SELECT COUNT(*) FROM planos_n),
    'treinos_presencial', (SELECT COUNT(*) FROM sess) + (SELECT COUNT(*) FROM exec WHERE origem = 'presencial'),
    'treinos_distancia', (SELECT COUNT(*) FROM exec WHERE origem = 'link'),
    'aulas_realizadas', (SELECT COUNT(*) FROM aulas_r),
    'faturas_geradas', (SELECT COUNT(*) FROM treino.faturas WHERE created_at >= p_ini AND created_at < p_fim),
    'personais_ativos', (
      SELECT COUNT(DISTINCT x.professional_id) FROM (
        SELECT professional_id FROM sess UNION ALL SELECT professional_id FROM exec UNION ALL SELECT professional_id FROM aulas_r
        UNION ALL SELECT professional_id FROM alunos_n UNION ALL SELECT professional_id FROM planos_n
      ) x JOIN pers ON pers.id = x.professional_id
    ),
    'trials_encerrados', (SELECT COUNT(*) FROM ass WHERE trial_fim >= p_ini AND trial_fim < p_fim),
    'trials_sem_conversao', (SELECT COUNT(*) FROM ass WHERE trial_fim >= p_ini AND trial_fim < p_fim AND NOT ja_pagou),
    'planos_vencidos', (SELECT COUNT(*) FROM ass WHERE assinatura_fim >= p_ini AND assinatura_fim < LEAST(p_fim, now())),
    'relatos', (SELECT COUNT(*) FROM treino.relatos WHERE criado_em >= p_ini AND criado_em < p_fim)
  );
$$;

REVOKE ALL ON FUNCTION treino.admin_bi_janela(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION treino.admin_bi(p_dias INT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fim TIMESTAMPTZ := now();
  v_ini TIMESTAMPTZ;
  v_ini_ant TIMESTAMPTZ;
  v_serie JSONB;
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  IF p_dias NOT IN (1, 15, 30, 90, 180, 365) THEN
    RAISE EXCEPTION 'Período inválido.' USING ERRCODE = '22023';
  END IF;

  v_ini := v_fim - make_interval(days => p_dias);
  v_ini_ant := v_ini - make_interval(days => p_dias);

  WITH dias AS (
    SELECT d::date AS dia FROM generate_series((v_ini AT TIME ZONE 'America/Sao_Paulo')::date, (v_fim AT TIME ZONE 'America/Sao_Paulo')::date, interval '1 day') d
  ),
  cad AS (SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS dia, COUNT(*) AS n FROM treino.professionals WHERE is_admin = FALSE AND created_at >= v_ini GROUP BY 1),
  alu AS (SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS dia, COUNT(*) AS n FROM treino.alunos WHERE created_at >= v_ini GROUP BY 1),
  trs AS (
    SELECT dia, COUNT(*) AS n FROM (
      SELECT s.session_date AS dia FROM treino.sessoes s WHERE s.status = 'concluida' AND s.session_date >= (v_ini AT TIME ZONE 'America/Sao_Paulo')::date
      UNION ALL
      SELECT (e.concluido_em AT TIME ZONE 'America/Sao_Paulo')::date FROM treino.execucoes_assincrono e WHERE e.status = 'concluido' AND e.concluido_em >= v_ini
    ) t GROUP BY dia
  ),
  pag AS (SELECT (pago_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia, COUNT(*) AS n, SUM(valor) AS v FROM treino.pagamentos_assinatura WHERE pago_em >= v_ini GROUP BY 1)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'dia', dias.dia,
    'cadastros', COALESCE(cad.n, 0),
    'alunos_novos', COALESCE(alu.n, 0),
    'treinos', COALESCE(trs.n, 0),
    'pagamentos', COALESCE(pag.n, 0),
    'receita', COALESCE(pag.v, 0)
  ) ORDER BY dias.dia), '[]'::jsonb) INTO v_serie
  FROM dias
  LEFT JOIN cad ON cad.dia = dias.dia
  LEFT JOIN alu ON alu.dia = dias.dia
  LEFT JOIN trs ON trs.dia = dias.dia
  LEFT JOIN pag ON pag.dia = dias.dia;

  RETURN jsonb_build_object(
    'dias', p_dias,
    'inicio', v_ini,
    'fim', v_fim,
    'atual', treino.admin_bi_janela(v_ini, v_fim),
    'anterior', treino.admin_bi_janela(v_ini_ant, v_ini),
    'serie', v_serie
  );
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_bi(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_bi(INT) TO authenticated;

COMMIT;
