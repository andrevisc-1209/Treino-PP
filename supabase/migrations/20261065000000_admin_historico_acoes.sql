-- ============================================================
-- Migration: 20261065000000_admin_historico_acoes.sql
--
-- Painel admin: histórico das ações administrativas (reset de senha, trial, plano, CPF), vindo de treino.admin_logs.
-- NÃO devolve a coluna `detalhes`: ela guarda e-mail e CPF (antes/depois) e o painel não precisa mostrar isso.
-- Devolve quem fez (admin), em quem (personal), qual ação e quando; os 200 mais recentes.
-- Mesmo padrão das funções admin_*: SECURITY DEFINER, exige is_admin() (que exige MFA).
-- Reversão: DROP FUNCTION treino.admin_historico_acoes();
-- ============================================================

CREATE OR REPLACE FUNCTION treino.admin_historico_acoes()
RETURNS TABLE (
  id UUID, criado_em TIMESTAMPTZ, acao TEXT,
  admin_nome TEXT, personal_nome TEXT, personal_email TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.id, l.criado_em, l.acao, adm.name, alvo.name, alvo.email
  FROM treino.admin_logs l
  LEFT JOIN treino.professionals adm ON adm.id = l.admin_id
  LEFT JOIN treino.professionals alvo ON alvo.id = l.target_professional_id
  ORDER BY l.criado_em DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_historico_acoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_historico_acoes() TO authenticated;
