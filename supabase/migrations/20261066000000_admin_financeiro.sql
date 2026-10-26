-- ============================================================
-- Migration: 20261066000000_admin_financeiro.sql
--
-- Painel financeiro do negócio (/admin → Financeiro).
--   1. treino.pagamentos_assinatura: livro dos pagamentos de assinatura aprovados (valor, plano, data), preenchido pela Edge Function
--      mp-webhook A PARTIR DE AGORA (antes disso só existia o id do pagamento, sem valor nem data: a receita passada não dá para recuperar).
--      Tabela interna: só service_role (webhook); o cliente não lê nem escreve. Estorno apaga a linha (a Edge Function faz).
--   2. treino.admin_financeiro(): uma linha com os números do painel. Só agregados; exige is_admin() (que exige MFA).
--        assinantes_ativos / mrr_estimado : assinaturas 'ativa' ainda dentro do prazo; MRR = ativos × valor mensal equivalente
--                                           (mensal R$15, trimestral R$39/3, semestral R$60/6). É ESTIMATIVA, não caixa.
--        receita_mes / receita_total      : soma REAL do livro (mês em America/Sao_Paulo). `livro_desde` = data do 1º registro.
--        trials_encerrados / ja_pagaram   : conversão = já pagaram ÷ trials encerrados (calculada no app).
--        nao_renovaram                    : plano pago que venceu e não foi renovado (o pagamento é avulso, sem renovação automática).
-- Os preços aqui espelham supabase/functions/_shared/mp.ts (PLANOS): se mudarem lá, mude aqui (e o teste de paridade cobra).
-- Reversão: DROP FUNCTION treino.admin_financeiro(); DROP TABLE treino.pagamentos_assinatura;
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS treino.pagamentos_assinatura (
  payment_id       TEXT PRIMARY KEY CHECK (char_length(payment_id) BETWEEN 1 AND 64),
  professional_id  UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  plano            TEXT NOT NULL CHECK (plano IN ('mensal', 'trimestral', 'semestral')),
  valor            NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  pago_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_assinatura_pago_em ON treino.pagamentos_assinatura (pago_em);

ALTER TABLE treino.pagamentos_assinatura ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.pagamentos_assinatura FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON treino.pagamentos_assinatura TO service_role;

CREATE OR REPLACE FUNCTION treino.admin_financeiro()
RETURNS TABLE (
  assinantes_ativos  BIGINT,
  mrr_estimado       NUMERIC,
  receita_mes        NUMERIC,
  pagamentos_mes     BIGINT,
  receita_total      NUMERIC,
  pagamentos_total   BIGINT,
  livro_desde        TIMESTAMPTZ,
  trials_ativos      BIGINT,
  trials_encerrados  BIGINT,
  ja_pagaram         BIGINT,
  nao_renovaram      BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inicio_mes TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      a.professional_id, a.status, a.plano, a.trial_fim, a.assinatura_fim,
      (a.mp_payment_id IS NOT NULL OR EXISTS (SELECT 1 FROM treino.pagamentos_assinatura g WHERE g.professional_id = a.professional_id)) AS ja_pagou
    FROM treino.assinaturas a
    JOIN treino.professionals p ON p.id = a.professional_id AND p.is_admin = FALSE
  ),
  ativos AS (
    SELECT * FROM base WHERE status = 'ativa' AND (assinatura_fim IS NULL OR assinatura_fim > now())
  )
  SELECT
    (SELECT COUNT(*) FROM ativos),
    (SELECT COALESCE(SUM(CASE plano WHEN 'mensal' THEN 15 WHEN 'trimestral' THEN 39.0 / 3 WHEN 'semestral' THEN 60.0 / 6 ELSE 0 END), 0) FROM ativos)::NUMERIC(10,2),
    (SELECT COALESCE(SUM(valor), 0) FROM treino.pagamentos_assinatura WHERE pago_em >= v_inicio_mes),
    (SELECT COUNT(*) FROM treino.pagamentos_assinatura WHERE pago_em >= v_inicio_mes),
    (SELECT COALESCE(SUM(valor), 0) FROM treino.pagamentos_assinatura),
    (SELECT COUNT(*) FROM treino.pagamentos_assinatura),
    (SELECT MIN(pago_em) FROM treino.pagamentos_assinatura),
    (SELECT COUNT(*) FROM base WHERE status = 'trial' AND trial_fim > now()),
    (SELECT COUNT(*) FROM base WHERE status <> 'trial' OR trial_fim <= now()),
    (SELECT COUNT(*) FROM base WHERE ja_pagou),
    (SELECT COUNT(*) FROM base WHERE ja_pagou AND status = 'expirada');
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_financeiro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_financeiro() TO authenticated;

COMMIT;
