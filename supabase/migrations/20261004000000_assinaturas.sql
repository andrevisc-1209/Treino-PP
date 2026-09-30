-- ============================================================
-- Migration: 20261004000000_assinaturas.sql
--
-- Trial de 15 dias + assinatura (mensal/trimestral/semestral). O
-- pagamento em si (Mercado Pago) fica pra depois — aqui só o trial
-- automático no cadastro e a estrutura pra guardar o status.
-- ============================================================

BEGIN;

CREATE TABLE treino.assinaturas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id     UUID NOT NULL UNIQUE REFERENCES treino.professionals(id) ON DELETE CASCADE,
  status              TEXT NOT NULL CHECK (status IN ('trial', 'ativa', 'expirada', 'cancelada')),
  plano               TEXT CHECK (plano IN ('mensal', 'trimestral', 'semestral')),
  trial_inicio        TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_fim           TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '15 days',
  assinatura_inicio   TIMESTAMPTZ NULL,
  assinatura_fim      TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- GRANTS -----
-- Só SELECT pro professional — ver nota de segurança abaixo.
GRANT SELECT ON treino.assinaturas TO authenticated;

-- ----- RLS -----
ALTER TABLE treino.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY assinaturas_self_read ON treino.assinaturas
  FOR SELECT TO authenticated
  USING (professional_id = (SELECT auth.uid()));

-- Propositalmente SEM policy de INSERT/UPDATE/DELETE pra authenticated: o
-- professional só LÊ o próprio status. Se déssemos FOR ALL (como o rascunho
-- original pedia), qualquer pessoa logada poderia dar PATCH direto na REST
-- API e setar status = 'ativa' nela mesma, sem pagar nada. A única escrita
-- hoje é o trial automático (trigger abaixo, SECURITY DEFINER, roda como
-- dono da tabela, ignora RLS). Quando a integração com o Mercado Pago entrar,
-- a confirmação de pagamento também deve ser uma function/Edge Function
-- SECURITY DEFINER (webhook), nunca um UPDATE vindo do client.

-- ----- TRIGGER: cria o trial junto com o professional no cadastro -----
-- Estende o handle_new_user() já existente (mesma função usada pra criar o
-- professional e registrar o aceite dos termos) em vez de um trigger
-- separado, pra tudo continuar acontecendo numa única transação no signUp.
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

  INSERT INTO treino.assinaturas (professional_id, status)
  VALUES (NEW.id, 'trial')
  ON CONFLICT (professional_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: quem já tinha conta antes desta migration também ganha o trial,
-- contado a partir de agora (não tem como saber quando cada um "logou pela
-- primeira vez" de verdade).
INSERT INTO treino.assinaturas (professional_id, status)
SELECT id, 'trial' FROM treino.professionals
ON CONFLICT (professional_id) DO NOTHING;

COMMIT;
