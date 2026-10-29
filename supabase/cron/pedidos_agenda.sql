-- Limpeza diária dos pedidos de aula feitos por visitantes (rode UMA vez no SQL Editor, depois da migration 20261089; precisa do pg_cron ativo).
-- Apaga os pedidos que NÃO viraram aula (pendentes, recusados e indisponíveis) com mais de 30 dias; os aprovados ficam, porque já
-- viraram aluno e aula. Nome e telefone de quem não virou aluno não ficam guardados além disso.
-- Prévia do que seria apagado hoje:  SELECT id, status, created_at FROM treino.pedidos_agenda WHERE status <> 'aprovado' AND created_at < now() - interval '30 days';
-- Para refazer: SELECT cron.unschedule('limpar-pedidos-agenda');
SELECT cron.schedule(
  'limpar-pedidos-agenda',
  '40 6 * * *',
  $$DELETE FROM treino.pedidos_agenda WHERE status <> 'aprovado' AND created_at < now() - interval '30 days'$$
);
