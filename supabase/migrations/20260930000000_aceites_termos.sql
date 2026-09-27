-- ============================================================
-- Migration: 20260930000000_aceites_termos.sql
--
-- Registro do aceite dos Termos de Uso + Política de Privacidade no
-- cadastro (agora aberto). Guarda a versão de cada documento e quando
-- foi aceito — histórico, nunca editado nem apagado pelo profissional.
-- ============================================================

BEGIN;

CREATE TABLE treino.aceites_termos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id     UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  termos_versao       TEXT NOT NULL,
  privacidade_versao  TEXT NOT NULL,
  aceito_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aceites_termos_professional ON treino.aceites_termos(professional_id);

-- ----- GRANTS -----
GRANT SELECT, INSERT ON treino.aceites_termos TO authenticated;

-- ----- RLS -----
ALTER TABLE treino.aceites_termos ENABLE ROW LEVEL SECURITY;

-- Só leitura e criação do próprio aceite — é um registro histórico,
-- não tem update nem delete.
CREATE POLICY aceites_termos_self_read ON treino.aceites_termos
  FOR SELECT TO authenticated
  USING (professional_id = (SELECT auth.uid()));

CREATE POLICY aceites_termos_self_insert ON treino.aceites_termos
  FOR INSERT TO authenticated
  WITH CHECK (professional_id = (SELECT auth.uid()));

-- ----- TRIGGER: registra o aceite junto com a criação do professional -----
-- O cadastro aberto manda a versão aceita em raw_user_meta_data (metadata do
-- signUp), lida aqui mesmo no INSERT de auth.users — funciona mesmo se o
-- projeto exigir confirmação de e-mail (o trigger roda no signUp, antes da
-- confirmação, não depende do primeiro login).
CREATE OR REPLACE FUNCTION treino.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO treino.professionals (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  IF NEW.raw_user_meta_data ? 'termos_versao' THEN
    INSERT INTO treino.aceites_termos (professional_id, termos_versao, privacidade_versao)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'termos_versao', NEW.raw_user_meta_data->>'privacidade_versao');
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
