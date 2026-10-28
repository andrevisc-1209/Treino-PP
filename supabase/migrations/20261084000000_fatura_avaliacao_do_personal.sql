-- ============================================================
-- Migration: 20261084000000_fatura_avaliacao_do_personal.sql
--
-- Relatório de acompanhamento: a avaliação escrita pelo personal (conquistas, pontos de atenção e próximos objetivos) fica
-- salva na própria fatura do ciclo/pacote, então aparece no PDF e no recibo e vale para baixar de novo. Texto livre do
-- personal, no máximo 500 caracteres por campo. A RLS de treino.faturas já limita ao dono (e bloqueia gravar sem assinatura ativa).
-- ============================================================

BEGIN;

ALTER TABLE treino.faturas
  ADD COLUMN avaliacao_conquistas TEXT NULL CHECK (avaliacao_conquistas IS NULL OR char_length(avaliacao_conquistas) <= 500),
  ADD COLUMN avaliacao_atencao    TEXT NULL CHECK (avaliacao_atencao IS NULL OR char_length(avaliacao_atencao) <= 500),
  ADD COLUMN avaliacao_proximos   TEXT NULL CHECK (avaliacao_proximos IS NULL OR char_length(avaliacao_proximos) <= 500);

COMMIT;
