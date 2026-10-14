-- ============================================================
-- Migration: 20261032000000_exercicios_modalidade.sql
--
-- A biblioteca de exercícios passa a ter Modalidade > Tipo > Exercício:
--   modalidade         — musculacao (padrão, todos os existentes), corrida, ciclismo, brick…
--   tipo               — para musculação continua sendo muscle_group (não migrado, para não quebrar
--                        o que já lê essa coluna); nas demais guarda o tipo (ex.: 'intervalado-curto',
--                        'subidas', 'bike')
--   parametro_principal— 'distancia' | 'tempo' (só fora da musculação)
-- Natação NÃO usa esta tabela: continua em treino.exercicios_natacao_custom.
--
-- RLS e GRANTs não mudam: as policies exercicios_global_read / exercicios_own (USING e WITH CHECK
-- com (SELECT auth.uid())) já cobrem as colunas novas.
-- A unicidade de nome passa a ser por modalidade (o mesmo nome pode existir em modalidades diferentes).
-- Idempotente.
-- ============================================================

BEGIN;

ALTER TABLE treino.exercicios
  ADD COLUMN IF NOT EXISTS modalidade treino.modalidade_tipo NOT NULL DEFAULT 'musculacao',
  ADD COLUMN IF NOT EXISTS tipo TEXT NULL,
  ADD COLUMN IF NOT EXISTS parametro_principal TEXT NULL CHECK (parametro_principal IN ('distancia', 'tempo'));

DROP INDEX IF EXISTS treino.uq_exercicios_global_name;
DROP INDEX IF EXISTS treino.uq_exercicios_prof_name;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercicios_global_mod_name
  ON treino.exercicios (modalidade, lower(name)) WHERE professional_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercicios_prof_mod_name
  ON treino.exercicios (professional_id, modalidade, lower(name)) WHERE professional_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercicios_modalidade ON treino.exercicios (modalidade);

COMMIT;
