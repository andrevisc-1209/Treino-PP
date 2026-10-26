-- ============================================================
-- Migration: 20261064000000_admin_personais_metricas.sql
--
-- Painel admin: quantidades de treinos por personal, só NÚMEROS AGREGADOS (regra do projeto: o admin não vê dados de alunos).
--   treinos_presencial / treinos_distancia : treinos montados (planos) por tipo de execução ('sincrono' = presencial,
--                                            'assincrono' = à distância); não conta os treinos planejados (modelos);
--   exec_presencial / exec_distancia       : treinos realizados. Presencial = sessões concluídas + execuções concluídas de
--                                            origem 'presencial'; à distância = execuções concluídas de origem 'link';
--   exec_30d                               : realizados (presencial + à distância) nos últimos 30 dias.
-- Mesmo padrão das outras funções admin_*: SECURITY DEFINER, checa is_admin() (que exige MFA) antes de tudo.
-- Reversão: DROP FUNCTION treino.admin_personais_metricas();
-- ============================================================

CREATE OR REPLACE FUNCTION treino.admin_personais_metricas()
RETURNS TABLE (
  professional_id    UUID,
  treinos_presencial BIGINT,
  treinos_distancia  BIGINT,
  exec_presencial    BIGINT,
  exec_distancia     BIGINT,
  exec_30d           BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    (SELECT COUNT(*) FROM treino.planos pl WHERE pl.professional_id = p.id AND pl.tipo_execucao = 'sincrono'),
    (SELECT COUNT(*) FROM treino.planos pl WHERE pl.professional_id = p.id AND pl.tipo_execucao = 'assincrono'),
    (SELECT COUNT(*) FROM treino.sessoes s WHERE s.professional_id = p.id AND s.status = 'concluida')
      + (SELECT COUNT(*) FROM treino.execucoes_assincrono e WHERE e.professional_id = p.id AND e.status = 'concluido' AND e.origem = 'presencial'),
    (SELECT COUNT(*) FROM treino.execucoes_assincrono e WHERE e.professional_id = p.id AND e.status = 'concluido' AND e.origem = 'link'),
    (SELECT COUNT(*) FROM treino.sessoes s WHERE s.professional_id = p.id AND s.status = 'concluida' AND s.session_date >= current_date - 30)
      + (SELECT COUNT(*) FROM treino.execucoes_assincrono e WHERE e.professional_id = p.id AND e.status = 'concluido' AND e.concluido_em >= now() - interval '30 days')
  FROM treino.professionals p
  WHERE p.is_admin = FALSE;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_personais_metricas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_personais_metricas() TO authenticated;
