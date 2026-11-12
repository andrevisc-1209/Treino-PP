-- ============================================================
-- Taxa de registro de aulas (auditoria de UX de 11/11/2026, PR 8)
--
-- treino.admin_taxa_registro() : para o ADMIN (SECURITY DEFINER, exige is_admin() com MFA). Mede se o personal
--   dá baixa nas aulas que já passaram: aulas realizadas ÷ (realizadas + ainda "agendadas" depois de passadas).
--   Só TOTAIS. Nenhum nome de personal, de aluno, local ou horário sai desta função, nem uma linha por personal.
--   Janela: aulas dos últimos 30 dias que terminaram há pelo menos 12 horas (dá tempo de registrar no mesmo dia).
--   Aulas canceladas não entram. Contas de admin não entram.
-- Sem tabela nova, sem coluna nova, sem dado novo coletado: usa o que a Agenda já guarda.
-- Reversão: DROP FUNCTION treino.admin_taxa_registro();
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.admin_taxa_registro()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH por_personal AS (
      SELECT a.professional_id,
             count(*) AS passadas,
             count(*) FILTER (WHERE a.status = 'realizada') AS registradas
      FROM treino.aulas a
      JOIN treino.professionals pr ON pr.id = a.professional_id
      WHERE pr.is_admin = FALSE
        AND a.status <> 'cancelada'
        AND a.starts_at >= now() - interval '30 days'
        AND a.starts_at + make_interval(mins => a.duration_min) <= now() - interval '12 hours'
      GROUP BY a.professional_id
    )
    SELECT jsonb_build_object(
      'aulas_passadas_30d',     COALESCE(sum(passadas), 0),
      'aulas_registradas_30d',  COALESCE(sum(registradas), 0),
      'personais_com_aulas_30d', count(*),
      'personais_registrando',  count(*) FILTER (WHERE registradas::numeric / passadas >= 0.8)
    )
    FROM por_personal
  );
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_taxa_registro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_taxa_registro() TO authenticated;

COMMIT;
