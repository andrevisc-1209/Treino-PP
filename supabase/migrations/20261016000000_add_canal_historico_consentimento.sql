-- ============================================================
-- Migration: 20261016000000_add_canal_historico_consentimento.sql
--
-- Painel de consentimentos LGPD de saúde:
--   1. canal do envio (e-mail/WhatsApp) gravado no token;
--   2. histórico de envios (primeiro envio e reenvios) em consentimento_reenvios;
--   3. função que alimenta a listagem do painel (um registro por aluno, com o envio mais recente).
--
-- Ajustes em relação ao rascunho do pedido:
--   * a chave de consentimento_saude_tokens é "token" (não existe coluna "id");
--   * token_id é NULL-ável com ON DELETE SET NULL: o envio de uma nova solicitação APAGA o token
--     anterior ainda não usado, e um CASCADE levaria o histórico junto — o histórico precisa sobreviver;
--   * o histórico também registra o PRIMEIRO envio (motivo 'Primeiro envio'), senão o painel não
--     saberia canal/data de quem nunca foi reenviado;
--   * a tabela de tokens continua sem acesso do cliente (guarda o link secreto): o painel lê pela
--     função consentimentos_saude_painel(), que devolve só o necessário e só dos alunos do próprio personal.
-- ============================================================

BEGIN;

ALTER TABLE treino.consentimento_saude_tokens
  ADD COLUMN IF NOT EXISTS canal text NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp'));

CREATE TABLE IF NOT EXISTS treino.consentimento_reenvios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id     uuid NULL REFERENCES treino.consentimento_saude_tokens(token) ON DELETE SET NULL,
  aluno_id     uuid NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  personal_id  uuid NOT NULL,
  canal        text NOT NULL CHECK (canal IN ('email', 'whatsapp')),
  motivo       text NOT NULL,
  motivo_livre text NULL,
  criado_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consentimento_reenvios_aluno_idx ON treino.consentimento_reenvios (aluno_id, criado_at DESC);

ALTER TABLE treino.consentimento_reenvios ENABLE ROW LEVEL SECURITY;

-- O personal só LÊ o histórico dos próprios alunos; quem grava é a Edge Function (service_role).
DROP POLICY IF EXISTS consentimento_reenvios_select_own ON treino.consentimento_reenvios;
CREATE POLICY consentimento_reenvios_select_own ON treino.consentimento_reenvios
  FOR SELECT TO authenticated
  USING (personal_id = (SELECT auth.uid()));

REVOKE ALL ON treino.consentimento_reenvios FROM PUBLIC, anon, authenticated;
GRANT SELECT ON treino.consentimento_reenvios TO authenticated;
GRANT ALL ON treino.consentimento_reenvios TO service_role;

-- ----- Listagem do painel: um registro por aluno ativo do personal logado -----
CREATE OR REPLACE FUNCTION treino.consentimentos_saude_painel()
RETURNS TABLE (
  aluno_id          uuid,
  nome              text,
  status            text,
  canal             text,
  enviado_at        timestamptz,
  respondido_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    a.id,
    a.name,
    a.saude_consentimento_status,
    ult.canal,
    a.saude_consentimento_enviado_at,
    CASE a.saude_consentimento_status
      WHEN 'confirmado' THEN a.saude_consentimento_confirmado_at
      WHEN 'negado' THEN tok.used_at
      ELSE NULL
    END
  FROM treino.alunos a
  LEFT JOIN LATERAL (
    SELECT r.canal
    FROM treino.consentimento_reenvios r
    WHERE r.aluno_id = a.id
    ORDER BY r.criado_at DESC
    LIMIT 1
  ) ult ON TRUE
  LEFT JOIN LATERAL (
    SELECT t.used_at
    FROM treino.consentimento_saude_tokens t
    WHERE t.aluno_id = a.id AND t.used_at IS NOT NULL
    ORDER BY t.used_at DESC
    LIMIT 1
  ) tok ON TRUE
  WHERE a.professional_id = (SELECT auth.uid())
    AND a.active
  ORDER BY a.name;
$$;

REVOKE ALL ON FUNCTION treino.consentimentos_saude_painel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.consentimentos_saude_painel() TO authenticated;

COMMIT;
