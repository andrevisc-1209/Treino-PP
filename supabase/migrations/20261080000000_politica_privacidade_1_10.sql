-- ============================================================
-- Migration: 20261080000000_politica_privacidade_1_10.sql
--
-- Política de Privacidade 1.10 (aprovada pelo jurídico): a seção 3 ganha o parágrafo "Origem do seu cadastro": ao criar a conta, o app guarda
-- junto ao cadastro de qual divulgação a pessoa veio (utm_source, utm_medium e utm_campaign do primeiro link), só em conta nova, para o painel
-- mostrar resultado somado por origem; base legal: legítimo interesse, com pedido de apagamento por e-mail. A frase do PostHog passa a dizer que
-- os dados de USO do PostHog não são ligados ao cadastro (a origem da campanha é a única informação de campanha que fica no cadastro).
-- O servidor só aceita versões listadas em treino.documentos_versoes (migration 20261050): sem esta linha o cadastro novo, que grava a versão
-- atual da política, seria recusado. As versões antigas continuam válidas (histórico de aceites).
-- ============================================================

BEGIN;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.10')
ON CONFLICT DO NOTHING;

COMMIT;
