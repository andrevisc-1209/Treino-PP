-- ============================================================
-- Migration: 20261083000000_pacote_conta_treino_a_distancia.sql
--
-- Pacote de aulas: o personal decide se o treino que o aluno faz à distância (pelo link) gasta uma aula do pacote, do mesmo
-- jeito que decide se cobra esse treino no modelo por aula. Padrão: NÃO conta (só avisa no histórico e no relatório).
-- ============================================================

BEGIN;

ALTER TABLE treino.aluno_pacotes
  ADD COLUMN conta_distancia BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
