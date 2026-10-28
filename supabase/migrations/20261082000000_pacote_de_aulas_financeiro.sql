-- ============================================================
-- Migration: 20261082000000_pacote_de_aulas_financeiro.sql
--
-- Pacote de aulas, parte 2 (cobrança no Financeiro):
--   * treino.faturas.modelo passa a aceitar 'pacote': a venda do pacote vira uma fatura (aberta ou já paga), então entra nos
--     cards, filtros e no recebido do mês do Financeiro sem tela nova. Ao encerrar/renovar o pacote, as presenças dele são
--     ligadas a essa fatura (aula_participantes.fatura_id) e o relatório da fatura lista as aulas.
--   * treino.aluno_pacotes.fatura_id: a fatura da venda daquele pacote.
-- Não mexe nas migrations anteriores: troca a CHECK do modelo e recria a policy do pacote com o novo vínculo.
-- ============================================================

BEGIN;

DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'treino.faturas'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%modelo%'
  LOOP
    EXECUTE format('ALTER TABLE treino.faturas DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE treino.faturas
  ADD CONSTRAINT faturas_modelo_check CHECK (modelo IN ('por_aula', 'mensal', 'pacote'));

ALTER TABLE treino.aluno_pacotes
  ADD COLUMN fatura_id UUID NULL REFERENCES treino.faturas(id) ON DELETE SET NULL;

CREATE INDEX idx_aluno_pacotes_fatura ON treino.aluno_pacotes(fatura_id) WHERE fatura_id IS NOT NULL;

DROP POLICY IF EXISTS aluno_pacotes_own ON treino.aluno_pacotes;
CREATE POLICY aluno_pacotes_own ON treino.aluno_pacotes
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND aluno_id IN (SELECT a.id FROM treino.alunos a)
              AND (fatura_id IS NULL OR fatura_id IN (SELECT f.id FROM treino.faturas f)));

COMMIT;
