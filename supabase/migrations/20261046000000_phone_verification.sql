-- ============================================================
-- Migration: 20261046000000_phone_verification.sql
--
-- Auditoria de segurança (revisão como invasor, item "WhatsApp para qualquer número"): o personal digita o próprio
-- telefone e liga whatsapp_opt_in; as notificações (e o botão de teste) saíam pela instância da plataforma para QUALQUER
-- número cadastrado, sem prova de posse. Agora o envio exige `phone_verified_at` (código de 6 dígitos enviado por
-- WhatsApp ao número e confirmado pelo dono).
--
--   1. professionals.phone_verified_at: preenchida só pela Edge Function confirmar-verificacao-phone (service_role).
--      NÃO entra no GRANT de UPDATE do cliente (migration 20261044 só libera name, cpf, phone, whatsapp_opt_in, uf, cidade, bairro).
--   2. Trigger: se o CLIENTE (authenticated/anon) mudar o telefone, a verificação é zerada. O app grava o telefone
--      direto em 3 fluxos (cadastro, completar perfil, Configurações), por isso o grant de `phone` foi mantido.
--   3. treino.phone_verification_codes: SEM policy e SEM grant ao cliente (só service_role). Se o personal pudesse ler
--      ou inserir linhas aqui, leria o código ou gravaria o próprio — e a verificação não valeria nada.
--      O código é guardado como hash (SHA-256 com o id da linha); `attempts` limita os palpites (5) por código.
-- Não desliga RLS de nada. Não altera whatsapp_opt_in (continua sendo a preferência do usuário; o envio exige as duas coisas).
-- Contas existentes ficam não verificadas (sem backfill): ninguém recebe aviso até verificar o telefone.
-- ============================================================

BEGIN;

ALTER TABLE treino.professionals ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS treino.phone_verification_codes (
  id              UUID PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL CHECK (char_length(phone) BETWEEN 10 AND 11),  -- dígitos nacionais (DDD + número), como em professionals.phone
  code_hash       TEXT NOT NULL CHECK (char_length(code_hash) = 64),
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ NULL,
  attempts        SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_prof ON treino.phone_verification_codes (professional_id, created_at DESC);

ALTER TABLE treino.phone_verification_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.phone_verification_codes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON treino.phone_verification_codes TO service_role;

CREATE OR REPLACE FUNCTION treino.resetar_verificacao_telefone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Só o cliente zera: service_role/SQL Editor (current_user diferente) podem corrigir dados sem perder a verificação.
  IF NEW.phone IS DISTINCT FROM OLD.phone AND current_user IN ('authenticated', 'anon') THEN
    NEW.phone_verified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_resetar_verificacao_telefone ON treino.professionals;
CREATE TRIGGER tg_resetar_verificacao_telefone
  BEFORE UPDATE ON treino.professionals
  FOR EACH ROW EXECUTE FUNCTION treino.resetar_verificacao_telefone();

COMMIT;
