-- ============================================================
-- Migration: 20261055000000_grants_minimos_etapa2.sql
--
-- Etapa 2 dos grants mínimos (a etapa 1 é a 20261044): tira de `authenticated` os verbos UPDATE/DELETE que o app NUNCA usa
-- nas tabelas com policy ALL. A RLS já limitava ao dono; aqui o privilégio também some, então uma policy errada futura
-- não abre esses verbos. Escolha dos itens: (1) código do app e funções SECURITY INVOKER procurados por `.update/.delete/.upsert`
-- e por UPDATE/DELETE em SQL; (2) contagem de pg_stat_user_tables em produção (desde 25/08/2026). Só entra o que as DUAS
-- fontes dizem que ninguém usa. Ficaram de fora, por uso real ou dúvida: exercicios (UPDATE: edição de exercício), faturas (DELETE:
-- refechar ciclo), exercicios_natacao_custom (em uso no app), sessao_exercicios (UPDATE sem origem explicada nas estatísticas).
--
-- Não afeta: DELETE em cascata (as ações de FK rodam como dono da tabela), funções SECURITY DEFINER e Edge Functions (service_role).
-- Reversão, se algum fluxo raro quebrar: GRANT <verbo> ON treino.<tabela> TO authenticated;
-- ============================================================

BEGIN;

REVOKE UPDATE, DELETE ON treino.pesos FROM authenticated;                 -- o app só lista e insere pesos
REVOKE DELETE ON treino.sessao_series FROM authenticated;                 -- grava por upsert; some só em cascata
REVOKE DELETE ON treino.horarios_fixos FROM authenticated;
REVOKE DELETE ON treino.aluno_cobranca FROM authenticated;
REVOKE DELETE ON treino.aula_participantes FROM authenticated;
REVOKE DELETE ON treino.sessoes FROM authenticated;
REVOKE DELETE ON treino.professional_config FROM authenticated;
REVOKE UPDATE ON treino.aluno_locais_treino FROM authenticated;
REVOKE UPDATE ON treino.horario_alunos FROM authenticated;

COMMIT;
