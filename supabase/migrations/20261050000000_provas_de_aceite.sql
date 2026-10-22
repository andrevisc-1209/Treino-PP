-- ============================================================
-- Migration: 20261050000000_provas_de_aceite.sql
--
-- Auditoria de segurança (3ª revisão, item "provas de aceite fabricáveis pelo cliente"):
--   * aceites_termos: o app nunca grava por aqui (só o trigger do cadastro), mas o cliente tinha INSERT + policy: podia fabricar
--     aceites (versão e data à vontade). Quem entra pelo Google nem tinha aceite registrado.
--   * consentimentos (consentimento do ALUNO): policy FOR ALL deixava o cliente inserir method = 'link' (reservado à Edge Function
--     que recebe a confirmação do aluno), definir consented_at, editar versão/método e APAGAR o histórico.
--
-- Aqui:
--   1. treino.documentos_versoes: versões de documentos que EXISTEM (termos, privacidade, consentimento de saúde). O servidor
--      recusa versão inventada. Semeada com as versões já gravadas + as atuais (o CI exige a migration quando o texto muda).
--   2. handle_new_user valida as versões dos metadados do cadastro.
--   3. aceites_termos: sem INSERT/policy do cliente; novo caminho = RPC registrar_aceite_termos (valida a versão, hora do servidor,
--      guarda o IP do cabeçalho do Cloudflare). Idempotente.
--   4. consentimentos: cliente só LÊ, INSERE (method app/papel, versão válida, consented_at = agora) e REVOGA (revoked_at = agora, sem
--      desfazer); nada de DELETE. method = 'link' só pela Edge Function (service_role).
-- Não desliga RLS. A confirmação por link do aluno (service_role) não muda.
-- ============================================================

BEGIN;

-- ----- 1. versões válidas -----
CREATE TABLE IF NOT EXISTS treino.documentos_versoes (
  tipo   TEXT NOT NULL CHECK (tipo IN ('termos', 'privacidade', 'consentimento_saude')),
  versao TEXT NOT NULL CHECK (char_length(versao) BETWEEN 1 AND 20),
  PRIMARY KEY (tipo, versao)
);
ALTER TABLE treino.documentos_versoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.documentos_versoes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON treino.documentos_versoes TO service_role;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('termos', '1.1'),
  ('privacidade', '1.4'),
  ('consentimento_saude', '1.5')
