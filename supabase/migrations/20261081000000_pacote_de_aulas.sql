-- ============================================================
-- Migration: 20261081000000_pacote_de_aulas.sql
--
-- Pacote de aulas: o aluno compra N aulas por um valor fechado, com um prazo para usar. Cada pacote é uma linha em
-- treino.aluno_pacotes (o histórico fica guardado); só pode haver UM pacote ativo por aluno.
--   * qtd_aulas / valor / validade_dias: o que foi vendido (editáveis pelo personal).
--   * inicio: dia em que o pacote começa a contar (padrão: hoje).
--   * aulas_anteriores: aulas que o personal já considera feitas (ex.: "esta é a 2/10" → 1), somadas às presenças do app.
--   * status: 'ativo' | 'encerrado'.
-- O aluno de pacote NÃO usa treino.aluno_cobranca (por aula/mensal) — assim ele não entra no fechamento de ciclo nem nos avisos de ciclo.
-- Segue o padrão das outras tabelas: RLS com (SELECT auth.uid()), USING e WITH CHECK, GRANT só para authenticated (sem DELETE),
-- escrita bloqueada sem assinatura ativa e linhas do aluno na lixeira escondidas.
-- ============================================================

BEGIN;

CREATE TABLE treino.aluno_pacotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  aluno_id          UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  qtd_aulas         INTEGER NOT NULL CHECK (qtd_aulas BETWEEN 1 AND 500),
  valor             NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  validade_dias     INTEGER NOT NULL CHECK (validade_dias BETWEEN 1 AND 730),
  inicio            DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  aulas_anteriores  INTEGER NOT NULL DEFAULT 0 CHECK (aulas_anteriores >= 0),
  status            TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado')),
  encerrado_em      TIMESTAMPTZ NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aluno_pacotes_anteriores_dentro CHECK (aulas_anteriores <= qtd_aulas),
  CONSTRAINT aluno_pacotes_encerrado_coerente CHECK ((status = 'encerrado') = (encerrado_em IS NOT NULL))
);

-- um pacote ativo por aluno
CREATE UNIQUE INDEX uq_aluno_pacote_ativo ON treino.aluno_pacotes(aluno_id) WHERE status = 'ativo';
CREATE INDEX idx_aluno_pacotes_prof ON treino.aluno_pacotes(professional_id, status);

CREATE TRIGGER trg_aluno_pacotes_updated_at BEFORE UPDATE ON treino.aluno_pacotes
  FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON treino.aluno_pacotes TO authenticated;

ALTER TABLE treino.aluno_pacotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY aluno_pacotes_own ON treino.aluno_pacotes
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND aluno_id IN (SELECT a.id FROM treino.alunos a));

-- sem assinatura ativa não grava (mesmo padrão das demais tabelas; ler continua liberado)
CREATE POLICY assinatura_ativa_insert ON treino.aluno_pacotes
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT treino.assinatura_ativa()));
CREATE POLICY assinatura_ativa_update ON treino.aluno_pacotes
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true) WITH CHECK ((SELECT treino.assinatura_ativa()));

-- aluno na lixeira some da leitura do app
CREATE POLICY lixeira_esconde ON treino.aluno_pacotes
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT EXISTS (SELECT 1 FROM treino.alunos a WHERE a.id = aluno_pacotes.aluno_id AND a.apagado_em IS NOT NULL));

COMMIT;
