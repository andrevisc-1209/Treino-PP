-- ============================================================
-- Migration: 20261023000000_unificacao_historico_notificacoes.sql
--
-- 1. Sessões PRESENCIAIS de musculação passam a também gravar em treino.execucoes_assincrono
--    (aba Performance, selo da lista de alunos e feed de atividade já leem dali). O app grava
--    com origem = 'presencial' e sessao_id = a sessão de origem.
-- 2. Notificações do personal (treino concluído pelo link do aluno), com Realtime.
--
-- Ajustes em relação ao rascunho do pedido:
--   * a coluna "origem" JÁ EXISTE desde a Fase 2, com valores 'link' | 'presencial' — e a policy de
--     INSERT do personal exige 'presencial'. Não criei uma segunda coluna com valores novos
--     ('link_assincrono'/'sessao_presencial'): o `ADD COLUMN IF NOT EXISTS` seria ignorado e o CHECK
--     novo nunca valeria. Reuso 'presencial'.
--   * sessao_id (UNIQUE parcial) liga a execução à sessão e impede duplicar se a conclusão rodar duas vezes.
--   * notificacoes_professor: o personal só LÊ e marca como lida (UPDATE só da coluna "lida"), em vez de
--     FOR ALL; quem cria é a Edge Function (service_role). Policies com (SELECT auth.uid()) e WITH CHECK.
--   * o payload NÃO guarda as observações do aluno (texto livre, pode citar dor/lesão): só execucao_id e
--     "tem_notas"; o texto continua apenas em execucoes_assincrono.
--   * a tabela entra na publicação supabase_realtime (o Realtime respeita o RLS acima).
-- ============================================================

BEGIN;

-- ----- 1. Ligação com a sessão presencial -----
ALTER TABLE treino.execucoes_assincrono
  ADD COLUMN IF NOT EXISTS sessao_id UUID NULL REFERENCES treino.sessoes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_execucoes_sessao
  ON treino.execucoes_assincrono (sessao_id) WHERE sessao_id IS NOT NULL;

-- ----- 2. Notificações do personal -----
CREATE TABLE IF NOT EXISTS treino.notificacoes_professor (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  aluno_id        UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('treino_concluido')),
  lida            BOOLEAN NOT NULL DEFAULT FALSE,
  -- { "execucao_id": "uuid", "plano_nome": "Treino A", "modalidade": "corrida", "tem_notas": true }
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  criada_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_professional
  ON treino.notificacoes_professor (professional_id, lida, criada_em DESC);

ALTER TABLE treino.notificacoes_professor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notificacoes_select_own ON treino.notificacoes_professor;
CREATE POLICY notificacoes_select_own ON treino.notificacoes_professor
  FOR SELECT TO authenticated
  USING (professional_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notificacoes_update_own ON treino.notificacoes_professor;
CREATE POLICY notificacoes_update_own ON treino.notificacoes_professor
  FOR UPDATE TO authenticated
  USING (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

REVOKE ALL ON treino.notificacoes_professor FROM PUBLIC, anon, authenticated;
GRANT SELECT ON treino.notificacoes_professor TO authenticated;
GRANT UPDATE (lida) ON treino.notificacoes_professor TO authenticated;
GRANT ALL ON treino.notificacoes_professor TO service_role;

-- ----- 3. Realtime -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'treino' AND tablename = 'notificacoes_professor'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE treino.notificacoes_professor;
  END IF;
END
$$;

COMMIT;
