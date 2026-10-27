-- ============================================================
-- Migration: 20261071000000_admin_indicacoes.sql
--
-- Painel admin: (1) o mês grátis da indicação passa a ser visível (hoje esses personais aparecem como vencidos mesmo com acesso);
-- (2) aba "Indicações" para acompanhar quem indica, quanto foi concedido e sinais de abuso; (3) revogar uma indicação concedida.
-- Só dados do PERSONAL e números (regra do projeto: o admin não vê dado de aluno): nome do indicador e do indicado, datas, contagens.
-- Mesmo padrão das funções admin_*: SECURITY DEFINER, exige is_admin() (que exige MFA) antes de tudo.
--
--   admin_bonus_personais()              : quem tem mês grátis vigente (professional_id, bonus_ate).
--   admin_indicacoes()                   : JSON com totais, ranking de indicadores e as 50 indicações mais recentes, com sinais:
--       mesmo_telefone  = indicador e indicado cadastraram o mesmo telefone;
--       concedida_rapida = concedida em menos de 1 hora depois de o indicado criar a conta;
--       varias_em_24h   = (por indicador) 3 ou mais concedidas nas últimas 24 horas.
--   admin_revogar_indicacao(p_id)        : tira o mês grátis das duas pontas (30 dias a menos em bonus_ate, sem ir abaixo de "agora"),
--       marca a indicação como 'revogada' (continua contando no teto do indicador) e grava em admin_logs. Termos 2.7 permitem (fraude/abuso).
-- Reversão: DROP das 3 funções; UPDATE indicacoes SET status = 'concedida' WHERE status = 'revogada'; recolocar os CHECKs antigos.
-- ============================================================

BEGIN;

ALTER TABLE treino.indicacoes DROP CONSTRAINT IF EXISTS indicacoes_status_check;
ALTER TABLE treino.indicacoes ADD CONSTRAINT indicacoes_status_check CHECK (status IN ('pendente', 'concedida', 'revogada'));
ALTER TABLE treino.indicacoes ADD COLUMN IF NOT EXISTS revogada_em TIMESTAMPTZ NULL;

ALTER TABLE treino.admin_logs DROP CONSTRAINT IF EXISTS admin_logs_acao_check;
ALTER TABLE treino.admin_logs
  ADD CONSTRAINT admin_logs_acao_check CHECK (acao IN ('reset_senha', 'alterar_trial', 'alterar_plano', 'alterar_cpf', 'revogar_indicacao'));

