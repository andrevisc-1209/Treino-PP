-- ============================================================
-- Migration: 20261004000000_assinaturas.sql
--
-- Trial de 15 dias + assinatura (mensal/trimestral/semestral). O
-- pagamento em si (Mercado Pago) fica pra depois — aqui só o trial
-- automático no cadastro e a estrutura pra guardar o status.
--
-- NOTA: treino.assinaturas já existia no banco antes desta migration
-- (criada fora do histórico de migrations, com o RLS inseguro do
-- rascunho original — policy "assinaturas_own" em FOR ALL, que deixava
-- qualquer profissional logado se auto-declarar "ativa" via PATCH na
-- REST API). Por isso esta migration usa ALTER em vez de CREATE TABLE:
-- corrige o que já está lá (RLS, grants, coluna, constraints) em vez
-- de tentar criar de novo.
-- ============================================================

BEGIN;

-- ----- RLS: remove a policy insegura (FOR ALL) -----
DROP POLICY IF EXISTS assinaturas_own ON treino.assinaturas;

CREATE POLICY assinaturas_self_read ON treino.assinaturas
  FOR SELECT TO authenticated
  USING (professional_id = (SELECT auth.uid()));

-- ----- GRANTS: revoga a escrita que o default privilege do schema deu
-- de graça pra authenticated (INSERT/UPDATE/DELETE/TRUNCATE), deixa só
-- SELECT -----
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON treino.assinaturas FROM authenticated;

-- Propositalmente SEM policy nem grant de escrita pra authenticated: o
-- professional só LÊ o próprio status. A única escrita é o trigger abaixo
-- (SECURITY DEFINER, roda como dono da tabela, ignora RLS/grants). Quando a
-- integração com o Mercado Pago entrar, a confirmação de pagamento também
-- deve ser uma function/Edge Function SECURITY DEFINER (webhook), nunca um
-- UPDATE vindo do client.

-- ----- Coluna e constraints: alinha com o resto do schema -----
ALTER TABLE treino.assinaturas RENAME COLUMN criado_em TO created_at;

-- Backfill defensivo antes de exigir NOT NULL (não deveria ter linha
-- nenhuma ainda, mas por garantia).
UPDATE treino.assinaturas SET trial_inicio = created_at WHERE trial_inicio IS NULL;
UPDATE treino.assinaturas SET trial_fim = created_at + INTERVAL '15 days' WHERE trial_fim IS NULL;

ALTER TABLE treino.assinaturas
  ALTER COLUMN professional_id SET NOT NULL,
  ALTER COLUMN trial_inicio SET NOT NULL,
  ALTER COLUMN trial_inicio SET DEFAULT now(),
  ALTER COLUMN trial_fim SET NOT NULL,
  ALTER COLUMN trial_fim SET DEFAULT now() + INTERVAL '15 days';

-- FK apontava pra auth.users(id) direto; troca pra treino.professionals(id)
-- pra seguir o mesmo padrão do resto do schema (professionals.id = auth.uid(),
-- então não muda nenhum dado — só o alvo da referência).
ALTER TABLE treino.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_professional_id_fkey;
ALTER TABLE treino.assinaturas
  ADD CONSTRAINT assinaturas_professional_id_fkey
  FOREIGN KEY (professional_id) REFERENCES treino.professionals(id) ON DELETE CASCADE;

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
