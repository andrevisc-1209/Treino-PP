-- ============================================================
-- Migration: 20261024000000_exercicios_natacao.sql
--
-- Natação com biblioteca de exercícios. Os exercícios e templates PADRÃO são dados estáticos no
-- app (src/data/natacao-*.ts); aqui ficam só os exercícios que o PERSONAL cria.
--
-- Ajustes em relação ao rascunho do pedido:
--   * ambiente aceita 'ambos' (o formulário de criação oferece Piscina | Mar | Ambos; o CHECK do
--     rascunho só deixava 'piscina' e 'mar' e o salvamento falharia);
--   * grupo tem CHECK nos 5 grupos da biblioteca;
--   * RLS no padrão do projeto: (SELECT auth.uid()) em USING e WITH CHECK (o rascunho não tinha
--     WITH CHECK, e FOR ALL sem ele deixaria inserir linha de outro personal) e GRANT só para authenticated.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS treino.exercicios_natacao_custom (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  descricao         TEXT NULL,
  ambiente          TEXT NOT NULL DEFAULT 'piscina' CHECK (ambiente IN ('piscina', 'mar', 'ambos')),
  grupo             TEXT NULL CHECK (grupo IN ('estilo', 'educativo', 'acessorio', 'serie', 'mar')),
  -- { "parametroPrincipal": "distancia" | "tempo", "valorSugerido": 400 }
  parametros_padrao JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercicios_natacao_custom_prof
  ON treino.exercicios_natacao_custom (professional_id, ambiente);

ALTER TABLE treino.exercicios_natacao_custom ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exercicios_natacao_own ON treino.exercicios_natacao_custom;
CREATE POLICY exercicios_natacao_own ON treino.exercicios_natacao_custom
  FOR ALL TO authenticated
  USING (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

REVOKE ALL ON treino.exercicios_natacao_custom FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON treino.exercicios_natacao_custom TO authenticated;
GRANT ALL ON treino.exercicios_natacao_custom TO service_role;

COMMIT;
