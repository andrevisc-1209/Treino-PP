-- ============================================================
-- Migration: 20261038000000_whatsapp_avisos_novos.sql
--
-- Dois avisos novos de WhatsApp ao personal:
--   'plano_vencido'    cobranças (faturas) de alunos vencidas há 1/3/7 dias e não pagas  (avisos-financeiros)
--   'treino_concluido' aluno concluiu treino à distância                                  (aviso-treino-concluido)
--
-- 1) whatsapp_log aceita os dois tipos novos.
-- 2) 'treino_concluido' é "por evento": pode sair mais de uma vez no dia, então fica fora do índice único "um aviso por tipo por dia".
-- 3) execucoes_assincrono.whatsapp_avisado_em marca a execução já avisada (idempotência). As execuções que já existem entram como
--    avisadas (não faz sentido avisar treinos antigos de uma vez).
-- Idempotente.
-- ============================================================

BEGIN;

ALTER TABLE treino.whatsapp_log DROP CONSTRAINT IF EXISTS whatsapp_log_tipo_check;
ALTER TABLE treino.whatsapp_log
  ADD CONSTRAINT whatsapp_log_tipo_check
  CHECK (tipo IN ('briefing_diario', 'pagamento_plano', 'plano_expirando', 'resumo_semanal', 'aluno_inativo', 'plano_vencido', 'treino_concluido'));

DROP INDEX IF EXISTS treino.uq_whatsapp_log_envio_dia;
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_log_envio_dia_v2
  ON treino.whatsapp_log (professional_id, tipo, dia)
  WHERE status = 'enviado' AND tipo <> 'treino_concluido';

ALTER TABLE treino.execucoes_assincrono ADD COLUMN IF NOT EXISTS whatsapp_avisado_em TIMESTAMPTZ NULL;

UPDATE treino.execucoes_assincrono
SET whatsapp_avisado_em = COALESCE(concluido_em, created_at)
WHERE whatsapp_avisado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_execucoes_a_avisar
  ON treino.execucoes_assincrono (concluido_em)
  WHERE whatsapp_avisado_em IS NULL AND origem = 'link' AND status = 'concluido';

COMMIT;
