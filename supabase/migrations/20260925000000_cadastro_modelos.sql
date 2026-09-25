-- ============================================================
-- Migration: 20260925000000_cadastro_modelos.sql
--
-- 1. treino.alunos: regiões de lesão/cirurgia (multisseleção) e
--    lista de esportes praticados, substituindo os campos livres
--    por chips + "Outros" com detalhe em texto.
-- 2. treino.modelos / treino.modelo_exercicios: treinos prontos que
--    o professor pode copiar para o plano de um aluno.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ALUNOS — regiões de lesão/cirurgia e esportes
-- ============================================================

ALTER TABLE treino.alunos
  ADD COLUMN injury_regions  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN surgery         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN surgery_regions TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN surgery_notes   TEXT NULL,
  ADD COLUMN sports          TEXT[] NOT NULL DEFAULT '{}';

-- injury_notes e sport_name continuam existindo: agora são o
-- detalhe de "Outros" em vez de texto livre principal.

-- Dados existentes: quem já tinha sport_name preenchido vira
-- esporte "Outros" (sport_name guarda a descrição).
UPDATE treino.alunos
SET sports = ARRAY['Outros']
WHERE sport_name IS NOT NULL AND btrim(sport_name) <> '';

-- ============================================================
-- 2. MODELOS DE TREINO — mesma forma de treino.planos, sem aluno
-- ============================================================

CREATE TABLE treino.modelos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  notes             TEXT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE treino.modelo_exercicios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id         UUID NOT NULL REFERENCES treino.modelos(id) ON DELETE CASCADE,
  exercicio_id      UUID NOT NULL REFERENCES treino.exercicios(id),
  sets              INTEGER NOT NULL CHECK (sets > 0),
  reps              TEXT NOT NULL,
  target_load_kg    NUMERIC(6,2) NULL,
  rest_seconds      INTEGER NULL,
  notes             TEXT NULL,
  order_index       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_modelos_professional ON treino.modelos(professional_id);
CREATE INDEX idx_modelo_ex_modelo     ON treino.modelo_exercicios(modelo_id, order_index);

CREATE TRIGGER trg_modelos_updated_at
  BEFORE UPDATE ON treino.modelos
  FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();

-- ----- GRANTS -----

GRANT SELECT, INSERT, UPDATE, DELETE ON treino.modelos, treino.modelo_exercicios TO authenticated;

-- ----- RLS -----

ALTER TABLE treino.modelos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.modelo_exercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY modelos_own ON treino.modelos
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

-- Modelo_exercicios: modelo precisa ser do professor, e o exercício
-- precisa ser visível a ele (global ou próprio).
CREATE POLICY modelo_exercicios_own ON treino.modelo_exercicios
  FOR ALL TO authenticated
  USING      (modelo_id IN (SELECT m.id FROM treino.modelos m))
  WITH CHECK (modelo_id IN (SELECT m.id FROM treino.modelos m)
              AND exercicio_id IN (SELECT e.id FROM treino.exercicios e));

COMMIT;
