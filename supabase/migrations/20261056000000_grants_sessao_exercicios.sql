-- ============================================================
-- Migration: 20261056000000_grants_sessao_exercicios.sql
--
-- Fecha o que sobrou da etapa 2 dos grants mínimos (20261055): tira UPDATE de `authenticated` em sessao_exercicios.
-- Na etapa 2 ela ficou de fora porque pg_stat_user_tables mostrava 11 updates sem nenhum no código. Origem achada:
-- sessao_exercicios.plano_exercicio_id é `ON DELETE SET NULL` (migration inicial, ~l.209); ao apagar um item do plano
-- (planos/api.ts), o banco anula a referência. É uma ação de chave estrangeira: roda com o privilégio do dono da tabela e não
-- depende do grant do cliente (o mesmo princípio dos DELETE em cascata validados na etapa 2). O app nunca faz UPDATE nela.
-- Teste que roda isto em transação e desfaz: supabase/tests/sessao_exercicios_set_null.sql.
-- Reversão: GRANT UPDATE ON treino.sessao_exercicios TO authenticated;
-- ============================================================

BEGIN;

REVOKE UPDATE ON treino.sessao_exercicios FROM authenticated;

COMMIT;
