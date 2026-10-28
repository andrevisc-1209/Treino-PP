-- ============================================================
-- Migration: 20261077000000_termos_1_7.sql
--
-- Termos de Uso 1.7 (aprovada pelo jurídico): a cláusula 3.5 passa a dizer que o Personal Trainer que usa uma ferramenta de inteligência
-- artificial ou outro serviço de terceiros para preparar a planilha de alunos responde por esse envio e só pode mandar dados básicos
-- (nunca saúde, CPF ou senhas). Acompanha o prompt para IA da tela de importação.
-- O servidor só aceita versões listadas em treino.documentos_versoes (migration 20261050): sem esta linha o cadastro novo, que grava a
-- versão atual dos Termos, seria recusado. As versões antigas continuam válidas (histórico de aceites).
-- ============================================================

BEGIN;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES ('termos', '1.7') ON CONFLICT DO NOTHING;

COMMIT;
