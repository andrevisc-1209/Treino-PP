-- ============================================================
-- O visitante escolhe o LOCAL e a MODALIDADE ao pedir a aula + Política de Privacidade 1.17
--
--   * professional_config.modalidades_atendimento: as modalidades que o personal atende (subconjunto das 5 ativas do app:
--     musculacao, corrida, natacao, ciclismo, brick), escolhidas por ele. A página pública mostra os nomes e o visitante escolhe uma.
--   * pedidos_agenda.local_escolhido / pedidos_agenda.modalidade: o que o visitante escolheu no pedido. O local é o NOME de um dos
--     locais do personal (só nome, nunca endereço); a modalidade é uma das 5 chaves. Não são dados de saúde.
--   * Quem grava continua sendo a Edge Function "agenda-publica" (service_role), que confere se o local e a modalidade pertencem ao personal.
--   * Política 1.17: o visitante também informa o local e a modalidade da aula (mesmos prazos: apagados em até 30 dias se o pedido não vira aula).
-- Reversão: ALTER TABLE treino.pedidos_agenda DROP COLUMN local_escolhido, DROP COLUMN modalidade;
--           ALTER TABLE treino.professional_config DROP COLUMN modalidades_atendimento;
-- ============================================================

BEGIN;

ALTER TABLE treino.professional_config
  ADD COLUMN modalidades_atendimento TEXT[] NOT NULL DEFAULT '{}'
  CHECK (
    cardinality(modalidades_atendimento) <= 5
    AND modalidades_atendimento <@ ARRAY['musculacao', 'corrida', 'natacao', 'ciclismo', 'brick']::TEXT[]
  );

ALTER TABLE treino.pedidos_agenda
  ADD COLUMN local_escolhido TEXT NULL CHECK (local_escolhido IS NULL OR char_length(local_escolhido) BETWEEN 1 AND 80),
  ADD COLUMN modalidade      TEXT NULL CHECK (modalidade IS NULL OR modalidade IN ('musculacao', 'corrida', 'natacao', 'ciclismo', 'brick'));

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.17')
ON CONFLICT DO NOTHING;

COMMIT;
