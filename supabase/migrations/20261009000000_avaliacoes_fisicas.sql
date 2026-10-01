-- ============================================================
-- Migration: 20261009000000_avaliacoes_fisicas.sql
--
-- "Avaliação física" (peso + % gordura + medidas) estende o registro de
-- peso que já existe (treino.pesos), em vez de criar uma tabela nova
-- (treino.avaliacoes) separada. Motivo: treino.pesos já tem UI própria na
-- ficha do aluno (registrar peso, histórico) e já alimenta o gráfico
-- "Peso corporal" da aba Evolução — uma tabela nova duplicaria o dado
-- (peso existiria em dois lugares, com históricos/gráficos desencontrados).
-- Decisão conversada com o André antes de implementar.
--
-- Altura não entra aqui: já existe treino.alunos.height_cm (definida uma
-- vez no cadastro) — o pedido original queria repetir altura em cada
-- avaliação, mas isso já é coberto pelo campo existente.
-- ============================================================

BEGIN;

ALTER TABLE treino.pesos
  ADD COLUMN IF NOT EXISTS gordura_pct  NUMERIC(4,1) NULL CHECK (gordura_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS cintura_cm   NUMERIC(5,1) NULL CHECK (cintura_cm > 0),
  ADD COLUMN IF NOT EXISTS quadril_cm   NUMERIC(5,1) NULL CHECK (quadril_cm > 0),
  ADD COLUMN IF NOT EXISTS peito_cm     NUMERIC(5,1) NULL CHECK (peito_cm > 0),
  ADD COLUMN IF NOT EXISTS braco_dir_cm NUMERIC(5,1) NULL CHECK (braco_dir_cm > 0),
  ADD COLUMN IF NOT EXISTS coxa_dir_cm  NUMERIC(5,1) NULL CHECK (coxa_dir_cm > 0);

-- Sem mudança de RLS: a policy pesos_own já existente é por linha, cobre
-- as colunas novas automaticamente.

COMMIT;
