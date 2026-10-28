-- ============================================================
-- Migration: 20261078000000_arquivar_treino_planejado.sql
--
-- Arquivar treino planejado (tabela treino.modelos): tira o treino da lista e do seletor de "Escolher treino" sem apagar nada.
-- Arquivo, não exclusão: treinos já aplicados aos alunos não mudam e o modelo pode ser restaurado.
-- Coluna nova, anulável: NULL = ativo; data = arquivado em. As policies (dono) e o GRANT da tabela já cobrem a coluna.
-- Reversão: ALTER TABLE treino.modelos DROP COLUMN arquivado_em;
-- Teste (transação desfeita no final): supabase/tests/arquivar_treino_planejado.sql
-- ============================================================

BEGIN;

ALTER TABLE treino.modelos ADD COLUMN IF NOT EXISTS arquivado_em TIMESTAMPTZ NULL;

COMMIT;
