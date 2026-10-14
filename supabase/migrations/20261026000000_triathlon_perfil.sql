-- ============================================================
-- Migration: 20261026000000_triathlon_perfil.sql
--
-- Objetivo esportivo do aluno: modalidade foco, prova alvo e data da prova.
-- (O rascunho do pedido nomeava 20261014000001; o número foi trocado para ficar depois das migrations existentes.)
--
-- CHECK nos valores aceitos. Prova alvo: triathlon (sprint/olimpico/70.3/ironman) ou corrida (5k/10k/21k/42k) —
-- o formulário só oferece as provas da modalidade escolhida. RLS/grants de treino.alunos não mudam.
-- ============================================================

ALTER TABLE treino.alunos
  ADD COLUMN IF NOT EXISTS modalidade_foco TEXT NULL
    CHECK (modalidade_foco IN ('triathlon', 'corrida', 'natacao', 'ciclismo')),
  ADD COLUMN IF NOT EXISTS prova_alvo TEXT NULL
    CHECK (prova_alvo IN ('sprint', 'olimpico', '70.3', 'ironman', '5k', '10k', '21k', '42k')),
  ADD COLUMN IF NOT EXISTS data_prova DATE NULL;
