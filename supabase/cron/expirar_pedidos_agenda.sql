-- Expira os pedidos de aula sem resposta (rode UMA vez no SQL Editor, depois da migration 20261102; precisa do pg_cron ativo).
-- A cada hora, pedido pendente há mais de 7 dias, ou cujo horário já passou, vira "indisponivel" (aparece em "Recusados" no app).
-- Isso libera a fila de pendentes (teto de 10 por personal), que um concorrente poderia encher.
-- Prévia do que expiraria agora:  SELECT id, created_at, inicio FROM treino.pedidos_agenda WHERE status = 'pendente' AND (created_at < now() - interval '7 days' OR inicio < now());
-- Para refazer: SELECT cron.unschedule('expirar-pedidos-agenda');
SELECT cron.schedule(
  'expirar-pedidos-agenda',
  '15 * * * *',
  $$SELECT treino.expirar_pedidos_agenda()$$
);
