-- ============================================================
-- Migration: 20260928000000_plano_origem.sql
--
-- Rastreia de qual treino planejado (modelo) um plano do aluno foi
-- copiado, para permitir detectar/atualizar cópias desatualizadas em
-- vez de comparar por nome (frágil: nomes duplicados, renomeações).
-- ============================================================

BEGIN;

ALTER TABLE treino.planos
  ADD COLUMN modelo_origem_id UUID NULL REFERENCES treino.modelos(id) ON DELETE SET NULL;

CREATE INDEX idx_planos_modelo_origem ON treino.planos(modelo_origem_id) WHERE modelo_origem_id IS NOT NULL;

-- Backfill best-effort: planos sem origem cujo nome bate com um modelo do
-- mesmo professional viram associados a esse modelo (heurística mesma do
-- comportamento anterior, só para não perder o vínculo dos já existentes).
UPDATE treino.planos p
SET modelo_origem_id = m.id
FROM treino.modelos m
WHERE p.modelo_origem_id IS NULL
  AND m.professional_id = p.professional_id
  AND m.name = p.name;

COMMIT;
