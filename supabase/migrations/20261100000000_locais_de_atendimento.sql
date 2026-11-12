-- ============================================================
-- Locais de atendimento do personal (até 5): "2 academias" em vez de um texto só
--
--   * professional_config.locais_atendimento: lista JSONB de { nome, endereco, mapsLink } (máx. 5), escolhida pelo PRÓPRIO personal na busca
--     do Google Places. Serve para (a) mostrar "Onde você atende" na página pública e (b) atalhos ao marcar aulas.
--   * Na página pública aparece SÓ O NOME do local (ex.: "Smart Fit Laranjeiras"), nunca o endereço completo: o app grava em
--     pagina_locais (até 100 caracteres, que a página já exibe) o resumo dos nomes. O endereço fica só com o personal.
--   * Sem dado novo de aluno ou de visitante. Dado do próprio personal, apagado com a conta (a linha some na exclusão).
-- Reversão: ALTER TABLE treino.professional_config DROP COLUMN locais_atendimento;
-- ============================================================

BEGIN;

ALTER TABLE treino.professional_config
  ADD COLUMN locais_atendimento JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (
    jsonb_typeof(locais_atendimento) = 'array'
    AND jsonb_array_length(locais_atendimento) <= 5
    AND char_length(locais_atendimento::text) <= 3000
  );

COMMIT;
