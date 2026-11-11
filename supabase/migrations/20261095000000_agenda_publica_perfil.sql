-- ============================================================
-- Migration: 20261095000000_agenda_publica_perfil.sql
--
-- Agenda, página pública: perfil profissional opcional, para quem chega pelo link saber com quem fala (CREF, modalidades, onde atende e,
-- se o personal quiser, o valor "a partir de"). Tudo é digitado pelo PRÓPRIO personal e só aparece na página pública quando ele preenche;
-- campo vazio não aparece. Nada vem de dado de aluno.
--   professional_config.pagina_cref         : CREF (até 30 caracteres);
--   professional_config.pagina_modalidades  : ex.: "Musculação · Natação" (até 80);
--   professional_config.pagina_locais       : ex.: "Laranjeiras · Catete" (até 100);
--   professional_config.pagina_preco_aula   : valor "a partir de" por aula, em reais (entre 1 e 5.000).
-- Também registra a Política de Privacidade 1.15 em treino.documentos_versoes.
-- Reversão: ALTER TABLE treino.professional_config DROP COLUMN pagina_cref, DROP COLUMN pagina_modalidades,
--             DROP COLUMN pagina_locais, DROP COLUMN pagina_preco_aula;
-- ============================================================

BEGIN;

ALTER TABLE treino.professional_config
  ADD COLUMN pagina_cref        TEXT NULL CHECK (pagina_cref IS NULL OR char_length(pagina_cref) <= 30),
  ADD COLUMN pagina_modalidades TEXT NULL CHECK (pagina_modalidades IS NULL OR char_length(pagina_modalidades) <= 80),
  ADD COLUMN pagina_locais      TEXT NULL CHECK (pagina_locais IS NULL OR char_length(pagina_locais) <= 100),
  ADD COLUMN pagina_preco_aula  NUMERIC(8,2) NULL CHECK (pagina_preco_aula IS NULL OR (pagina_preco_aula >= 1 AND pagina_preco_aula <= 5000));

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.15')
ON CONFLICT DO NOTHING;

COMMIT;
