-- ============================================================
-- Migration: 20261076000000_termos_1_6.sql
--
-- Termos de Uso 1.6 (aprovada pelo jurídico, docs/TERMOS-SUGESTOES.md): 1.4 (a plataforma não intermedeia pagamentos entre personal e aluno),
-- 2.9 (uso aceitável e suspensão), 3.7 (mensagens aos alunos), 3.8 (link do treino à distância), 3.9 (lixeira de 30 dias) e seção 9 (canais de suporte).
-- O servidor só aceita versões listadas em treino.documentos_versoes (migration 20261050): sem esta linha o cadastro novo, que grava a
-- versão atual dos Termos, seria recusado. As versões antigas continuam válidas (histórico de aceites).
-- ============================================================

BEGIN;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES ('termos', '1.6') ON CONFLICT DO NOTHING;

COMMIT;
