-- ============================================================
-- Migration: 20261002000000_locais_treino.sql
--
-- Locais de treino do aluno (item 4 das "8 melhorias"): endereço
-- escolhido via Google Places autocomplete no cadastro, com link do
-- Maps. Até 5 por aluno — limite aplicado no app (visual), não aqui.
-- ============================================================

BEGIN;

CREATE TABLE treino.aluno_locais_treino (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  endereco        TEXT NOT NULL,
  maps_link       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aluno_locais_treino_aluno ON treino.aluno_locais_treino(aluno_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON treino.aluno_locais_treino TO authenticated;

ALTER TABLE treino.aluno_locais_treino ENABLE ROW LEVEL SECURITY;

CREATE POLICY aluno_locais_treino_own ON treino.aluno_locais_treino
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND aluno_id IN (SELECT a.id FROM treino.alunos a WHERE a.professional_id = (SELECT auth.uid())));

COMMIT;
