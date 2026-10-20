-- ============================================================
-- Migration: 20261047000000_pagamentos_processados.sql
--
-- Auditoria de segurança (2ª revisão como invasor): a idempotência do webhook do Mercado Pago só comparava o payment_id
-- com o ÚLTIMO gravado em assinaturas.mp_payment_id. Se o MP reentregasse o pagamento A depois de o B ter sido processado,
-- A somava outro período (e o mp_payment_id voltava para A). Agora cada pagamento é "reivindicado" nesta tabela
-- (INSERT ... ON CONFLICT DO NOTHING) ANTES de creditar: só quem inseriu credita.
--
-- Tabela INTERNA, só service_role (a Edge Function mp-webhook). RLS ligada, sem policy e sem grant ao cliente.
-- Semeia com os mp_payment_id vigentes em assinaturas (pagamentos antigos já sobrescritos não têm como ser recuperados).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS treino.pagamentos_processados (
  payment_id   TEXT PRIMARY KEY CHECK (char_length(payment_id) BETWEEN 1 AND 64),
  processado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE treino.pagamentos_processados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.pagamentos_processados FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON treino.pagamentos_processados TO service_role;

INSERT INTO treino.pagamentos_processados (payment_id)
SELECT DISTINCT mp_payment_id FROM treino.assinaturas WHERE mp_payment_id IS NOT NULL AND char_length(mp_payment_id) BETWEEN 1 AND 64
ON CONFLICT (payment_id) DO NOTHING;

COMMIT;
