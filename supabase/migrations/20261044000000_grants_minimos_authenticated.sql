-- ============================================================
-- Migration: 20261044000000_grants_minimos_authenticated.sql
--
-- Auditoria de segurança (docs/SECURITY-AUDIT.md): o grant padrão do schema (migration inicial, ~l.274-277) dava
-- SELECT/INSERT/UPDATE/DELETE a `authenticated` em TODA tabela, presente e futura. Como o cadastro de personal é aberto,
-- qualquer pessoa vira `authenticated`: só a RLS separava os dados, e uma policy esquecida ou uma tabela nova sem policy
-- abriria tudo. Aqui:
--   1. tabelas FUTURAS deixam de receber grant automático (cada migration nova precisa conceder o que precisa);
--   2. as tabelas atuais ficam só com os verbos que ALGUMA policy já permite (a RLS continua valendo por cima);
--      os verbos que nenhuma policy permitia já eram negados pela RLS — aqui passam a ser negados também por privilégio.
-- Não muda o comportamento do app. Não desliga RLS. Escritas nas tabelas restritas (admin_logs, assinaturas,
-- notificacoes_professor, aceites_termos no cadastro) são feitas por funções SECURITY DEFINER ou service_role.
-- Etapa futura (não feita aqui): tirar DELETE/UPDATE de tabelas com policy ALL que o app nunca usa.
-- ============================================================

BEGIN;

-- 1. Futuras tabelas: sem grant automático ao cliente.
ALTER DEFAULT PRIVILEGES IN SCHEMA treino REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM authenticated;

-- 2. Zera e concede só o que alguma policy permite.
REVOKE ALL ON ALL TABLES IN SCHEMA treino FROM authenticated;

-- policy ALL (dono)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  treino.aluno_cobranca, treino.aluno_locais_treino, treino.alunos, treino.aula_participantes, treino.aulas,
  treino.consentimentos, treino.exercicios, treino.exercicios_natacao_custom, treino.faturas, treino.horario_alunos,
  treino.horarios_fixos, treino.modelo_exercicios, treino.modelos, treino.pesos, treino.plano_exercicios, treino.planos,
  treino.professional_config, treino.sessao_exercicios, treino.sessao_series, treino.sessoes
TO authenticated;

GRANT SELECT, INSERT ON treino.aceites_termos, treino.execucoes_assincrono TO authenticated;  -- só ler e criar
GRANT SELECT, UPDATE ON treino.notificacoes_professor TO authenticated;                       -- marcar como lida
GRANT SELECT ON
  treino.admin_logs, treino.assinaturas, treino.consentimento_reenvios,
  treino.templates_treino, treino.whatsapp_log, treino.professionals
TO authenticated;
-- professionals: UPDATE só nas colunas que o app edita (mesma lista da migration 20261039; is_admin fica de fora).
GRANT UPDATE (name, cpf, phone, whatsapp_opt_in, uf, cidade, bairro) ON treino.professionals TO authenticated;

-- Sem nenhum grant ao cliente (só service_role): consentimento_evidencias, consentimento_saude_tokens,
-- links_treino_assincrono, rate_limit.

COMMIT;
