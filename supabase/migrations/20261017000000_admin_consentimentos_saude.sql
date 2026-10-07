-- ============================================================
-- Migration: 20261017000000_admin_consentimentos_saude.sql
--
-- Painel admin: visão consolidada dos consentimentos LGPD de saúde POR PERSONAL.
-- Devolve só contagens agregadas (nunca nome de aluno, e-mail de aluno, datas por
-- aluno ou qualquer dado de saúde) — regra do projeto: o admin vê dados do personal
-- e números agregados, não dados de alunos. Mesmo padrão das outras funções
-- admin_*: SECURITY DEFINER, checa is_admin() antes de qualquer coisa.
-- ============================================================

CREATE OR REPLACE FUNCTION treino.admin_consentimentos_saude()
RETURNS TABLE (
  professional_id  UUID,
  nome             TEXT,
  email            TEXT,
  total_alunos     BIGINT,
  confirmados      BIGINT,
  pendentes        BIGINT,
  negados          BIGINT,
  nao_solicitados  BIGINT
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
    p.name,
    p.email,
    COUNT(a.id),
    COUNT(a.id) FILTER (WHERE a.saude_consentimento_status = 'confirmado'),
    COUNT(a.id) FILTER (WHERE a.saude_consentimento_status = 'pendente'),
    COUNT(a.id) FILTER (WHERE a.saude_consentimento_status = 'negado'),
    COUNT(a.id) FILTER (WHERE a.saude_consentimento_status IS NULL)
  FROM treino.professionals p
  LEFT JOIN treino.alunos a ON a.professional_id = p.id
  WHERE p.is_admin = false
  GROUP BY p.id, p.name, p.email, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_consentimentos_saude() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.admin_consentimentos_saude() TO authenticated;
