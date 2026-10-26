-- Limpeza diária da lixeira de alunos (rode UMA vez no SQL Editor, depois da migration 20261059; precisa do pg_cron ativo).
-- Apaga de vez (em cascata: sessões, treinos, avaliações, faturas…) os alunos que estão na lixeira há mais de 30 dias.
-- Roda como dono do banco, então a trava do cliente (só apaga o que está na lixeira) não interfere.
-- Prévia do que seria apagado hoje:  SELECT id, name, apagado_em FROM treino.alunos WHERE apagado_em < now() - interval '30 days';
-- Para refazer: SELECT cron.unschedule('limpar-lixeira-alunos');
SELECT cron.schedule(
  'limpar-lixeira-alunos',
  '30 6 * * *',
  $$DELETE FROM treino.alunos WHERE apagado_em IS NOT NULL AND apagado_em < now() - interval '30 days'$$
);
