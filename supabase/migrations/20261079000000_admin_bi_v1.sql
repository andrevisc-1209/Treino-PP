-- ============================================================
-- Migration: 20261079000000_admin_bi_v1.sql
--
-- BI v1 do painel /admin (aba Indicadores): meta de pagantes, funil de ativação, lista de quem precisa de ação, geografia e origem do cadastro.
-- Só dados do PERSONAL e agregados (regra do projeto: o admin não vê dados de alunos; de aluno entra só a CONTAGEM por personal).
--
--   1. Origem do cadastro: professionals.origem_source / origem_medium / origem_campaign (UTM, primeiro toque). Quem grava é o próprio app,
--      uma vez, na primeira entrada de uma conta NOVA, pela função treino.registrar_origem_cadastro() (o cliente não tem UPDATE nessas colunas;
--      a função só aceita conta criada nas últimas 48 h e que ainda não tenha origem). Sem origem = "direto".
--      O app só passa a CHAMAR essa função depois que a Política de Privacidade for atualizada (hoje ela diz que a origem da campanha não é
--      ligada ao cadastro): até lá todo cadastro aparece como "direto".
--   2. treino.admin_bi_v1(p_dias, p_cidade, p_situacao, p_origem): JSON com
--        meta    : pagantes ativos, MRR e a série acumulada de pagantes (livro de pagamentos);
--        funil   : do GRUPO de personais que se cadastrou no período (e passa nos filtros): cadastrou → perfil completo → 1º aluno →
--                  3 alunos → pagou, com a mediana de tempo até cada etapa;
--        cidades : cadastros, ativados (3+ alunos) e pagantes por cidade;
--        origens : idem por origem do cadastro.
--      p_dias em 1, 15, 30, 90, 180 ou 365; filtros nulos = sem filtro. O filtro vale para funil/cidades/origens; a meta é sempre global.
--   3. treino.admin_lista_acao(): personais que pedem uma ação sua agora (trial acabando sem 3 alunos, pagante sem uso, plano vencendo).
--   Cada uma tem uma função interna `*_dados` (só dono do banco; permite testar) e o invólucro que exige is_admin() (que exige MFA).
-- Reversão: DROP FUNCTION treino.admin_lista_acao(); DROP FUNCTION treino.admin_lista_acao_dados();
--           DROP FUNCTION treino.admin_bi_v1(INT, TEXT, TEXT, TEXT); DROP FUNCTION treino.admin_bi_v1_dados(INT, TEXT, TEXT, TEXT);
--           DROP FUNCTION treino.registrar_origem_cadastro(TEXT, TEXT, TEXT);
--           ALTER TABLE treino.professionals DROP COLUMN origem_source, DROP COLUMN origem_medium, DROP COLUMN origem_campaign;
-- Teste (transação desfeita no final): supabase/tests/admin_bi_v1.sql
-- ============================================================

BEGIN;

-- 1) origem do cadastro
ALTER TABLE treino.professionals
  ADD COLUMN IF NOT EXISTS origem_source TEXT NULL CHECK (origem_source IS NULL OR char_length(origem_source) BETWEEN 1 AND 60),
  ADD COLUMN IF NOT EXISTS origem_medium TEXT NULL CHECK (origem_medium IS NULL OR char_length(origem_medium) BETWEEN 1 AND 60),
  ADD COLUMN IF NOT EXISTS origem_campaign TEXT NULL CHECK (origem_campaign IS NULL OR char_length(origem_campaign) BETWEEN 1 AND 60);

