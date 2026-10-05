-- ============================================================
-- Migration: 20261011000000_professional_uf_cidade.sql
--
-- Cidade e UF do personal (cadastro). Obrigatórios NO APP; no banco ficam
-- NULL-áveis porque (a) quem já tem conta não tem o dado e (b) o login social
-- cria a linha em professionals via trigger antes de o formulário de perfil
-- ser preenchido. Estende handle_new_user() (versão atual: 20261004000000)
-- pra gravar uf/cidade vindos do metadata do signUp.
--
-- Antes só existia professional_config.pix_cidade (cidade do recebedor do Pix,
-- sem UF) — não é a região do personal e continua separado.
-- ============================================================

BEGIN;

ALTER TABLE treino.professionals
  ADD COLUMN IF NOT EXISTS uf     TEXT NULL
    CHECK (uf IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  ADD COLUMN IF NOT EXISTS cidade TEXT NULL CHECK (char_length(cidade) BETWEEN 1 AND 120);

CREATE OR REPLACE FUNCTION treino.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO treino.professionals (id, name, email, phone, cpf, whatsapp_opt_in, uf, cidade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cpf',
    COALESCE((NEW.raw_user_meta_data->>'whatsapp_opt_in')::boolean, false),
    NULLIF(UPPER(NEW.raw_user_meta_data->>'uf'), ''),
    NULLIF(NEW.raw_user_meta_data->>'cidade', '')
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
