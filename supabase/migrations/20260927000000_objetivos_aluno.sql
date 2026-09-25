-- ============================================================
-- Migration: 20260927000000_objetivos_aluno.sql
--
-- Objetivos do aluno (multisseleção) + detalhe livre para "Outros".
-- ============================================================

BEGIN;

ALTER TABLE treino.alunos
  ADD COLUMN objetivos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN objetivo_notes TEXT NULL;

COMMIT;