-- ----- 1. mês grátis vigente -----
CREATE OR REPLACE FUNCTION treino.admin_bonus_personais()
RETURNS TABLE (professional_id UUID, bonus_ate TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.professional_id, a.bonus_ate FROM treino.assinaturas a WHERE a.bonus_ate IS NOT NULL AND a.bonus_ate > now();
END;
$$;
REVOKE ALL ON FUNCTION treino.admin_bonus_personais() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_bonus_personais() TO authenticated;

-- ----- 2. painel de indicações -----
CREATE OR REPLACE FUNCTION treino.admin_indicacoes()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH base AS (
      SELECT
        i.id, i.indicador_id, i.indicado_id, i.status, i.indicador_ganhou, i.created_at, i.concedida_em,
        ind.name AS indicador_nome, ido.name AS indicado_nome,
        (regexp_replace(coalesce(ind.phone, ''), '\D', '', 'g') <> ''
          AND regexp_replace(coalesce(ind.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(ido.phone, ''), '\D', '', 'g')) AS mesmo_telefone,
        (i.concedida_em IS NOT NULL AND i.concedida_em - ido.created_at < INTERVAL '1 hour') AS concedida_rapida,
        (SELECT count(DISTINCT lower(btrim(a.name))) FROM treino.alunos a WHERE a.professional_id = i.indicado_id AND a.apagado_em IS NULL) AS alunos_do_indicado
      FROM treino.indicacoes i
      JOIN treino.professionals ind ON ind.id = i.indicador_id
      JOIN treino.professionals ido ON ido.id = i.indicado_id
    ),
    por_indicador AS (
      SELECT
        b.indicador_id,
        max(b.indicador_nome) AS nome,
        count(*) AS indicados,
        count(*) FILTER (WHERE b.status = 'concedida') AS concedidas,
        count(*) FILTER (WHERE b.status = 'revogada') AS revogadas,
        count(*) FILTER (WHERE b.indicador_ganhou) AS meses_ganhos,
        (count(*) FILTER (WHERE b.concedida_em > now() - INTERVAL '24 hours') >= 3) AS varias_em_24h,
        bool_or(b.mesmo_telefone) AS mesmo_telefone,
        bool_or(b.concedida_rapida) AS concedida_rapida
      FROM base b
      GROUP BY b.indicador_id
    )
    SELECT jsonb_build_object(
      'totais', jsonb_build_object(
        'indicacoes', (SELECT count(*) FROM base),
        'pendentes',  (SELECT count(*) FROM base WHERE status = 'pendente'),
        'concedidas', (SELECT count(*) FROM base WHERE status = 'concedida'),
        'revogadas',  (SELECT count(*) FROM base WHERE status = 'revogada'),
        'meses_concedidos', (SELECT count(*) FILTER (WHERE status = 'concedida') + count(*) FILTER (WHERE status = 'concedida' AND indicador_ganhou) FROM base),
        'com_sinal',  (SELECT count(*) FROM base WHERE status = 'concedida' AND (mesmo_telefone OR concedida_rapida))
      ),
      'por_indicador', coalesce((
        SELECT jsonb_agg(to_jsonb(x) ORDER BY x.concedidas DESC, x.indicados DESC)
        FROM (SELECT * FROM por_indicador ORDER BY concedidas DESC, indicados DESC LIMIT 20) x
      ), '[]'::jsonb),
      'recentes', coalesce((
        SELECT jsonb_agg(to_jsonb(y) ORDER BY y.created_at DESC)
        FROM (
          SELECT id, indicador_nome, indicado_nome, status, indicador_ganhou, created_at, concedida_em,
                 alunos_do_indicado, mesmo_telefone, concedida_rapida
          FROM base ORDER BY created_at DESC LIMIT 50
        ) y
      ), '[]'::jsonb)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION treino.admin_indicacoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_indicacoes() TO authenticated;

-- ----- 3. revogar -----
CREATE OR REPLACE FUNCTION treino.admin_revogar_indicacao(p_indicacao_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ind treino.indicacoes%ROWTYPE;
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_ind FROM treino.indicacoes WHERE id = p_indicacao_id FOR UPDATE;
  IF NOT FOUND OR v_ind.status <> 'concedida' THEN
    RAISE EXCEPTION 'Só uma indicação já concedida pode ser revogada.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE treino.assinaturas
  SET bonus_ate = CASE WHEN bonus_ate - INTERVAL '30 days' > now() THEN bonus_ate - INTERVAL '30 days' ELSE NULL END
  WHERE bonus_ate IS NOT NULL
    AND (professional_id = v_ind.indicado_id OR (v_ind.indicador_ganhou AND professional_id = v_ind.indicador_id));

  UPDATE treino.indicacoes SET status = 'revogada', revogada_em = now() WHERE id = v_ind.id;

  INSERT INTO treino.admin_logs (admin_id, acao, target_professional_id, detalhes)
  VALUES ((SELECT auth.uid()), 'revogar_indicacao', v_ind.indicado_id,
          jsonb_build_object('indicacao_id', v_ind.id, 'indicador_id', v_ind.indicador_id, 'indicador_ganhou', v_ind.indicador_ganhou));
END;
$$;
REVOKE ALL ON FUNCTION treino.admin_revogar_indicacao(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_revogar_indicacao(UUID) TO authenticated;

COMMIT;
