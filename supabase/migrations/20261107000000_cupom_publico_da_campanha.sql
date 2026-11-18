-- ============================================================
-- Migration: 20261107000000_cupom_publico_da_campanha.sql
--
-- Cupom de parceiro: cada campanha passa a definir QUEM pode usar (pedido do dono, 18/11/2026):
--   'novos' (padrão, como era): só conta criada há no máximo 7 dias e ainda sem alunos;
--   'todos': qualquer personal (inclui quem já usa o app ou já paga). Os dias SOMAM depois do fim do acesso atual (trial, assinatura ou bônus),
--            pela mesma estender_bonus, e quem assinar depois não perde nenhum (PR #313).
-- Continua valendo UM cupom por conta e o limite de usos e o período de cada campanha. As campanhas que já existem ficam 'novos'.
--   1. campanhas_cupom.publico ('novos' | 'todos').
--   2. resgatar_cupom: a regra de conta nova só vale para campanha 'novos'.
--   3. admin_cupons: devolve o público de cada campanha.
--   4. admin_criar_campanha_cupom ganha o parâmetro p_publico (padrão 'novos'); a função antiga de 5 parâmetros é REMOVIDA.
--      O público não muda depois de criada (para mudar, crie outra campanha): evita abrir uma campanha de "novos" para "todos" sem querer.
-- Rollback: DROP COLUMN publico (recriar as funções das migrations 20261105 e 20261106).
-- ============================================================

BEGIN;

ALTER TABLE treino.campanhas_cupom ADD COLUMN IF NOT EXISTS publico TEXT NOT NULL DEFAULT 'novos' CHECK (publico IN ('novos', 'todos'));

-- ----- resgatar -----
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

  DELETE FROM treino.cupom_tentativas WHERE created_at < now() - INTERVAL '1 day';
  IF (SELECT count(*) FROM treino.cupom_tentativas WHERE professional_id = v_uid AND created_at > now() - INTERVAL '1 hour') >= 8 THEN
    RETURN jsonb_build_object('resultado', 'muitas_tentativas');
  END IF;

  IF EXISTS (SELECT 1 FROM treino.resgates_cupom WHERE professional_id = v_uid) THEN
    RETURN jsonb_build_object('resultado', 'ja_usou');
  END IF;

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

  -- campanha "só contas novas": criada há no máximo 7 dias e ainda sem alunos (campanha "todos" não exige)
  IF v_camp.publico = 'novos' THEN
    SELECT created_at INTO v_criado FROM treino.professionals WHERE id = v_uid;
    IF v_criado IS NULL OR v_criado < now() - INTERVAL '7 days'
       OR EXISTS (SELECT 1 FROM treino.alunos WHERE professional_id = v_uid) THEN
      RETURN jsonb_build_object('resultado', 'nao_novo');
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM treino.assinaturas WHERE professional_id = v_uid) THEN
    RETURN jsonb_build_object('resultado', 'invalido');
  END IF;

  BEGIN
    INSERT INTO treino.resgates_cupom (campanha_id, professional_id, dias) VALUES (v_camp.id, v_uid, v_camp.dias_bonus);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('resultado', 'ja_usou');
  END;
  PERFORM treino.estender_bonus(v_uid, v_camp.dias_bonus);
  SELECT bonus_ate INTO v_bonus FROM treino.assinaturas WHERE professional_id = v_uid;
  RETURN jsonb_build_object('resultado', 'ok', 'dias', v_camp.dias_bonus, 'bonus_ate', v_bonus);
