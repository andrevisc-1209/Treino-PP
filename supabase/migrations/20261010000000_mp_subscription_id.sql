-- ============================================================
-- Migration: 20261010000000_mp_subscription_id.sql
--
-- Integração Mercado Pago Assinaturas: guarda o id do preapproval do MP na
-- assinatura do personal. Quem escreve é a Edge Function mp-webhook (service
-- role); o authenticated continua só com SELECT (ver 20261004000000).
-- ============================================================

BEGIN;

ALTER TABLE treino.assinaturas ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_mp_subscription_id_key
  ON treino.assinaturas (mp_subscription_id)
  WHERE mp_subscription_id IS NOT NULL;

COMMIT;
