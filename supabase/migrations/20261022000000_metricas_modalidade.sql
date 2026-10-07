-- ============================================================
-- Migration: 20261022000000_metricas_modalidade.sql
--
-- Treino multimodalidade — Fase 3: pulso rápido por aluno e feed de atividade.
--
-- O rascunho do pedido propunha uma MATERIALIZED VIEW (mv_performance_aluno) + função
-- historico_performance + Edge Function de refresh. Não foi usado, por três motivos:
--   1. Materialized view NÃO tem RLS: qualquer role com SELECT leria os números de TODOS os
--      personais/alunos. Para ser segura teria de ficar sem acesso do cliente e passar por
--      função SECURITY DEFINER — complexidade sem ganho nesta escala.
--   2. As consultas liam chaves que não existem no JSON gravado na Fase 2: o resultado fica em
--      detalhes_execucao->'resultado' (distancia_km, tiros_feitos…) e a musculação guarda
--      séries feitas/planejadas, não carga. As métricas foram para o app, em TypeScript testável,
--      lendo o formato real.
--   3. Volume por personal é pequeno: agregar sob demanda com RLS é barato; sem refresh nem "dados
--      desatualizados".
-- Resta só o que é melhor no banco: a última execução de cada aluno (para a lista de alunos).
-- SECURITY INVOKER (padrão): o RLS de execucoes_assincrono continua valendo — cada personal só vê os seus.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_execucoes_assincrono_profissional
  ON treino.execucoes_assincrono (professional_id, concluido_em DESC);

CREATE OR REPLACE FUNCTION treino.ultima_execucao_por_aluno()
RETURNS TABLE (aluno_id uuid, modalidade text, concluido_em timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT DISTINCT ON (e.aluno_id) e.aluno_id, e.modalidade::text, e.concluido_em
  FROM treino.execucoes_assincrono e
  WHERE e.status = 'concluido' AND e.concluido_em IS NOT NULL
  ORDER BY e.aluno_id, e.concluido_em DESC;
$$;

REVOKE ALL ON FUNCTION treino.ultima_execucao_por_aluno() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.ultima_execucao_por_aluno() TO authenticated;