END;
$$;
REVOKE ALL ON FUNCTION treino.resgatar_cupom(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.resgatar_cupom(TEXT) TO authenticated;

-- ----- painel (agora com o público) -----
CREATE OR REPLACE FUNCTION treino.admin_cupons()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH resg AS (
      SELECT r.id, r.campanha_id, r.professional_id, r.dias, r.created_at,
             EXISTS (SELECT 1 FROM treino.alunos a WHERE a.professional_id = r.professional_id AND a.apagado_em IS NULL) AS ativado,
             EXISTS (SELECT 1 FROM treino.pagamentos_assinatura p WHERE p.professional_id = r.professional_id) AS pagante
      FROM treino.resgates_cupom r
    ),
    camp AS (
      SELECT c.id, c.codigo, c.parceiro, c.dias_bonus, c.valido_de, c.valido_ate, c.max_usos, c.ativa, c.publico, c.created_at,
             count(g.id) AS usos,
             count(g.id) FILTER (WHERE g.ativado) AS ativados,
             count(g.id) FILTER (WHERE g.pagante) AS pagantes
      FROM treino.campanhas_cupom c
      LEFT JOIN resg g ON g.campanha_id = c.id
      GROUP BY c.id
    )
    SELECT jsonb_build_object(
      'totais', jsonb_build_object(
        'campanhas', (SELECT count(*) FROM camp),
        'ativas',    (SELECT count(*) FROM camp WHERE ativa AND now() BETWEEN valido_de AND valido_ate AND usos < max_usos),
        'resgates',  (SELECT count(*) FROM resg),
        'ativados',  (SELECT count(*) FROM resg WHERE ativado),
        'pagantes',  (SELECT count(*) FROM resg WHERE pagante),
        'dias_concedidos', (SELECT coalesce(sum(dias), 0) FROM resg)
      ),
      'campanhas', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM camp x), '[]'::jsonb),
      'recentes', coalesce((
        SELECT jsonb_agg(to_jsonb(y) ORDER BY y.resgatado_em DESC)
        FROM (
          SELECT g.id, c.codigo, c.parceiro, p.name AS personal_nome, g.dias, g.created_at AS resgatado_em, g.ativado, g.pagante
          FROM resg g
          JOIN treino.campanhas_cupom c ON c.id = g.campanha_id
          JOIN treino.professionals p ON p.id = g.professional_id
          ORDER BY g.created_at DESC LIMIT 30
        ) y
      ), '[]'::jsonb)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION treino.admin_cupons() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_cupons() TO authenticated;

-- ----- criar (com o público) -----
DROP FUNCTION IF EXISTS treino.admin_criar_campanha_cupom(TEXT, TEXT, INT, TIMESTAMPTZ, INT);
CREATE OR REPLACE FUNCTION treino.admin_criar_campanha_cupom(p_codigo TEXT, p_parceiro TEXT, p_dias INT, p_valido_ate TIMESTAMPTZ, p_max_usos INT, p_publico TEXT DEFAULT 'novos')
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cod TEXT := upper(btrim(coalesce(p_codigo, '')));
  v_parc TEXT := btrim(coalesce(p_parceiro, ''));
  v_pub TEXT := coalesce(p_publico, 'novos');
  v_id UUID;
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  IF v_cod !~ '^[A-Z0-9]{4,20}$' THEN RAISE EXCEPTION 'O código precisa ter de 4 a 20 letras e números, sem espaço.' USING ERRCODE = 'P0001'; END IF;
  IF char_length(v_parc) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Informe o nome do parceiro (até 80 caracteres).' USING ERRCODE = 'P0001'; END IF;
  IF p_dias IS NULL OR p_dias NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'Os dias do cupom vão de 1 a 365.' USING ERRCODE = 'P0001'; END IF;
  IF p_valido_ate IS NULL OR p_valido_ate <= now() THEN RAISE EXCEPTION 'A validade precisa ser uma data futura.' USING ERRCODE = 'P0001'; END IF;
  IF p_max_usos IS NULL OR p_max_usos NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'O limite de usos vai de 1 a 100.000.' USING ERRCODE = 'P0001'; END IF;
  IF v_pub NOT IN ('novos', 'todos') THEN RAISE EXCEPTION 'Escolha quem pode usar: só contas novas ou qualquer personal.' USING ERRCODE = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM treino.campanhas_cupom WHERE codigo = v_cod) THEN
    RAISE EXCEPTION 'Já existe uma campanha com esse código.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO treino.campanhas_cupom (codigo, parceiro, dias_bonus, valido_de, valido_ate, max_usos, publico, criado_por)
  VALUES (v_cod, v_parc, p_dias, now(), p_valido_ate, p_max_usos, v_pub, (SELECT auth.uid()))
  RETURNING id INTO v_id;

  INSERT INTO treino.admin_logs (admin_id, acao, target_professional_id, detalhes)
  VALUES ((SELECT auth.uid()), 'criar_campanha_cupom', NULL,
          jsonb_build_object('campanha_id', v_id, 'codigo', v_cod, 'dias', p_dias, 'max_usos', p_max_usos, 'valido_ate', p_valido_ate, 'publico', v_pub));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION treino.admin_criar_campanha_cupom(TEXT, TEXT, INT, TIMESTAMPTZ, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_criar_campanha_cupom(TEXT, TEXT, INT, TIMESTAMPTZ, INT, TEXT) TO authenticated;

COMMIT;
