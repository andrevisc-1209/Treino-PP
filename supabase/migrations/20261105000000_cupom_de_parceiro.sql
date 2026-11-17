-- ============================================================
-- Migration: 20261105000000_cupom_de_parceiro.sql
--
-- Cupom de parceiro: um código (ex.: "PARCEIRO3M") dá N dias grátis a um personal NOVO. Os dias SOMAM depois do trial (ou da assinatura),
-- pela mesma função do mês grátis da indicação (treino.estender_bonus -> assinaturas.bonus_ate). Decisões do dono (17/11/2026):
--   * só conta nova (criada há no máximo 7 dias e ainda sem alunos), um cupom por conta, vale junto com a indicação;
--   * libera na hora, sem exigir alunos (a regra dos 3 alunos é só da indicação); o cupom NÃO conta no teto de 6 meses da indicação;
--   * quem assina no meio do grátis não perde dias (PR #313: o plano pago começa depois do bônus).
--
--   1. treino.campanhas_cupom: código, parceiro, dias, período de validade, limite de usos (obrigatório), ativa. Criada só pelo admin
--      (PR seguinte); aqui o cliente não lê nem escreve (sem policy).
--   2. treino.resgates_cupom: quem usou qual campanha (uma linha por personal, UNIQUE) e quantos dias levou.
--   3. treino.cupom_tentativas: erros de código por personal (freio contra adivinhação: 8 erros por hora).
--   4. treino.resgatar_cupom(p_codigo): chamada pelo personal logado. Devolve JSON {"resultado": ..., "dias": ..., "bonus_ate": ...}:
--        ok | invalido (inexistente ou pausada) | fora_do_periodo | esgotado | ja_usou | nao_novo | muitas_tentativas
--      A campanha é travada (FOR UPDATE) enquanto conta os usos: o limite nunca é ultrapassado, mesmo com resgates ao mesmo tempo.
--   5. treino.meu_cupom(): se o personal já usou, quantos dias e quando (para a tela "Acesso por cupom até…"); nunca mostra o parceiro.
-- Só dado do PERSONAL e números; nenhum dado de aluno ou de saúde.
-- Rollback: DROP FUNCTION treino.resgatar_cupom(TEXT), treino.meu_cupom(); DROP TABLE treino.cupom_tentativas, treino.resgates_cupom,
--   treino.campanhas_cupom. (Os dias já somados em assinaturas.bonus_ate ficam; para tirar, ajustar bonus_ate à mão.)
-- ============================================================

BEGIN;

-- ----- 1. campanhas -----
CREATE TABLE IF NOT EXISTS treino.campanhas_cupom (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      TEXT NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z0-9]{4,20}$'),
  parceiro    TEXT NOT NULL CHECK (char_length(btrim(parceiro)) BETWEEN 1 AND 80),
  dias_bonus  INT  NOT NULL CHECK (dias_bonus BETWEEN 1 AND 365),
  valido_de   TIMESTAMPTZ NOT NULL DEFAULT now(),
  valido_ate  TIMESTAMPTZ NOT NULL,
  max_usos    INT  NOT NULL CHECK (max_usos > 0),
  ativa       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por  UUID NULL REFERENCES treino.professionals(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valido_ate > valido_de)
);
ALTER TABLE treino.campanhas_cupom ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.campanhas_cupom FROM PUBLIC, anon, authenticated;
GRANT SELECT ON treino.campanhas_cupom TO service_role;
-- sem policy: o cliente não lê nem escreve aqui (nem os códigos); só as funções SECURITY DEFINER

