-- ============================================================
-- Cupom de parceiro nos documentos legais (texto aprovado pelo jurídico em 18/11/2026)
--
--   * Termos de Uso 1.8: nova cláusula 2.10 (cupons de parceiros: dias grátis conforme a campanha, uma vez por conta, soma ao acesso,
--     plano pago começa depois dos dias grátis, recusa/cancelamento por abuso). As cláusulas existentes não foram renumeradas.
--   * Política de Privacidade 1.18: cupom de parceiro na lista de dados (2.1), parágrafo na seção 3 (campanha usada, data e dias; tentativas de
--     código errado por 1 dia) e retenção na seção 5.1 (enquanto a conta existir; apagado junto com ela).
-- IMPORTANTE: rodar esta migration ANTES de publicar o app com as versões novas. O servidor só aceita cadastro com a versão listada em
-- treino.documentos_versoes; sem estas linhas o cadastro novo é recusado.
-- Reversão: DELETE FROM treino.documentos_versoes WHERE (tipo, versao) IN (('termos', '1.8'), ('privacidade', '1.18')); (só se ninguém aceitou ainda).
-- ============================================================

BEGIN;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('termos', '1.8'),
  ('privacidade', '1.18')
ON CONFLICT DO NOTHING;

COMMIT;
