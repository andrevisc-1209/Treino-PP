-- ============================================================
-- Migration: 20261037000000_whatsapp_log.sql
--
-- Registro dos avisos de WhatsApp enviados ao personal (briefing diário, pagamento do plano, plano vencendo, resumo semanal,
-- aluno inativo). Serve para (1) não repetir o mesmo tipo no mesmo dia e (2) auditar falhas. NÃO guarda o texto da mensagem
-- nem o número: só tipo, status, dia e, em caso de falha, o código curto do erro ("evolution:401").
--
-- Quem grava é só a Edge Function (service_role). O personal pode LER os próprios registros.
-- Idempotente.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS treino.whatsapp_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('briefing_diario', 'pagamento_plano', 'plano_expirando', 'resumo_semanal', 'aluno_inativo')),
  status          TEXT NOT NULL CHECK (status IN ('enviado', 'falhou')),
  dia             DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message   TEXT NULL CHECK (char_length(error_message) <= 200)
);

-- no máximo um aviso ENVIADO por personal, tipo e dia (as falhas podem se repetir)
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_log_envio_dia ON treino.whatsapp_log (professional_id, tipo, dia) WHERE status = 'enviado';
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_prof ON treino.whatsapp_log (professional_id, sent_at DESC);

ALTER TABLE treino.whatsapp_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_log_select_own ON treino.whatsapp_log;
CREATE POLICY whatsapp_log_select_own ON treino.whatsapp_log
  FOR SELECT TO authenticated
  USING (professional_id = (SELECT auth.uid()));

REVOKE ALL ON treino.whatsapp_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON treino.whatsapp_log TO authenticated;
GRANT ALL ON treino.whatsapp_log TO service_role;

COMMIT;
