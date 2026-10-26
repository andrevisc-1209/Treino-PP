-- ============================================================
-- Migration: 20261060000000_relatos_problema.sql
--
-- "Reportar problema" dentro do app (central de ajuda): o personal envia um problema, dúvida ou sugestão em texto livre.
--   * tabela treino.relatos: o personal só INSERE e LÊ os próprios (não edita nem apaga); o status é controlado pelo admin;
--   * sem dado de aluno: o formulário avisa para não escrever nome, telefone nem dados de saúde, e o banco não guarda
--     nada além do texto, do tipo e do aparelho (user agent);
--   * limite de 5 relatos por hora por personal (trigger), para a caixa não virar spam;
--   * NÃO há trava de assinatura vencida de propósito: quem está bloqueado por falta de pagamento precisa conseguir pedir ajuda;
--   * painel admin: admin_relatos() (lista, com nome/e-mail/telefone do PERSONAL) e admin_relato_status(); ambas exigem
--     is_admin() (que já exige MFA aal2).
-- Reversão: DROP FUNCTION treino.admin_relato_status(UUID, TEXT); DROP FUNCTION treino.admin_relatos(); DROP TABLE treino.relatos;
--           DROP FUNCTION treino.controlar_relato();
-- Teste (transação desfeita no final): supabase/tests/relatos_problema.sql
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS treino.relatos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id  UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('problema', 'duvida', 'sugestao')),
  mensagem         TEXT NOT NULL CHECK (char_length(mensagem) BETWEEN 10 AND 1500),
  dispositivo      TEXT NULL CHECK (dispositivo IS NULL OR char_length(dispositivo) <= 200),
  status           TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_andamento', 'resolvido')),
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relatos_professional ON treino.relatos (professional_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_relatos_status ON treino.relatos (status, criado_em DESC);

ALTER TABLE treino.relatos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON treino.relatos FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON treino.relatos TO authenticated;

CREATE POLICY relatos_select_proprio ON treino.relatos
  FOR SELECT TO authenticated
  USING (professional_id = (SELECT auth.uid()));

CREATE POLICY relatos_insert_proprio ON treino.relatos
  FOR INSERT TO authenticated
  WITH CHECK (professional_id = (SELECT auth.uid()));

-- Status sempre começa em "novo" e limite de 5 por hora (só para o cliente; SQL Editor/manutenção não são barrados).
CREATE OR REPLACE FUNCTION treino.controlar_relato()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.status := 'novo';
    IF (SELECT count(*) FROM treino.relatos WHERE professional_id = NEW.professional_id AND criado_em > now() - interval '1 hour') >= 5 THEN
      RAISE EXCEPTION 'Você já enviou vários relatos na última hora. Aguarde um pouco ou fale com a gente pelo WhatsApp.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_controlar_relato ON treino.relatos;
CREATE TRIGGER tg_controlar_relato
  BEFORE INSERT ON treino.relatos
  FOR EACH ROW EXECUTE FUNCTION treino.controlar_relato();

-- ----- Painel admin -----
CREATE OR REPLACE FUNCTION treino.admin_relatos()
RETURNS TABLE (
  id UUID, criado_em TIMESTAMPTZ, tipo TEXT, mensagem TEXT, dispositivo TEXT, status TEXT,
  professional_id UUID, nome TEXT, email TEXT, telefone TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.id, r.criado_em, r.tipo, r.mensagem, r.dispositivo, r.status, p.id, p.name, p.email, p.phone
  FROM treino.relatos r
  JOIN treino.professionals p ON p.id = r.professional_id
  ORDER BY (r.status = 'resolvido'), r.criado_em DESC
  LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION treino.admin_relato_status(p_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('novo', 'em_andamento', 'resolvido') THEN
    RAISE EXCEPTION 'Status inválido.' USING ERRCODE = '22023';
  END IF;
  UPDATE treino.relatos SET status = p_status WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_relatos() FROM PUBLIC;
REVOKE ALL ON FUNCTION treino.admin_relato_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.admin_relatos() TO authenticated;
GRANT EXECUTE ON FUNCTION treino.admin_relato_status(UUID, TEXT) TO authenticated;

COMMIT;
