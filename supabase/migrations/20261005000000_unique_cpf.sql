-- ============================================================
-- Migration: 20261005000000_unique_cpf.sql
--
-- Unicidade de CPF entre os personais. O rascunho original pedia isso
-- em "treino.perfis" — essa tabela não existe neste projeto; o campo
-- cpf mora em treino.professionals (migration 20261001000000).
-- ============================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_cpf
ON treino.professionals(cpf)
WHERE cpf IS NOT NULL;

COMMIT;
