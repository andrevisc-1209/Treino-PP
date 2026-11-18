-- ============================================================
-- Migration: 20261106000000_admin_cupons.sql
--
-- Cupom de parceiro, parte 4: o admin cria e acompanha as campanhas (a tabela e o resgate são da migration 20261105).
--   admin_cupons()                       : JSON com totais, campanhas (com funil: usos, ativados, pagantes) e os 30 resgates mais recentes.
--       ativado = quem resgatou e cadastrou pelo menos 1 aluno (fora da lixeira); pagante = quem resgatou e já tem pagamento no livro de
--       receita (pagamentos_assinatura). Só nome do PERSONAL e números: nenhum dado de aluno, e-mail ou CPF.
--   admin_criar_campanha_cupom(...)      : cria uma campanha (código A-Z/0-9 de 4 a 20, parceiro, 1 a 365 dias, validade, limite de usos).
--   admin_atualizar_campanha_cupom(...)  : pausa/reativa, muda a validade e o limite de usos (o limite nunca fica abaixo dos usos já feitos).
-- Mesmo padrão das funções admin_*: SECURITY DEFINER, exige is_admin() (que exige MFA) antes de tudo, e grava em treino.admin_logs
-- (target_professional_id fica nulo: a ação é sobre a campanha; o histórico mostra só a ação e quem fez).
-- Reversão: DROP das 3 funções e recolocar o CHECK antigo de admin_logs.acao (sem as 2 ações novas).
-- ============================================================

BEGIN;

ALTER TABLE treino.admin_logs DROP CONSTRAINT IF EXISTS admin_logs_acao_check;
ALTER TABLE treino.admin_logs
  ADD CONSTRAINT admin_logs_acao_check CHECK (acao IN (
    'reset_senha', 'alterar_trial', 'alterar_plano', 'alterar_cpf', 'revogar_indicacao', 'criar_campanha_cupom', 'atualizar_campanha_cupom'
  ));

-- ----- 1. painel -----
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
      SELECT c.id, c.codigo, c.parceiro, c.dias_bonus, c.valido_de, c.valido_ate, c.max_usos, c.ativa, c.created_at,
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

-- ----- 2. criar -----
CREATE OR REPLACE FUNCTION treino.admin_criar_campanha_cupom(p_codigo TEXT, p_parceiro TEXT, p_dias INT, p_valido_ate TIMESTAMPTZ, p_max_usos INT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cod TEXT := upper(btrim(coalesce(p_codigo, '')));
  v_parc TEXT := btrim(coalesce(p_parceiro, ''));
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
  IF EXISTS (SELECT 1 FROM treino.campanhas_cupom WHERE codigo = v_cod) THEN
    RAISE EXCEPTION 'Já existe uma campanha com esse código.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO treino.campanhas_cupom (codigo, parceiro, dias_bonus, valido_de, valido_ate, max_usos, criado_por)
  VALUES (v_cod, v_parc, p_dias, now(), p_valido_ate, p_max_usos, (SELECT auth.uid()))
  RETURNING id INTO v_id;

  INSERT INTO treino.admin_logs (admin_id, acao, target_professional_id, detalhes)
  VALUES ((SELECT auth.uid()), 'criar_campanha_cupom', NULL,
          jsonb_build_object('campanha_id', v_id, 'codigo', v_cod, 'dias', p_dias, 'max_usos', p_max_usos, 'valido_ate', p_valido_ate));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION treino.admin_criar_campanha_cupom(TEXT, TEXT, INT, TIMESTAMPTZ, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_criar_campanha_cupom(TEXT, TEXT, INT, TIMESTAMPTZ, INT) TO authenticated;

-- ----- 3. pausar, reativar, estender, mudar o limite (NULL = não muda) -----
CREATE OR REPLACE FUNCTION treino.admin_atualizar_campanha_cupom(p_id UUID, p_ativa BOOLEAN, p_valido_ate TIMESTAMPTZ, p_max_usos INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_camp treino.campanhas_cupom%ROWTYPE;
  v_usos INT;
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_camp FROM treino.campanhas_cupom WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não encontrada.' USING ERRCODE = 'P0001'; END IF;
  SELECT count(*) INTO v_usos FROM treino.resgates_cupom WHERE campanha_id = p_id;

  IF p_valido_ate IS NOT NULL AND p_valido_ate <= v_camp.valido_de THEN
    RAISE EXCEPTION 'A validade precisa ser depois do início da campanha.' USING ERRCODE = 'P0001';
  END IF;
  IF p_max_usos IS NOT NULL AND (p_max_usos < v_usos OR p_max_usos < 1 OR p_max_usos > 100000) THEN
    RAISE EXCEPTION 'O limite não pode ser menor que os % usos já feitos (nem passar de 100.000).', v_usos USING ERRCODE = 'P0001';
  END IF;

  UPDATE treino.campanhas_cupom
  SET ativa = coalesce(p_ativa, ativa),
      valido_ate = coalesce(p_valido_ate, valido_ate),
      max_usos = coalesce(p_max_usos, max_usos)
  WHERE id = p_id;

  INSERT INTO treino.admin_logs (admin_id, acao, target_professional_id, detalhes)
  VALUES ((SELECT auth.uid()), 'atualizar_campanha_cupom', NULL,
          jsonb_build_object('campanha_id', p_id, 'codigo', v_camp.codigo, 'ativa', p_ativa, 'valido_ate', p_valido_ate, 'max_usos', p_max_usos));
END;
$$;
REVOKE ALL ON FUNCTION treino.admin_atualizar_campanha_cupom(UUID, BOOLEAN, TIMESTAMPTZ, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_atualizar_campanha_cupom(UUID, BOOLEAN, TIMESTAMPTZ, INT) TO authenticated;

COMMIT;
