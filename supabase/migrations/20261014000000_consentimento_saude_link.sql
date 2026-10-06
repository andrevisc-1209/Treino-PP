-- ============================================================
-- Migration: 20261014000000_consentimento_saude_link.sql
--
-- Consentimento LGPD dos dados de saúde do aluno por e-mail, com confirmação
-- por link (o aluno clica; o personal não consegue "confirmar por ele").
--
-- Decisões de desenho:
--   * O TOKEN fica numa tabela à parte (consentimento_saude_tokens), sem nenhum
--     acesso para anon/authenticated. Em treino.alunos ele seria lido pelo
--     próprio personal (o app faz select '*') e bastaria ele chamar a função
--     pública de confirmação para "confirmar pelo aluno", anulando o sentido do
--     link. Só as Edge Functions (service_role) tocam nessa tabela.
--   * As colunas de status em alunos NÃO podem ser gravadas pelo cliente
--     (trigger): senão o personal marcaria 'confirmado' direto pela REST API.
--     O cliente só pode ZERAR (NULL) — é o que a revogação do consentimento faz.
--   * Ao confirmar, a função também insere em treino.consentimentos
--     (method = 'link', já previsto no CHECK), então o resto do app (ficha,
--     revogação, travas de saúde) continua usando a mesma fonte de verdade.
-- ============================================================

BEGIN;

ALTER TABLE treino.alunos
  ADD COLUMN IF NOT EXISTS saude_consentimento_status TEXT NULL
    CHECK (saude_consentimento_status IN ('pendente', 'confirmado', 'negado')),
  ADD COLUMN IF NOT EXISTS saude_consentimento_enviado_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS saude_consentimento_confirmado_at TIMESTAMPTZ NULL;

-- ----- Tokens (só service_role) -----
CREATE TABLE IF NOT EXISTS treino.consentimento_saude_tokens (
  token       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id    UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consentimento_saude_tokens_aluno_idx ON treino.consentimento_saude_tokens (aluno_id);

-- RLS ligado e SEM policies: nenhum acesso por anon/authenticated (service_role ignora RLS).
ALTER TABLE treino.consentimento_saude_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.consentimento_saude_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON treino.consentimento_saude_tokens TO service_role;

-- ----- Trava: o cliente não escreve o status do consentimento -----
CREATE OR REPLACE FUNCTION treino.proteger_consentimento_saude()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Só trava as roles de cliente; service_role (Edge Functions) e o SQL Editor passam.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.saude_consentimento_status IS NOT NULL
       OR NEW.saude_consentimento_enviado_at IS NOT NULL
       OR NEW.saude_consentimento_confirmado_at IS NOT NULL THEN
      RAISE EXCEPTION 'Campos de consentimento de saúde só podem ser alterados pelo sistema.';
    END IF;
  ELSE
    -- UPDATE: mudar é permitido apenas para zerar (revogação do consentimento).
    IF (NEW.saude_consentimento_status IS DISTINCT FROM OLD.saude_consentimento_status AND NEW.saude_consentimento_status IS NOT NULL)
       OR (NEW.saude_consentimento_enviado_at IS DISTINCT FROM OLD.saude_consentimento_enviado_at AND NEW.saude_consentimento_enviado_at IS NOT NULL)
       OR (NEW.saude_consentimento_confirmado_at IS DISTINCT FROM OLD.saude_consentimento_confirmado_at AND NEW.saude_consentimento_confirmado_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Campos de consentimento de saúde só podem ser alterados pelo sistema.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_proteger_consentimento_saude ON treino.alunos;
CREATE TRIGGER tg_proteger_consentimento_saude
  BEFORE INSERT OR UPDATE ON treino.alunos
  FOR EACH ROW EXECUTE FUNCTION treino.proteger_consentimento_saude();

COMMIT;
