-- ============================================================
-- Migration: 20261034000000_professional_bairro.sql
--
-- Bairro do personal (cadastro com CEP). Nullable: quem já tem conta não tem o dado e não há
-- preenchimento retroativo; cidade e uf continuam como estão (20261011…), nada é apagado.
-- Estende handle_new_user() (versão atual: 20261011000000) pra gravar o bairro vindo do
-- metadata do signUp.
-- ============================================================

BEGIN;

ALTER TABLE treino.professionals
  ADD COLUMN IF NOT EXISTS bairro TEXT NULL CHECK (char_length(bairro) BETWEEN 1 AND 120);

CREATE OR REPLACE FUNCTION treino.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO treino.professionals (id, name, email, phone, cpf, whatsapp_opt_in, uf, cidade, bairro)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cpf',
    COALESCE((NEW.raw_user_meta_data->>'whatsapp_opt_in')::boolean, false),
    NULLIF(UPPER(NEW.raw_user_meta_data->>'uf'), ''),
    NULLIF(NEW.raw_user_meta_data->>'cidade', ''),
    NULLIF(LEFT(BTRIM(COALESCE(NEW.raw_user_meta_data->>'bairro', '')), 120), '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.raw_user_meta_data ? 'termos_versao' THEN
    INSERT INTO treino.aceites_termos (professional_id, termos_versao, privacidade_versao)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'termos_versao', NEW.raw_user_meta_data->>'privacidade_versao');
  END IF;

  INSERT INTO treino.assinaturas (professional_id, status)
  VALUES (NEW.id, 'trial')
  ON CONFLICT (professional_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMIT;
