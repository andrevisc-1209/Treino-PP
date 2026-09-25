-- ============================================================
-- Migration: 20260929000000_cobranca_valor_positivo.sql
--
-- Impede cobrança ativa com valor zerado/nulo. Antes de criar o
-- CHECK, corrige linhas existentes que ficaram com "R$ 0" (bug do
-- formulário aceitando valor vazio como 0): desativa a cobrança e
-- limpa o valor, já que "R$ 0" nunca foi uma cobrança válida.
-- ============================================================

BEGIN;

UPDATE treino.aluno_cobranca
SET valor_aula = NULL, ativo = false
WHERE modelo = 'por_aula' AND ativo AND (valor_aula IS NULL OR valor_aula <= 0);

UPDATE treino.aluno_cobranca
SET valor_mensal = NULL, ativo = false
WHERE modelo = 'mensal' AND ativo AND (valor_mensal IS NULL OR valor_mensal <= 0);

ALTER TABLE treino.aluno_cobranca
  ADD CONSTRAINT aluno_cobranca_valor_positivo CHECK (
    NOT ativo OR (
      (modelo = 'por_aula' AND valor_aula > 0) OR
      (modelo = 'mensal' AND valor_mensal > 0)
    )
  );

COMMIT;
