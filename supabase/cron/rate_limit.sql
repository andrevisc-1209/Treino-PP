-- Limpeza diária da tabela treino.rate_limit (rode UMA vez no SQL Editor; precisa do pg_cron ativo).
-- Apaga janelas com mais de 1 dia: o limite mais longo em uso é o de 24 h (envio de consentimento por e-mail).
-- Para refazer: SELECT cron.unschedule('limpar-rate-limit');
SELECT cron.schedule(
  'limpar-rate-limit',
  '15 6 * * *',
  $$DELETE FROM treino.rate_limit WHERE window_start < now() - interval '1 day'$$
);
