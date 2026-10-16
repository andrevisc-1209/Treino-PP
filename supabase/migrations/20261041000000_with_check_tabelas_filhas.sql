-- ============================================================
-- Migration: 20261041000000_with_check_tabelas_filhas.sql
--
-- Auditoria de segurança (docs/SECURITY-AUDIT.md): o WITH CHECK de algumas tabelas
-- filhas validava as FKs principais (aluno/plano/aula/fatura) mas deixava outras colunas
-- FK sem checagem. O PostgreSQL não aplica RLS nas verificações de FK, então um personal
-- autenticado podia gravar na SUA linha um UUID pertencente a outro personal
-- (precisa conhecer o UUID; é aleatório, por isso a severidade é baixa — integridade
-- entre tenants, não vazamento direto de dados).
--
-- Colunas fechadas:
--   aula_participantes.execucao_id     -> execucoes_assincrono do próprio personal
--   planos.modelo_origem_id            -> modelos do próprio personal
--   sessao_exercicios.plano_exercicio_id -> plano_exercicios do próprio personal
--   sessoes.aula_id                    -> aulas do próprio personal
--   execucoes_assincrono (INSERT presencial): sessao_id e plano_id do próprio personal;
--                                         link_id deve ser NULL (links são só do fluxo à distância,
--                                         via service_role; o app presencial nunca preenche).
--
-- Os subselects herdam a RLS das tabelas referenciadas (SELECT só devolve linhas do próprio
-- personal), o mesmo padrão já usado nestas policies. USING não muda; só o WITH CHECK.
-- Não há tabela "pagamentos" no schema; consentimento_evidencias não tem policy de cliente
-- (service_role apenas) — nada a corrigir ali. RLS continua ligada em todas.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS aula_participantes_own ON treino.aula_participantes;
CREATE POLICY aula_participantes_own ON treino.aula_participantes
  FOR ALL TO authenticated
  USING (aula_id IN (SELECT au.id FROM treino.aulas au))
  WITH CHECK (
    aula_id IN (SELECT au.id FROM treino.aulas au)
    AND aluno_id IN (SELECT a.id FROM treino.alunos a)
    AND (sessao_id IS NULL OR sessao_id IN (SELECT s.id FROM treino.sessoes s))
    AND (fatura_id IS NULL OR fatura_id IN (SELECT f.id FROM treino.faturas f))
    AND (execucao_id IS NULL OR execucao_id IN (SELECT e.id FROM treino.execucoes_assincrono e))
  );

DROP POLICY IF EXISTS planos_own ON treino.planos;
CREATE POLICY planos_own ON treino.planos
  FOR ALL TO authenticated
  USING (professional_id = (SELECT auth.uid()))
  WITH CHECK (
    professional_id = (SELECT auth.uid())
    AND aluno_id IN (SELECT a.id FROM treino.alunos a)
    AND (modelo_origem_id IS NULL OR modelo_origem_id IN (SELECT m.id FROM treino.modelos m))
  );

DROP POLICY IF EXISTS sessao_exercicios_own ON treino.sessao_exercicios;
CREATE POLICY sessao_exercicios_own ON treino.sessao_exercicios
  FOR ALL TO authenticated
  USING (sessao_id IN (SELECT s.id FROM treino.sessoes s))
  WITH CHECK (
    sessao_id IN (SELECT s.id FROM treino.sessoes s)
    AND exercicio_id IN (SELECT e.id FROM treino.exercicios e)
    AND (plano_exercicio_id IS NULL OR plano_exercicio_id IN (SELECT pe.id FROM treino.plano_exercicios pe))
  );

DROP POLICY IF EXISTS sessoes_own ON treino.sessoes;
CREATE POLICY sessoes_own ON treino.sessoes
  FOR ALL TO authenticated
  USING (professional_id = (SELECT auth.uid()))
  WITH CHECK (
    professional_id = (SELECT auth.uid())
    AND aluno_id IN (SELECT a.id FROM treino.alunos a)
    AND (plano_id IS NULL OR plano_id IN (SELECT p.id FROM treino.planos p))
    AND (aula_id IS NULL OR aula_id IN (SELECT au.id FROM treino.aulas au))
  );

DROP POLICY IF EXISTS execucoes_insert_presencial ON treino.execucoes_assincrono;
CREATE POLICY execucoes_insert_presencial ON treino.execucoes_assincrono
  FOR INSERT TO authenticated
  WITH CHECK (
    professional_id = (SELECT auth.uid())
    AND origem = 'presencial'
    AND EXISTS (SELECT 1 FROM treino.alunos a WHERE a.id = aluno_id AND a.professional_id = (SELECT auth.uid()))
    AND (sessao_id IS NULL OR sessao_id IN (SELECT s.id FROM treino.sessoes s))
    AND (plano_id IS NULL OR plano_id IN (SELECT p.id FROM treino.planos p))
    AND link_id IS NULL
  );

COMMIT;
