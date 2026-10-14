-- ============================================================
-- Migration: 20261030000000_templates_musculacao.sql
--
-- Modelos prontos de musculação em treino.templates_treino (criada em 20261029…).
-- Cada exercício é resolvido pelo nome na biblioteca global (treino.exercicios,
-- professional_id IS NULL), então o JSON guarda o exercicio_id real. Exercício que
-- não existir na biblioteca é simplesmente omitido do modelo (JOIN interno).
--
-- modalidade_detalhes = { "exercicios": [ { exercicio_id, nome, sets, reps, rest_seconds } ] }
-- Idempotente: ON CONFLICT (slug) DO NOTHING.
-- ============================================================

BEGIN;

WITH modelos (slug, nome, descricao, ordem) AS (
  VALUES
    ('musculacao-full-body-iniciante', 'Full Body Iniciante', 'Corpo inteiro em uma sessão: pernas, peito, costas, ombros e braços.', 10),
    ('musculacao-hiit-abdomen', 'HIIT + Abdômen', 'Circuito de 5 exercícios de alta intensidade seguido de 3 de core.', 20),
    ('musculacao-a-pernas', 'Treino A – Pernas', 'Foco em quadríceps e posteriores, com panturrilha.', 30),
    ('musculacao-b-peito-triceps', 'Treino B – Peito e Tríceps', 'Peito em três ângulos e dois exercícios de tríceps.', 40),
    ('musculacao-c-costas-biceps', 'Treino C – Costas e Bíceps', 'Puxadas e remadas, com rosca para bíceps.', 50)
),
itens (slug, ord, exercicio, sets, reps, descanso) AS (
  VALUES
    ('musculacao-full-body-iniciante', 1, 'Agachamento Livre', 3, '10-12', 90),
    ('musculacao-full-body-iniciante', 2, 'Supino Reto', 3, '10-12', 90),
    ('musculacao-full-body-iniciante', 3, 'Remada Curvada', 3, '10-12', 90),
    ('musculacao-full-body-iniciante', 4, 'Desenvolvimento com Halteres', 3, '10-12', 60),
    ('musculacao-full-body-iniciante', 5, 'Rosca Direta', 3, '12', 60),
    ('musculacao-full-body-iniciante', 6, 'Tríceps Testa', 3, '12', 60),

    ('musculacao-hiit-abdomen', 1, 'Agachamento Livre', 4, '20', 30),
    ('musculacao-hiit-abdomen', 2, 'Flexão de Braço', 4, '15', 30),
    ('musculacao-hiit-abdomen', 3, 'Afundo', 4, '20', 30),
    ('musculacao-hiit-abdomen', 4, 'Barra Fixa', 4, '8', 30),
    ('musculacao-hiit-abdomen', 5, 'Mergulho', 4, '12', 30),
    ('musculacao-hiit-abdomen', 6, 'Prancha', 3, '45s', 30),
    ('musculacao-hiit-abdomen', 7, 'Abdominal Crunch', 3, '20', 30),
    ('musculacao-hiit-abdomen', 8, 'Abdominal Remador', 3, '20', 30),

    ('musculacao-a-pernas', 1, 'Agachamento Livre', 4, '8-10', 120),
    ('musculacao-a-pernas', 2, 'Leg Press', 4, '10-12', 90),
    ('musculacao-a-pernas', 3, 'Cadeira Extensora', 3, '12-15', 60),
    ('musculacao-a-pernas', 4, 'Mesa Flexora', 3, '12-15', 60),
    ('musculacao-a-pernas', 5, 'Panturrilha em Pé', 4, '15', 45),

    ('musculacao-b-peito-triceps', 1, 'Supino Reto', 4, '8-10', 90),
    ('musculacao-b-peito-triceps', 2, 'Supino Inclinado', 3, '10-12', 90),
    ('musculacao-b-peito-triceps', 3, 'Crucifixo', 3, '12', 60),
    ('musculacao-b-peito-triceps', 4, 'Tríceps Pulley', 3, '12', 60),
    ('musculacao-b-peito-triceps', 5, 'Tríceps Testa', 3, '12', 60),

    ('musculacao-c-costas-biceps', 1, 'Remada Curvada', 4, '8-10', 90),
    ('musculacao-c-costas-biceps', 2, 'Puxada Frontal', 4, '10-12', 90),
    ('musculacao-c-costas-biceps', 3, 'Remada Unilateral', 3, '10-12', 60),
    ('musculacao-c-costas-biceps', 4, 'Rosca Direta', 3, '10-12', 60),
    ('musculacao-c-costas-biceps', 5, 'Rosca Martelo', 3, '12', 60)
)
INSERT INTO treino.templates_treino (slug, modalidade, nome, descricao, modalidade_detalhes, ordem)
SELECT
  m.slug,
  'musculacao',
  m.nome,
  m.descricao,
  jsonb_build_object('exercicios', COALESCE((
    SELECT jsonb_agg(
             jsonb_build_object('exercicio_id', e.id, 'nome', e.name, 'sets', i.sets, 'reps', i.reps, 'rest_seconds', i.descanso)
             ORDER BY i.ord)
    FROM itens i
    JOIN treino.exercicios e ON e.professional_id IS NULL AND lower(e.name) = lower(i.exercicio)
    WHERE i.slug = m.slug
  ), '[]'::jsonb)),
  m.ordem
FROM modelos m
ON CONFLICT (slug) DO NOTHING;

COMMIT;
