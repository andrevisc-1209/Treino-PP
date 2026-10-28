-- Exclusão de conta: conclui, todo dia, os pedidos cuja carência de 30 dias acabou (rode UMA vez no SQL Editor, depois da migration
-- 20261074; precisa do pg_cron ativo). Roda como dono do banco. Apaga de verdade tudo do personal; retém só o livro de pagamentos do plano,
-- sem vínculo com a pessoa. Ver o resultado de cada pedido: SELECT protocol, status, scheduled_for, completed_at, erro FROM treino.deletion_requests;
-- Prévia do que seria concluído hoje: SELECT protocol, scheduled_for FROM treino.deletion_requests WHERE status = 'pending' AND scheduled_for <= now();
-- Para refazer: SELECT cron.unschedule('exclusao-de-conta');
SELECT cron.schedule(
  'exclusao-de-conta',
  '0 7 * * *',
  $$SELECT treino.finalizar_exclusoes_vencidas()$$
);
