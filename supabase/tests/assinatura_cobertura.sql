-- Cobertura do modo leitura (migration 20261052): tabelas em que o CLIENTE pode inserir/atualizar e que NÃO têm a policy restritiva
-- assinatura_ativa_insert / assinatura_ativa_update. Só leitura. Rode depois de cada migration que crie tabela.
-- Esperado hoje: NENHUMA linha (as exceções — professionals [grant por coluna], notificacoes_professor [marcar como lida],
-- consentimentos [UPDATE para revogar] — ficam de fora de propósito).
SELECT
  c.relname AS tabela,
  has_table_privilege('authenticated', c.oid, 'INSERT') AS cliente_insere,
  has_table_privilege('authenticated', c.oid, 'UPDATE') AS cliente_atualiza,
  EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'treino' AND p.tablename = c.relname AND p.policyname = 'assinatura_ativa_insert') AS tem_policy_insert,
  EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'treino' AND p.tablename = c.relname AND p.policyname = 'assinatura_ativa_update') AS tem_policy_update
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'treino' AND c.relkind = 'r'
  AND c.relname NOT IN ('notificacoes_professor')
  AND (
    (has_table_privilege('authenticated', c.oid, 'INSERT')
       AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'treino' AND p.tablename = c.relname AND p.policyname = 'assinatura_ativa_insert'))
    OR
    (has_table_privilege('authenticated', c.oid, 'UPDATE') AND c.relname <> 'consentimentos'
       AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'treino' AND p.tablename = c.relname AND p.policyname = 'assinatura_ativa_update'))
  )
ORDER BY 1;
