-- ============================================================
-- Migration: 20261086000000_aluno_cpf_endereco.sql
--
-- Contrato do aluno: o personal gera uma minuta em PDF na ficha do aluno. Para vir preenchida, o cadastro do aluno ganha dois campos OPCIONAIS:
--   cpf      : só os 11 dígitos (a tela valida o dígito verificador e mostra a máscara);
--   endereco : texto livre, até 200 caracteres.
-- Não são dados de saúde. Herdam a segurança que a tabela alunos já tem (RLS por personal, aluno na lixeira escondido); o admin nunca os vê
-- (as funções admin_* só contam alunos) e eles não entram em relatórios, mensagens nem na exportação CSV.
-- Também registra a Política de Privacidade 1.11, que informa esse uso. O servidor só aceita versões listadas em treino.documentos_versoes
-- (migration 20261050); as versões antigas continuam válidas (histórico de aceites).
-- Reversão: ALTER TABLE treino.alunos DROP COLUMN cpf, DROP COLUMN endereco;
-- ============================================================

BEGIN;

ALTER TABLE treino.alunos
  ADD COLUMN cpf      TEXT NULL CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
  ADD COLUMN endereco TEXT NULL CHECK (endereco IS NULL OR char_length(endereco) <= 200);

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.11')
ON CONFLICT DO NOTHING;

COMMIT;
