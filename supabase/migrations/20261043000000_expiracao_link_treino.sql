-- ============================================================
-- Migration: 20261043000000_expiracao_link_treino.sql
--
-- Validade configurável do link de treino à distância (24h / 48h / 72h / sem prazo).
-- A coluna treino.links_treino_assincrono.expira_em já existe (NOT NULL, padrão 7 dias):
--   * passa a aceitar NULL = "sem prazo" (o app grava NULL só quando o personal escolhe isso);
--   * o padrão passa a 48 horas (o app sempre grava o valor explicitamente).
-- Links já criados mantêm o prazo que têm (não mudam retroativamente).
-- Sem mudança de RLS/GRANT: a tabela continua só service_role.
-- ============================================================

BEGIN;

ALTER TABLE treino.links_treino_assincrono ALTER COLUMN expira_em DROP NOT NULL;
ALTER TABLE treino.links_treino_assincrono ALTER COLUMN expira_em SET DEFAULT now() + interval '48 hours';

COMMIT;
