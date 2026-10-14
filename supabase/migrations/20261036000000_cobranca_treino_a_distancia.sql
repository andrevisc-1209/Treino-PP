-- ============================================================
-- Migration: 20261036000000_cobranca_treino_a_distancia.sql
--
-- Cobrança de treino à distância (o aluno faz pelo link). Por aluno, no modelo "por aula":
--   aluno_cobranca.cobrar_distancia — liga/desliga (padrão: desligado)
--   aluno_cobranca.valor_distancia  — valor definido pelo personal (pode ser diferente do da aula)
-- No modelo mensal nada é cobrado por treino: o relatório só mostra as quantidades.
--
-- Quando o aluno conclui o treino pelo link e a opção está ligada, a Edge Function treino-publico cria um item de
-- cobrança igual ao de uma aula realizada (treino.aulas + aula_participantes presente/cobrar), marcado como à distância:
--   aulas.tipo               'presencial' (padrão) | 'distancia'
--   aula_participantes.execucao_id — de qual execução veio (e impede cobrar a mesma execução duas vezes)
-- O item aparece em "Itens do ciclo" para o personal desmarcar na revisão. Idempotente.
-- ============================================================

BEGIN;

ALTER TABLE treino.aluno_cobranca
  ADD COLUMN IF NOT EXISTS cobrar_distancia BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_distancia  NUMERIC(10,2) NULL CHECK (valor_distancia >= 0);

ALTER TABLE treino.aluno_cobranca DROP CONSTRAINT IF EXISTS aluno_cobranca_distancia_valor_check;
ALTER TABLE treino.aluno_cobranca
  ADD CONSTRAINT aluno_cobranca_distancia_valor_check CHECK (NOT cobrar_distancia OR valor_distancia IS NOT NULL);

ALTER TABLE treino.aulas
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'presencial' CHECK (tipo IN ('presencial', 'distancia'));

ALTER TABLE treino.aula_participantes
  ADD COLUMN IF NOT EXISTS execucao_id UUID NULL REFERENCES treino.execucoes_assincrono(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_participante_execucao
  ON treino.aula_participantes (execucao_id) WHERE execucao_id IS NOT NULL;

-- RLS e GRANTs não mudam: as policies existentes (por professional_id) já cobrem as colunas novas.

COMMIT;
