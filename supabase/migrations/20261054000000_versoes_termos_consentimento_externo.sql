-- ============================================================
-- Migration: 20261054000000_versoes_termos_consentimento_externo.sql
--
-- Novas versões dos textos legais (docs/BACKLOG.md #37): os Termos de Uso (1.2) e a Política de Privacidade (1.5) passam a
-- prever o consentimento do aluno colhido fora da plataforma (termo em papel), com a prova sob responsabilidade do personal.
-- O servidor só aceita versões listadas em treino.documentos_versoes (migration 20261050): sem esta linha o cadastro com
-- a versão nova seria recusado. As versões antigas continuam válidas (histórico de aceites).
-- ============================================================

BEGIN;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('termos', '1.2'),
  ('privacidade', '1.5')
ON CONFLICT DO NOTHING;

COMMIT;
