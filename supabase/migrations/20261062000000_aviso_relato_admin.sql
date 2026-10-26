-- ============================================================
-- Migration: 20261062000000_aviso_relato_admin.sql
--
-- Aviso automático ao admin quando chega um relato novo na central de ajuda (20261060):
--   * whatsapp_log aceita o tipo 'relato_novo' (por evento: pode sair mais de uma vez no dia; fica fora do índice "um por tipo por dia");
--   * trigger AFTER INSERT em treino.relatos chama, via pg_net, a Edge Function `avisar-relato` com o segredo do Vault
--     (o mesmo `cron_secret` dos avisos de WhatsApp). O texto do relato NÃO viaja na chamada (só o id) nem na mensagem.
-- O trigger NUNCA bloqueia o relato: qualquer falha (pg_net/Vault ausente, função fora do ar) é engolida.
-- Pré-requisitos: extensão pg_net e secret `cron_secret` no Vault (já existem, por supabase/cron/whatsapp.sql); deploy da função
-- avisar-relato; o admin precisa ter WhatsApp ligado e telefone verificado (Configurações → Notificações).
-- Reversão: DROP TRIGGER tg_relato_avisar_admin ON treino.relatos; DROP FUNCTION treino.relato_avisar_admin();
-- ============================================================

BEGIN;

ALTER TABLE treino.whatsapp_log DROP CONSTRAINT IF EXISTS whatsapp_log_tipo_check;
ALTER TABLE treino.whatsapp_log
  ADD CONSTRAINT whatsapp_log_tipo_check
  CHECK (tipo IN ('briefing_diario', 'pagamento_plano', 'plano_expirando', 'resumo_semanal', 'aluno_inativo', 'plano_vencido', 'treino_concluido', 'relato_novo'));

DROP INDEX IF EXISTS treino.uq_whatsapp_log_envio_dia_v2;
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_log_envio_dia_v3
  ON treino.whatsapp_log (professional_id, tipo, dia)
  WHERE status = 'enviado' AND tipo NOT IN ('treino_concluido', 'relato_novo');

CREATE OR REPLACE FUNCTION treino.relato_avisar_admin()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/avisar-relato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
      ),
      body := jsonb_build_object('relato_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'relato_avisar_admin: não foi possível avisar o admin (%)', SQLERRM;
  END;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION treino.relato_avisar_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tg_relato_avisar_admin ON treino.relatos;
CREATE TRIGGER tg_relato_avisar_admin
  AFTER INSERT ON treino.relatos
  FOR EACH ROW EXECUTE FUNCTION treino.relato_avisar_admin();

COMMIT;