-- ----- 2. resgates -----
CREATE TABLE IF NOT EXISTS treino.resgates_cupom (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id     UUID NOT NULL REFERENCES treino.campanhas_cupom(id) ON DELETE RESTRICT,
  professional_id UUID NOT NULL UNIQUE REFERENCES treino.professionals(id) ON DELETE CASCADE, -- um cupom por conta
  dias            INT  NOT NULL CHECK (dias > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resgates_cupom_campanha ON treino.resgates_cupom (campanha_id);
ALTER TABLE treino.resgates_cupom ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.resgates_cupom FROM PUBLIC, anon, authenticated;
GRANT SELECT ON treino.resgates_cupom TO service_role;

-- ----- 3. tentativas erradas (freio) -----
CREATE TABLE IF NOT EXISTS treino.cupom_tentativas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cupom_tentativas_prof ON treino.cupom_tentativas (professional_id, created_at);
ALTER TABLE treino.cupom_tentativas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.cupom_tentativas FROM PUBLIC, anon, authenticated;

-- ----- 4. resgatar -----
CREATE OR REPLACE FUNCTION treino.resgatar_cupom(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_cod TEXT := upper(btrim(coalesce(p_codigo, '')));
  v_camp treino.campanhas_cupom%ROWTYPE;
  v_criado TIMESTAMPTZ;
  v_bonus TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = 'P0001'; END IF;

  -- freio contra adivinhação: 8 códigos errados na última hora bloqueiam novas tentativas (e limpa o que é antigo)
  DELETE FROM treino.cupom_tentativas WHERE created_at < now() - INTERVAL '1 day';
  IF (SELECT count(*) FROM treino.cupom_tentativas WHERE professional_id = v_uid AND created_at > now() - INTERVAL '1 hour') >= 8 THEN
    RETURN jsonb_build_object('resultado', 'muitas_tentativas');
  END IF;

  IF EXISTS (SELECT 1 FROM treino.resgates_cupom WHERE professional_id = v_uid) THEN
    RETURN jsonb_build_object('resultado', 'ja_usou');
  END IF;

  -- campanha travada enquanto conta os usos (o limite não estoura com resgates simultâneos)
  IF v_cod ~ '^[A-Z0-9]{4,20}$' THEN
    SELECT * INTO v_camp FROM treino.campanhas_cupom WHERE codigo = v_cod AND ativa FOR UPDATE;
  END IF;
  IF v_camp.id IS NULL THEN
    INSERT INTO treino.cupom_tentativas (professional_id) VALUES (v_uid);
    RETURN jsonb_build_object('resultado', 'invalido');
  END IF;

  IF now() < v_camp.valido_de OR now() > v_camp.valido_ate THEN
    RETURN jsonb_build_object('resultado', 'fora_do_periodo');
  END IF;
  IF (SELECT count(*) FROM treino.resgates_cupom WHERE campanha_id = v_camp.id) >= v_camp.max_usos THEN
    RETURN jsonb_build_object('resultado', 'esgotado');
  END IF;

  -- só conta nova: criada há no máximo 7 dias e ainda sem alunos
  SELECT created_at INTO v_criado FROM treino.professionals WHERE id = v_uid;
  IF v_criado IS NULL OR v_criado < now() - INTERVAL '7 days'
     OR EXISTS (SELECT 1 FROM treino.alunos WHERE professional_id = v_uid) THEN
    RETURN jsonb_build_object('resultado', 'nao_novo');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM treino.assinaturas WHERE professional_id = v_uid) THEN
    RETURN jsonb_build_object('resultado', 'invalido'); -- conta sem assinatura (não deveria existir): não há onde somar os dias
  END IF;

  BEGIN
    INSERT INTO treino.resgates_cupom (campanha_id, professional_id, dias) VALUES (v_camp.id, v_uid, v_camp.dias_bonus);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('resultado', 'ja_usou'); -- dois resgates da mesma conta ao mesmo tempo: só um vale
  END;
  PERFORM treino.estender_bonus(v_uid, v_camp.dias_bonus);
  SELECT bonus_ate INTO v_bonus FROM treino.assinaturas WHERE professional_id = v_uid;
  RETURN jsonb_build_object('resultado', 'ok', 'dias', v_camp.dias_bonus, 'bonus_ate', v_bonus);
END;
$$;
REVOKE ALL ON FUNCTION treino.resgatar_cupom(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.resgatar_cupom(TEXT) TO authenticated;

-- ----- 5. o que o personal vê do próprio cupom -----
CREATE OR REPLACE FUNCTION treino.meu_cupom()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT jsonb_build_object('usou', TRUE, 'dias', r.dias, 'resgatado_em', r.created_at)
     FROM treino.resgates_cupom r WHERE r.professional_id = (SELECT auth.uid())),
    jsonb_build_object('usou', FALSE)
  );
$$;
REVOKE ALL ON FUNCTION treino.meu_cupom() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.meu_cupom() TO authenticated;

COMMIT;
