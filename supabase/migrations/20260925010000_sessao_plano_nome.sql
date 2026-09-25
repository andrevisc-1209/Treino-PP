-- ============================================================
-- Migration: 20260925010000_sessao_plano_nome.sql
--
-- Guarda um snapshot do nome do plano na sessão, para o histórico
-- distinguir "treino livre" (plano_nome nulo, nunca teve plano) de
-- "plano excluído" (plano_nome preenchido, plano_id nulo porque o
-- plano foi apagado depois).
-- ============================================================

BEGIN;

ALTER TABLE treino.sessoes ADD COLUMN plano_nome TEXT NULL;

-- Backfill: sessões já registradas que apontam para um plano ainda
-- existente ganham o snapshot do nome atual.
UPDATE treino.sessoes s
SET plano_nome = p.name
FROM treino.planos p
WHERE s.plano_id = p.id AND s.plano_nome IS NULL;

COMMIT;
