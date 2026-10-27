-- ============================================================
-- Migration: 20261068000000_politica_privacidade_1_7.sql
--
-- Política de Privacidade 1.7: a seção 3 (análise de uso, PostHog) passa a cobrir também as telas de cadastro e de primeiro uso
-- do app (quatro eventos sem conteúdo: abrir o cadastro, enviar o cadastro, concluir o perfil, cadastrar um aluno), sempre com
-- consentimento, sem identificar a pessoa, sem dado de aluno nem de saúde. A revogação ganha o caminho Configurações > "Preferências
-- de cookies". O servidor só aceita versões listadas em treino.documentos_versoes (migration 20261050): sem esta linha o cadastro
-- novo, que grava a versão atual da política, seria recusado. As versões antigas continuam válidas (histórico de aceites).
-- ============================================================

BEGIN;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.7')
ON CONFLICT DO NOTHING;

COMMIT;
