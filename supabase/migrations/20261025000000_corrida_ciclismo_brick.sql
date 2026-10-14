-- ============================================================
-- Migration: 20261025000000_corrida_ciclismo_brick.sql
--
-- Corrida e ciclismo estruturados + Brick (bike → corrida, para triatletas).
--
-- 'corrida' e 'ciclismo' JÁ existem no enum treino.modalidade_tipo (Fase 1); só 'brick' é novo.
-- O enum é usado por treino.planos, treino.modelos e treino.execucoes_assincrono — um ADD VALUE cobre as três.
--
-- ATENÇÃO: rode este arquivo SOZINHO no SQL Editor (sem BEGIN/COMMIT em volta). O PostgreSQL não deixa usar um
-- valor de enum recém-criado dentro da mesma transação em que ele foi adicionado.
--
-- Ajustes em relação ao rascunho do pedido:
--   * o arquivo se chama 20261025…, não 20261014…: já existe a migration 20261014000000_consentimento_saude_link.sql
--     (duas migrations com o mesmo prefixo de versão quebrariam o controle de versões);
--   * o CREATE INDEX idx_planos_modalidade foi retirado: já existe desde a migration 20261020000000.
-- ============================================================

ALTER TYPE treino.modalidade_tipo ADD VALUE IF NOT EXISTS 'ciclismo';
ALTER TYPE treino.modalidade_tipo ADD VALUE IF NOT EXISTS 'brick';