CREATE OR REPLACE FUNCTION treino.registrar_origem_cadastro(p_source TEXT, p_medium TEXT, p_campaign TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID := (SELECT auth.uid());
  v_src TEXT;
  v_med TEXT;
  v_cam TEXT;
BEGIN
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '28000';
  END IF;
  -- só letras, números, _ . - ; minúsculo; no máximo 60 caracteres (vem do link, é tratado como hostil)
  v_src := left(lower(regexp_replace(COALESCE(p_source, ''), '[^a-zA-Z0-9_.-]', '', 'g')), 60);
  v_med := left(lower(regexp_replace(COALESCE(p_medium, ''), '[^a-zA-Z0-9_.-]', '', 'g')), 60);
  v_cam := left(lower(regexp_replace(COALESCE(p_campaign, ''), '[^a-zA-Z0-9_.-]', '', 'g')), 60);
  IF v_src = '' THEN RETURN 'ignorado'; END IF;

  UPDATE treino.professionals
     SET origem_source = v_src, origem_medium = NULLIF(v_med, ''), origem_campaign = NULLIF(v_cam, '')
   WHERE id = v_id AND is_admin = FALSE AND origem_source IS NULL AND created_at > now() - interval '48 hours';
  RETURN CASE WHEN FOUND THEN 'registrado' ELSE 'ignorado' END;
END;
$$;

REVOKE ALL ON FUNCTION treino.registrar_origem_cadastro(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.registrar_origem_cadastro(TEXT, TEXT, TEXT) TO authenticated;

-- 2) BI v1 (corpo; sem checagem de admin: só o dono do banco e o invólucro abaixo chamam)
CREATE OR REPLACE FUNCTION treino.admin_bi_v1_dados(p_dias INT, p_cidade TEXT, p_situacao TEXT, p_origem TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ini TIMESTAMPTZ := now() - make_interval(days => p_dias);
  v_meta JSONB;
  v_funil JSONB;
  v_cidades JSONB;
  v_origens JSONB;
BEGIN
  IF p_dias NOT IN (1, 15, 30, 90, 180, 365) THEN
    RAISE EXCEPTION 'Período inválido.' USING ERRCODE = '22023';
  END IF;

  WITH pers AS (
    SELECT p.id, p.created_at,
      (btrim(p.name) <> '' AND btrim(COALESCE(p.cpf, '')) <> '' AND btrim(COALESCE(p.phone, '')) <> '') AS perfil_ok,
      CASE WHEN p.cidade IS NULL OR p.cidade = '' THEN 'Não informado' ELSE p.cidade || COALESCE('/' || p.uf, '') END AS cidade,
      COALESCE(NULLIF(p.origem_source, ''), 'direto') AS origem,
      a.status, a.mp_payment_id
    FROM treino.professionals p
    LEFT JOIN treino.assinaturas a ON a.professional_id = p.id
    WHERE p.is_admin = FALSE
  ),
  al AS (
    SELECT professional_id, COUNT(*) AS n, MIN(created_at) AS primeiro, (array_agg(created_at ORDER BY created_at))[3] AS terceiro
    FROM treino.alunos WHERE apagado_em IS NULL GROUP BY professional_id
  ),
  pg AS (SELECT professional_id, MIN(pago_em) AS primeiro FROM treino.pagamentos_assinatura GROUP BY professional_id),
  coorte AS (
    SELECT pers.*, COALESCE(al.n, 0) AS qtd_alunos, al.primeiro AS t_aluno1, al.terceiro AS t_aluno3, pg.primeiro AS t_pago,
      (pg.primeiro IS NOT NULL OR pers.mp_payment_id IS NOT NULL OR pers.status = 'ativa') AS pagou
    FROM pers
    LEFT JOIN al ON al.professional_id = pers.id
    LEFT JOIN pg ON pg.professional_id = pers.id
    WHERE pers.created_at >= v_ini
      AND (p_cidade IS NULL OR pers.cidade = p_cidade)
      AND (p_situacao IS NULL OR pers.status = p_situacao)
      AND (p_origem IS NULL OR pers.origem = p_origem)
  )
  SELECT
    jsonb_build_object(
      'cadastrou', COUNT(*),
      'perfil_completo', COUNT(*) FILTER (WHERE perfil_ok),
      'primeiro_aluno', COUNT(*) FILTER (WHERE qtd_alunos >= 1),
      'tres_alunos', COUNT(*) FILTER (WHERE qtd_alunos >= 3),
      'pagou', COUNT(*) FILTER (WHERE pagou),
      'mediana_horas_primeiro_aluno', ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (t_aluno1 - created_at)) / 3600.0) FILTER (WHERE t_aluno1 IS NOT NULL))::numeric, 1),
      'mediana_horas_tres_alunos', ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (t_aluno3 - created_at)) / 3600.0) FILTER (WHERE t_aluno3 IS NOT NULL))::numeric, 1),
      'mediana_dias_primeiro_pagamento', ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (t_pago - created_at)) / 86400.0) FILTER (WHERE t_pago IS NOT NULL))::numeric, 1)
    ),
    COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'cadastros')::int DESC, x->>'cidade') FROM (
      SELECT jsonb_build_object('cidade', cidade, 'cadastros', COUNT(*), 'ativados', COUNT(*) FILTER (WHERE qtd_alunos >= 3), 'pagantes', COUNT(*) FILTER (WHERE pagou)) AS x
      FROM coorte GROUP BY cidade ORDER BY COUNT(*) DESC, cidade LIMIT 30) t), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'cadastros')::int DESC, x->>'origem') FROM (
      SELECT jsonb_build_object('origem', origem, 'cadastros', COUNT(*), 'ativados', COUNT(*) FILTER (WHERE qtd_alunos >= 3), 'pagantes', COUNT(*) FILTER (WHERE pagou)) AS x
      FROM coorte GROUP BY origem ORDER BY COUNT(*) DESC, origem LIMIT 30) t), '[]'::jsonb)
  INTO v_funil, v_cidades, v_origens
  FROM coorte;

  -- meta: pagantes ativos hoje, MRR (mesmos preços de admin_financeiro) e a série acumulada de quem já pagou, dia a dia (livro de pagamentos)
  WITH ativos AS (
    SELECT a.plano FROM treino.assinaturas a
    JOIN treino.professionals p ON p.id = a.professional_id AND p.is_admin = FALSE
    WHERE a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())
  ),
  primeiros AS (
    SELECT (MIN(pago_em) AT TIME ZONE 'America/Sao_Paulo')::date AS dia FROM treino.pagamentos_assinatura GROUP BY professional_id
  ),
  dias AS (
    SELECT d::date AS dia FROM generate_series(
      LEAST(COALESCE((SELECT MIN(dia) FROM primeiros), CURRENT_DATE), (now() AT TIME ZONE 'America/Sao_Paulo')::date - 29),
      (now() AT TIME ZONE 'America/Sao_Paulo')::date, interval '1 day') d
  )
  SELECT jsonb_build_object(
    'pagantes_ativos', (SELECT COUNT(*) FROM ativos),
    'mrr', (SELECT COALESCE(SUM(CASE plano WHEN 'mensal' THEN 15 WHEN 'trimestral' THEN 39.0 / 3 WHEN 'semestral' THEN 60.0 / 6 ELSE 0 END), 0) FROM ativos)::NUMERIC(10,2),
    'ja_pagaram', (SELECT COUNT(*) FROM primeiros),
    'serie', COALESCE((SELECT jsonb_agg(jsonb_build_object('dia', dias.dia, 'acumulado', (SELECT COUNT(*) FROM primeiros pr WHERE pr.dia <= dias.dia)) ORDER BY dias.dia) FROM dias), '[]'::jsonb)
  ) INTO v_meta;

  RETURN jsonb_build_object('dias', p_dias, 'inicio', v_ini, 'fim', now(), 'meta', v_meta, 'funil', v_funil, 'cidades', v_cidades, 'origens', v_origens);
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_bi_v1_dados(INT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION treino.admin_bi_v1(p_dias INT, p_cidade TEXT DEFAULT NULL, p_situacao TEXT DEFAULT NULL, p_origem TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  IF p_situacao IS NOT NULL AND p_situacao NOT IN ('trial', 'ativa', 'expirada', 'cancelada') THEN
    RAISE EXCEPTION 'Situação inválida.' USING ERRCODE = '22023';
  END IF;
  RETURN treino.admin_bi_v1_dados(p_dias, NULLIF(btrim(p_cidade), ''), p_situacao, NULLIF(btrim(p_origem), ''));
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_bi_v1(INT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_bi_v1(INT, TEXT, TEXT, TEXT) TO authenticated;

-- 3) lista de ação: quem pede um contato seu agora
CREATE OR REPLACE FUNCTION treino.admin_lista_acao_dados()
RETURNS TABLE (professional_id UUID, nome TEXT, cidade TEXT, telefone TEXT, plano TEXT, status TEXT, motivo TEXT, dias INT, qtd_alunos BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH base AS (
    SELECT p.id, p.name, p.phone,
      CASE WHEN p.cidade IS NULL OR p.cidade = '' THEN NULL ELSE p.cidade || COALESCE('/' || p.uf, '') END AS cidade,
      a.status, a.plano, a.trial_fim,
      CASE WHEN a.assinatura_fim IS NULL THEN a.bonus_ate WHEN a.bonus_ate IS NULL THEN a.assinatura_fim ELSE GREATEST(a.assinatura_fim, a.bonus_ate) END AS fim_pago,
      (SELECT COUNT(*) FROM treino.alunos al WHERE al.professional_id = p.id AND al.apagado_em IS NULL) AS qtd_alunos,
      GREATEST(
        (SELECT MAX(s.session_date)::timestamptz FROM treino.sessoes s WHERE s.professional_id = p.id AND s.status = 'concluida'),
        (SELECT MAX(e.concluido_em) FROM treino.execucoes_assincrono e WHERE e.professional_id = p.id AND e.status = 'concluido'),
        (SELECT MAX(au.starts_at) FROM treino.aulas au WHERE au.professional_id = p.id AND au.status = 'realizada' AND au.starts_at <= now()),
        (SELECT MAX(al.created_at) FROM treino.alunos al WHERE al.professional_id = p.id),
        (SELECT MAX(pl.created_at) FROM treino.planos pl WHERE pl.professional_id = p.id),
        p.created_at
      ) AS ultima_atividade
    FROM treino.professionals p
    JOIN treino.assinaturas a ON a.professional_id = p.id
    WHERE p.is_admin = FALSE
  )
  SELECT id, name, cidade, phone, plano, status, motivo, dias, qtd_alunos FROM (
    -- teste acabando em até 5 dias sem ter chegado a 3 alunos
    SELECT id, name, cidade, phone, plano, status, 'trial_sem_ativacao'::TEXT AS motivo,
           GREATEST(0, CEIL(EXTRACT(EPOCH FROM (trial_fim - now())) / 86400.0))::INT AS dias, qtd_alunos, 1 AS prioridade
    FROM base WHERE status = 'trial' AND trial_fim > now() AND trial_fim <= now() + interval '5 days' AND qtd_alunos < 3
    UNION ALL
    -- pagante dentro do prazo sem nenhuma atividade há 7 dias ou mais
    SELECT id, name, cidade, phone, plano, status, 'pagante_sem_uso',
           FLOOR(EXTRACT(EPOCH FROM (now() - ultima_atividade)) / 86400.0)::INT, qtd_alunos, 2
    FROM base WHERE status = 'ativa' AND fim_pago > now() AND ultima_atividade < now() - interval '7 days'
    UNION ALL
    -- pagante com o acesso terminando em até 7 dias
    SELECT id, name, cidade, phone, plano, status, 'vencendo',
           GREATEST(0, CEIL(EXTRACT(EPOCH FROM (fim_pago - now())) / 86400.0))::INT, qtd_alunos, 3
    FROM base WHERE status = 'ativa' AND fim_pago > now() AND fim_pago <= now() + interval '7 days'
  ) l
  ORDER BY prioridade, dias, name
$$;

REVOKE ALL ON FUNCTION treino.admin_lista_acao_dados() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION treino.admin_lista_acao()
RETURNS TABLE (professional_id UUID, nome TEXT, cidade TEXT, telefone TEXT, plano TEXT, status TEXT, motivo TEXT, dias INT, qtd_alunos BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM treino.admin_lista_acao_dados();
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_lista_acao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_lista_acao() TO authenticated;

COMMIT;
