-- ============================================================
-- Migration: 20261013000000_assinaturas_mp_payment_id.sql
--
-- Checkout Pro (Pix/cartão/boleto avulso): guarda o id do último pagamento
-- aprovado que ativou/renovou a assinatura. Serve de trava de idempotência
-- do webhook (o mesmo payment_id reenviado não soma o período duas vezes) e
-- para saber qual pagamento cancelar em caso de estorno.
--
-- Só a coluna: RLS/grants da tabela não mudam (o personal só lê o próprio
-- status; a escrita é feita pela Edge Function com service_role).
-- ============================================================

ALTER TABLE treino.assinaturas ADD COLUMN IF NOT EXISTS mp_payment_id text;
