-- ============================================================
-- Migration: 20261075000000_termos_1_5.sql
--
-- Termos de Uso 1.5: nova cláusula 3.5 (importação de alunos por planilha: o Personal Trainer declara base legal, só dados básicos,
-- sem listas de terceiros), 3.6 (exportação de alunos: o arquivo baixado é responsabilidade dele) e dois alinhamentos com o produto:
-- 2.5 (fim do período = modo de consulta, não "acesso suspenso") e 3.2 (a prova de aceite do aluno some junto com a conta, como diz a Política).
-- O servidor só aceita versões listadas em treino.documentos_versoes (migration 20261050): sem esta linha o cadastro novo, que grava a
-- versão atual dos Termos, seria recusado. As versões antigas continuam válidas (histórico de aceites).
-- ============================================================

BEGIN;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES ('termos', '1.5') ON CONFLICT DO NOTHING;

COMMIT;
