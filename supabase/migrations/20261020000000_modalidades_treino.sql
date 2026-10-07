-- ============================================================
-- Migration: 20261020000000_modalidades_treino.sql
--
-- Treino multimodalidade — Fase 1: modalidade, execução presencial/assíncrona e
-- detalhes específicos de cada modalidade (corrida, natação, ciclismo…).
--
-- No app, o "treino" do aluno é a tabela treino.planos (não existe treino.treinos).
-- As colunas novas valem para o plano; RLS/grants da tabela não mudam (as policies
-- existentes são por linha e cobrem as colunas novas). Planos que já existem viram
-- 'musculacao' + 'sincrono', exatamente o comportamento de hoje.
--
-- modalidade_detalhes (jsonb), exemplos:
--   corrida:  { "distancia_km": 5, "pace_alvo": "5:30", "terreno": "asfalto" }
--   natacao:  { "distancia_m": 1000, "estilo": "crawl", "tiros": 10, "intervalo_seg": 30 }
--   funcional:{ "rounds": 5, "duracao_min": 40, "descanso_seg": 60 }
--   ciclismo: { "distancia_km": 30, "desnivel_m": 500, "cadencia_alvo": 80 }
--   musculacao: {} (usa plano_exercicios)
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'treino' AND t.typname = 'modalidade_tipo'
  ) THEN
    CREATE TYPE treino.modalidade_tipo AS ENUM (
      'musculacao', 'corrida', 'natacao', 'ciclismo', 'funcional', 'futebol',
      'futevolei', 'pilates', 'yoga', 'boxe', 'escalada', 'remo'
    );
  END IF;
END
$$;

ALTER TABLE treino.planos
  ADD COLUMN IF NOT EXISTS modalidade treino.modalidade_tipo NOT NULL DEFAULT 'musculacao',
  ADD COLUMN IF NOT EXISTS tipo_execucao TEXT NOT NULL DEFAULT 'sincrono' CHECK (tipo_execucao IN ('sincrono', 'assincrono')),
  ADD COLUMN IF NOT EXISTS modalidade_detalhes JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_planos_modalidade ON treino.planos (modalidade);
CREATE INDEX IF NOT EXISTS idx_planos_tipo_execucao ON treino.planos (tipo_execucao);

COMMIT;
