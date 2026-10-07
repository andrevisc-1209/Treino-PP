-- ============================================================
-- Migration: 20261021000000_execucao_treino_modalidade.sql
--
-- Treino multimodalidade — Fase 2: execução (check-off) de qualquer modalidade,
-- por link público (aluno sem conta) ou registrada pelo personal na aula presencial.
--
--   1. treino.modelos ganha modalidade/tipo_execucao/modalidade_detalhes (treinos planejados
--      multimodalidade, igual treino.planos na Fase 1; exercícios livres ficam em
--      modalidade_detalhes.exercicios_livres).
--   2. treino.links_treino_assincrono: token do link público /treino/:token. SÓ service_role:
--      o token é o segredo do link; ninguém no cliente lê ou grava esta tabela.
--   3. treino.execucoes_assincrono: o que foi feito (link ou presencial). O personal LÊ e
--      registra execuções presenciais (RLS); as execuções por link são gravadas pela Edge
--      Function (service_role), porque o aluno não tem conta/auth.uid().
--
-- Ajustes em relação ao rascunho do pedido:
--   * a policy "aluno_own_execucoes (aluno_id = auth.uid())" não serve: alunos NÃO têm conta,
--     e treino.alunos.id nunca é um auth.uid(). Em vez dela, o acesso público é só pelas Edge Functions;
--   * professional_id na tabela (RLS por dono) e (SELECT auth.uid()) nas policies, como no resto do schema;
--   * plano_id é NULL-ável com ON DELETE SET NULL + snapshot (plano_nome, modalidade): apagar um
--     treino não pode apagar o histórico do aluno (mesmo critério de treino.sessoes.plano_nome).
-- ============================================================

BEGIN;

-- ----- 1. Treinos planejados multimodalidade -----
ALTER TABLE treino.modelos
  ADD COLUMN IF NOT EXISTS modalidade treino.modalidade_tipo NOT NULL DEFAULT 'musculacao',
  ADD COLUMN IF NOT EXISTS tipo_execucao TEXT NOT NULL DEFAULT 'sincrono' CHECK (tipo_execucao IN ('sincrono', 'assincrono')),
  ADD COLUMN IF NOT EXISTS modalidade_detalhes JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ----- 2. Links públicos (só service_role) -----
CREATE TABLE IF NOT EXISTS treino.links_treino_assincrono (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id        UUID NOT NULL REFERENCES treino.planos(id) ON DELETE CASCADE,
  aluno_id        UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  token           UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em       TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  usado_em        TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_links_treino_plano ON treino.links_treino_assincrono (plano_id);

ALTER TABLE treino.links_treino_assincrono ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.links_treino_assincrono FROM PUBLIC, anon, authenticated;
GRANT ALL ON treino.links_treino_assincrono TO service_role;

-- ----- 3. Execuções -----
CREATE TABLE IF NOT EXISTS treino.execucoes_assincrono (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id          UUID NULL REFERENCES treino.planos(id) ON DELETE SET NULL,
  plano_nome        TEXT NULL,
  modalidade        treino.modalidade_tipo NOT NULL DEFAULT 'musculacao',
  aluno_id          UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  origem            TEXT NOT NULL DEFAULT 'link' CHECK (origem IN ('link', 'presencial')),
  link_id           UUID NULL REFERENCES treino.links_treino_assincrono(id) ON DELETE SET NULL,
  iniciado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em      TIMESTAMPTZ NULL,
  status            TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'cancelado')),
  -- musculacao: { "exercicios": [{ "exercicio_id", "nome", "series_planejadas", "series_feitas", "obs" }] }
  -- demais:     { "resultado": { "distancia_km": 5.2, "tempo_total": "28:30", ... },
  --               "exercicios_livres": [{ "nome", "feito" }] }
  detalhes_execucao JSONB NOT NULL DEFAULT '{}'::jsonb,
  notas_aluno       TEXT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execucoes_assincrono_plano ON treino.execucoes_assincrono (plano_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_assincrono_aluno ON treino.execucoes_assincrono (aluno_id, concluido_em DESC);

ALTER TABLE treino.execucoes_assincrono ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS execucoes_select_own ON treino.execucoes_assincrono;
CREATE POLICY execucoes_select_own ON treino.execucoes_assincrono
  FOR SELECT TO authenticated
  USING (professional_id = (SELECT auth.uid()));

-- O personal registra execução PRESENCIAL de um aluno dele (origem 'link' só a Edge Function grava).
DROP POLICY IF EXISTS execucoes_insert_presencial ON treino.execucoes_assincrono;
CREATE POLICY execucoes_insert_presencial ON treino.execucoes_assincrono
  FOR INSERT TO authenticated
  WITH CHECK (
    professional_id = (SELECT auth.uid())
    AND origem = 'presencial'
    AND EXISTS (SELECT 1 FROM treino.alunos a WHERE a.id = aluno_id AND a.professional_id = (SELECT auth.uid()))
  );

REVOKE ALL ON treino.execucoes_assincrono FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON treino.execucoes_assincrono TO authenticated;
GRANT ALL ON treino.execucoes_assincrono TO service_role;

COMMIT;