ON CONFLICT DO NOTHING;
-- versões já gravadas (histórico continua válido)
INSERT INTO treino.documentos_versoes (tipo, versao)
SELECT DISTINCT 'termos', termos_versao FROM treino.aceites_termos WHERE char_length(termos_versao) BETWEEN 1 AND 20
ON CONFLICT DO NOTHING;
INSERT INTO treino.documentos_versoes (tipo, versao)
SELECT DISTINCT 'privacidade', privacidade_versao FROM treino.aceites_termos WHERE char_length(privacidade_versao) BETWEEN 1 AND 20
ON CONFLICT DO NOTHING;
INSERT INTO treino.documentos_versoes (tipo, versao)
SELECT DISTINCT 'consentimento_saude', consent_version FROM treino.consentimentos WHERE char_length(consent_version) BETWEEN 1 AND 20
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION treino.versao_documento_valida(p_tipo TEXT, p_versao TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM treino.documentos_versoes WHERE tipo = p_tipo AND versao = p_versao);
$$;
REVOKE ALL ON FUNCTION treino.versao_documento_valida(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.versao_documento_valida(TEXT, TEXT) TO authenticated, service_role;

-- ----- 2. cadastro: valida as versões vindas dos metadados (versão atual da função: 20261034000000) -----
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
    -- versão inventada no cadastro por API: recusa (o app sempre manda uma versão que existe)
    IF NOT (treino.versao_documento_valida('termos', NEW.raw_user_meta_data->>'termos_versao')
        AND treino.versao_documento_valida('privacidade', NEW.raw_user_meta_data->>'privacidade_versao')) THEN
      RAISE EXCEPTION 'Versão dos termos inválida.';
    END IF;
    INSERT INTO treino.aceites_termos (professional_id, termos_versao, privacidade_versao)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'termos_versao', NEW.raw_user_meta_data->>'privacidade_versao');
  END IF;

  INSERT INTO treino.assinaturas (professional_id, status)
  VALUES (NEW.id, 'trial')
  ON CONFLICT (professional_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ----- 3. aceites_termos: só pela RPC -----
ALTER TABLE treino.aceites_termos ADD COLUMN IF NOT EXISTS ip TEXT NULL CHECK (char_length(ip) <= 45);

DROP POLICY IF EXISTS aceites_termos_self_insert ON treino.aceites_termos;
REVOKE INSERT ON treino.aceites_termos FROM authenticated;

CREATE OR REPLACE FUNCTION treino.registrar_aceite_termos(p_termos TEXT, p_privacidade TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ip  TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT (treino.versao_documento_valida('termos', p_termos) AND treino.versao_documento_valida('privacidade', p_privacidade)) THEN
    RAISE EXCEPTION 'Versão dos termos inválida.' USING ERRCODE = 'P0001';
  END IF;

  -- IP do aparelho: cabeçalho do Cloudflare que o PostgREST repassa (a Cloudflare sobrescreve o que o cliente mandar).
  BEGIN
    v_ip := NULLIF(left(btrim((current_setting('request.headers', true)::json) ->> 'cf-connecting-ip'), 45), '');
    IF v_ip IS NOT NULL AND v_ip !~ '^[0-9a-fA-F:.]+$' THEN v_ip := NULL; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM treino.aceites_termos
    WHERE professional_id = v_uid AND termos_versao = p_termos AND privacidade_versao = p_privacidade
  ) THEN
    INSERT INTO treino.aceites_termos (professional_id, termos_versao, privacidade_versao, ip)
    VALUES (v_uid, p_termos, p_privacidade, v_ip);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION treino.registrar_aceite_termos(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.registrar_aceite_termos(TEXT, TEXT) TO authenticated;

-- ----- 4. consentimentos do aluno -----
DROP POLICY IF EXISTS consentimentos_own ON treino.consentimentos;
REVOKE ALL ON treino.consentimentos FROM authenticated;
GRANT SELECT, INSERT ON treino.consentimentos TO authenticated;
GRANT UPDATE (revoked_at) ON treino.consentimentos TO authenticated;

CREATE POLICY consentimentos_select_own ON treino.consentimentos
  FOR SELECT TO authenticated
  USING (professional_id = (SELECT auth.uid()));

-- 'link' é reservado à Edge Function confirmar-consentimento-saude (service_role, ignora RLS).
CREATE POLICY consentimentos_insert_own ON treino.consentimentos
  FOR INSERT TO authenticated
  WITH CHECK (
    professional_id = (SELECT auth.uid())
    AND method IN ('app', 'papel')
    AND aluno_id IN (SELECT a.id FROM treino.alunos a WHERE a.professional_id = (SELECT auth.uid()))
    AND treino.versao_documento_valida('consentimento_saude', consent_version)
  );

CREATE POLICY consentimentos_update_own ON treino.consentimentos
  FOR UPDATE TO authenticated
  USING (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION treino.proteger_consentimento()
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
    -- data do consentimento é a do servidor (sem backdating) e nasce não revogado
    NEW.consented_at := now();
    NEW.created_at   := now();
    NEW.revoked_at   := NULL;
  ELSE
    -- revogação é definitiva: não se "desrevoga" (um novo consentimento é uma nova linha); a data é a do servidor
    IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
      RAISE EXCEPTION 'Consentimento já revogado.';
    END IF;
    IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
      NEW.revoked_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_proteger_consentimento ON treino.consentimentos;
CREATE TRIGGER tg_proteger_consentimento
  BEFORE INSERT OR UPDATE ON treino.consentimentos
  FOR EACH ROW EXECUTE FUNCTION treino.proteger_consentimento();

COMMIT;
