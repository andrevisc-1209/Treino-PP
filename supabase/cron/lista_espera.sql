-- Limpeza diária da lista de espera da página pública (rode UMA vez no SQL Editor, depois da migration 20261094; precisa do pg_cron ativo).
-- Apaga quem está na espera há mais de 14 dias ou pediu um dia que já passou. Nome e telefone não ficam guardados além disso.
-- Prévia do que seria apagado hoje:  SELECT id, data, created_at FROM treino.lista_espera_agenda WHERE created_at < now() - interval '14 days' OR data < (now() AT TIME ZONE 'America/Sao_Paulo')::date;
-- Para refazer: SELECT cron.unschedule('limpar-lista-espera');
SELECT cron.schedule(
  'limpar-lista-espera',
  '50 6 * * *',
  $$DELETE FROM treino.lista_espera_agenda WHERE created_at < now() - interval '14 days' OR data < (now() AT TIME ZONE 'America/Sao_Paulo')::date$$
);
