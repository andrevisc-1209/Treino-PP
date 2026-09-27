-- ============================================================
-- Migration: 20261001000000_perfil_personal.sql
--
-- Cadastro do personal fica mais completo: CPF e preferência de
-- notificação por WhatsApp, capturados no signUp (metadata) e também
-- editáveis depois em Configurações. Estende o trigger handle_new_user
-- pra gravar esses campos junto com o resto (nome, aceite de termos).
-- ============================================================

BEGIN;

ALTER TABLE treino.professionals
  ADD COLUMN cpf TEXT NULL,
  ADD COLUMN whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION treino.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO treino.professionals (id, name, email, phone, cpf, whatsapp_opt_in)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cpf',
    COALESCE((NEW.raw_user_meta_data->>'whatsapp_opt_in')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.raw_user_meta_data ? 'termos_versao' THEN
    INSERT INTO treino.aceites_termos (professional_id, termos_versao, privacidade_versao)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'termos_versao', NEW.raw_user_meta_data->>'privacidade_versao');
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
