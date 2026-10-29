-- ============================================================
-- Migration: 20261090000000_agenda_pedidos_avisos.sql
--
-- Agenda, fase 2 (parte 2): o aviso de novo pedido de aula ao personal.
--   * notificacoes_professor aceita o tipo 'pedido_aula' (o sino do app), sem aluno (o visitante ainda não é aluno); um aviso por pedido;
--   * whatsapp_log aceita o tipo 'pedido_aula' (por evento: pode sair mais de uma vez no dia; fica fora do índice "um por tipo por dia").
-- Quem grava é a Edge Function "agenda-publica" (service_role). A mensagem de WhatsApp não leva o nome nem o telefone do visitante.
-- Reversão: restaurar as constraints de 20261070 e 20261062 sem 'pedido_aula' e apagar DELETE FROM treino.notificacoes_professor WHERE tipo = 'pedido_aula' antes.
-- ============================================================

BEGIN;

ALTER TABLE treino.notificacoes_professor DROP CONSTRAINT IF EXISTS notificacoes_professor_tipo_check;
ALTER TABLE treino.notificacoes_professor
  ADD CONSTRAINT notificacoes_professor_tipo_check CHECK (tipo IN ('treino_concluido', 'ciclo_encerrado', 'indicacao_concedida', 'pedido_aula'));

ALTER TABLE treino.notificacoes_professor DROP CONSTRAINT IF EXISTS notificacoes_professor_aluno_conforme_tipo;
ALTER TABLE treino.notificacoes_professor
  ADD CONSTRAINT notificacoes_professor_aluno_conforme_tipo CHECK (tipo IN ('indicacao_concedida', 'pedido_aula') OR aluno_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacoes_pedido_aula
  ON treino.notificacoes_professor (professional_id, ((payload->>'pedido_id')))
  WHERE tipo = 'pedido_aula';

ALTER TABLE treino.whatsapp_log DROP CONSTRAINT IF EXISTS whatsapp_log_tipo_check;
ALTER TABLE treino.whatsapp_log
  ADD CONSTRAINT whatsapp_log_tipo_check
  CHECK (tipo IN ('briefing_diario', 'pagamento_plano', 'plano_expirando', 'resumo_semanal', 'aluno_inativo', 'plano_vencido', 'treino_concluido', 'relato_novo', 'pedido_aula'));

DROP INDEX IF EXISTS treino.uq_whatsapp_log_envio_dia_v3;
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_log_envio_dia_v4
  ON treino.whatsapp_log (professional_id, tipo, dia)
  WHERE status = 'enviado' AND tipo NOT IN ('treino_concluido', 'relato_novo', 'pedido_aula');

COMMIT;
