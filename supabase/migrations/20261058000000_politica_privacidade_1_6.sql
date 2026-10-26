-- ============================================================
-- Migration: 20261058000000_politica_privacidade_1_6.sql
--
-- Política de Privacidade 1.6: a seção 3 (análise de uso da página inicial, PostHog) passa a descrever o que a landing nova
-- realmente coleta (visitas, cliques nos botões, seções vistas, origem/UTM, aparelho/navegador, localização aproximada pelo IP;
-- identificador em localStorage, sem cookies; sem gravação de sessão) e a revogação por "Preferências de cookies".
-- O servidor só aceita versões listadas em treino.documentos_versoes (migration 20261050): sem esta linha o cadastro novo,
-- que grava a versão atual da política, seria recusado. As versões antigas continuam válidas (histórico de aceites).
-- ============================================================

BEGIN;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.6')
ON CONFLICT DO NOTHING;

COMMIT;
