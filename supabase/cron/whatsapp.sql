-- ============================================================
-- Agendamentos (pg_cron) dos avisos de WhatsApp ao personal.
-- NÃO é migration: depende de segredo e das extensões do projeto. Rodar UMA vez no SQL Editor, depois de:
--   1) criar o secret CRON_SECRET nas Edge Functions (um valor aleatório com 32+ caracteres);
--   2) fazer o deploy de daily-briefing, avisos-diarios e weekly-summary.
-- O mesmo valor do CRON_SECRET é guardado no Vault abaixo (o job lê de lá em cada chamada; nenhum segredo fica neste arquivo).
-- Horários em UTC; Brasília = UTC-3 (sem horário de verão).
-- ============================================================

-- extensões (se ainda não estiverem ativas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- segredo no Vault: troque COLE_O_VALOR_DO_CRON_SECRET pelo valor real (sem aspas extras, sem <>). Rode só uma vez.
SELECT vault.create_secret('COLE_O_VALOR_DO_CRON_SECRET', 'cron_secret');

-- briefing da agenda: todo dia 8h de Brasília (11h UTC)
SELECT cron.schedule('whatsapp-briefing-diario', '0 11 * * *', $job$
  SELECT net.http_post(
    url := 'https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/daily-briefing',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')),
    body := '{}'::jsonb
  )
$job$);

-- plano vencendo e alunos inativos: todo dia 8h de Brasília (11h UTC)
SELECT cron.schedule('whatsapp-avisos-diarios', '0 11 * * *', $job$
  SELECT net.http_post(
    url := 'https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/avisos-diarios',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')),
    body := '{}'::jsonb
  )
$job$);

-- resumo da semana: domingo 21h de Brasília (segunda 00h UTC)
SELECT cron.schedule('whatsapp-resumo-semanal', '0 0 * * 1', $job$
  SELECT net.http_post(
    url := 'https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/weekly-summary',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')),
    body := '{}'::jsonb
  )
$job$);

-- conferir / desligar:
--   SELECT jobid, jobname, schedule FROM cron.job WHERE jobname LIKE 'whatsapp-%';
--   SELECT cron.unschedule('whatsapp-briefing-diario');
