-- ============================================================
-- Migration: 20261028000000_grupo_reabilitacao_prep_fisica.sql
--
-- Novo grupo "Reabilitação / Prep Física" na biblioteca de exercícios de musculação (23 exercícios globais).
--
-- Por que migration: a biblioteca de musculação NÃO é um arquivo estático — são linhas de treino.exercicios
-- (professional_id NULL = global), semeadas por migration. É assim que um exercício pode entrar num treino
-- (plano_exercicios aponta para a tabela). Grupo = valor de muscle_group; não existe "id" de grupo.
--
-- A fase (I ou II) vai numa coluna própria, `fase` — dado, não texto de exibição. O nome traz o original em inglês
-- entre parênteses; detalhes ("— extensão tripla bilateral", "força máx. e ação reativa"…) ficam em `description`.
-- Idempotente: ON CONFLICT DO NOTHING (índice único do nome entre os globais).
-- ============================================================

BEGIN;

ALTER TABLE treino.exercicios
  ADD COLUMN IF NOT EXISTS fase TEXT NULL CHECK (fase IN ('I', 'II'));

INSERT INTO treino.exercicios (professional_id, name, muscle_group, fase, description) VALUES
  -- Fase I
  (NULL, 'Agachamento / Levantamento Terra (Squats/Deadlifts)', 'Reabilitação / Prep Física', 'I', NULL),
  (NULL, 'Prancha Copenhagen (Add Copenhagen)', 'Reabilitação / Prep Física', 'I', NULL),
  (NULL, 'Levantamentos Olímpicos (Olympic Lifts)', 'Reabilitação / Prep Física', 'I', 'Extensão tripla bilateral'),
  (NULL, 'Contato de Isquiotibiais (Hamstring Contact)', 'Reabilitação / Prep Física', 'I', NULL),
  (NULL, 'Isometria Sustentada (Iso Hold)', 'Reabilitação / Prep Física', 'I', 'Joelho, tornozelo e posteriores — máx.'),
  (NULL, 'Isometria de Empurrão (Iso Push)', 'Reabilitação / Prep Física', 'I', 'Joelho, tornozelo e posteriores — máx.'),
  (NULL, 'Extensão do Quadril', 'Reabilitação / Prep Física', 'I', 'Variações em curtos e grandes comprimentos'),
  (NULL, 'Saltos Bilaterais (Bilateral Jump)', 'Reabilitação / Prep Física', 'I', 'CM / NCM / DJ'),
  (NULL, 'Salto Estático (Static Jump)', 'Reabilitação / Prep Física', 'I', NULL),
  (NULL, 'Hip Thrust', 'Reabilitação / Prep Física', 'I', NULL),
  (NULL, 'Rosca Nórdica / Razor Curl / Askling (Nordic Hamstring)', 'Reabilitação / Prep Física', 'I', NULL),
  -- Fase II
  (NULL, 'Cadeira Romana Unilateral (Single Leg Roman Chair)', 'Reabilitação / Prep Física', 'II', 'Força máx. e ação reativa'),
  (NULL, 'Cadeira Romana Bilateral (Double Leg Roman Chair)', 'Reabilitação / Prep Física', 'II', 'Força máx. e ação reativa'),
  (NULL, 'Posteriores Reativos (Hamstring Reactive Action)', 'Reabilitação / Prep Física', 'II', 'Linear e rotacional'),
  (NULL, 'Good Morning Contra a Parede', 'Reabilitação / Prep Física', 'II', 'Unilateral e bilateral'),
  (NULL, 'Hack Squat', 'Reabilitação / Prep Física', 'II', NULL),
  (NULL, 'Cadeira Romana Unilateral Quadríceps (Single Leg Roman Chair Quad Variation)', 'Reabilitação / Prep Física', 'II', NULL),
  (NULL, 'Drop Jump Unilateral', 'Reabilitação / Prep Física', 'II', NULL),
  (NULL, 'Ab Max', 'Reabilitação / Prep Física', 'II', NULL),
  (NULL, 'Abdominais Reativos (Reactive Ab)', 'Reabilitação / Prep Física', 'II', NULL),
  (NULL, 'Oblíquos Máx. (Obl Ab Max)', 'Reabilitação / Prep Física', 'II', NULL),
  (NULL, 'Posteriores Reativos + Core Rotacional (Reactive Hamstring / Reactive Rotational Core)', 'Reabilitação / Prep Física', 'II', NULL),
  (NULL, 'Cadeira Romana Lateral (Lateral Roman Chair)', 'Reabilitação / Prep Física', 'II', NULL)
ON CONFLICT DO NOTHING;

COMMIT;
