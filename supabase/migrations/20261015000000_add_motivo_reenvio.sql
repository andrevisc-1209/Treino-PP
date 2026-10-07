-- ============================================================
-- Migration: 20261015000000_add_motivo_reenvio.sql
--
-- Reenvio da solicitação de consentimento de saúde exige um motivo, gravado junto
-- do novo token (trilha de auditoria: por que o personal pediu de novo, inclusive
-- depois de uma negativa). "Outros" guarda o texto livre em motivo_reenvio_livre.
-- Só a coluna: RLS/grants da tabela não mudam (continua sem acesso de anon/authenticated).
-- ============================================================

ALTER TABLE treino.consentimento_saude_tokens
  ADD COLUMN IF NOT EXISTS motivo_reenvio text,
  ADD COLUMN IF NOT EXISTS motivo_reenvio_livre text;
