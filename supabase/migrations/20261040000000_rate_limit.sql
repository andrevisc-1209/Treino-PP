-- ============================================================
-- Migration: 20261040000000_rate_limit.sql
--
-- Rate limiting simples para Edge Functions (auditoria de segurança, docs/SECURITY-AUDIT.md).
-- Janela fixa por chave (ex.: 'mp-webhook:ip:1.2.3.4', 'send-whatsapp:user:<uuid>').
--
-- Tabela INTERNA: só as Edge Functions (service_role) usam, via a RPC abaixo.
-- Exceção documentada à regra "GRANT só para authenticated": como a tabela guarda
-- IPs e chaves de controle, o cliente (authenticated/anon) NÃO tem acesso algum;
-- RLS ligada e sem policies (negação total para quem não é service_role).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS treino.rate_limit (
  key          TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count        INT NOT NULL DEFAULT 1
);

ALTER TABLE treino.rate_limit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.rate_limit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON treino.rate_limit TO service_role;

-- Retorna true = permitido, false = bloqueado. Atômica (um único INSERT ... ON CONFLICT).
CREATE OR REPLACE FUNCTION treino.upsert_rate_limit(p_key TEXT, p_max INT, p_window_seconds INT DEFAULT 60)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Limpeza oportunista de janelas antigas (mantém a tabela pequena).
  IF random() < 0.01 THEN
    DELETE FROM treino.rate_limit WHERE window_start < now() - interval '1 hour';
  END IF;

  INSERT INTO treino.rate_limit AS r (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE
    SET window_start = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN now() ELSE r.window_start END,
        count        = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE r.count + 1 END
  RETURNING r.count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION treino.upsert_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION treino.upsert_rate_limit(TEXT, INT, INT) TO service_role;

COMMIT;
