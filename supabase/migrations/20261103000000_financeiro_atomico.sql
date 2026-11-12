-- ============================================================
-- Financeiro atômico (revisão total do financeiro de 12/11/2026, PR B)
--
-- Hoje o app fecha o ciclo e cancela a fatura em DUAS etapas, de dentro do celular:
--   fechar: cria a fatura  →  liga as aulas a ela.   Se a rede cai no meio, sobra uma fatura SEM as aulas (que voltam a aparecer
--           como cobráveis e podem ser cobradas de novo).
--   cancelar: marca a fatura como cancelada  →  solta as aulas.   Se a rede cai no meio, as aulas ficam presas a uma fatura
--           cancelada e NUNCA mais são cobradas.
-- Cada função abaixo faz tudo numa única transação (ou faz tudo, ou nada).
--
--   treino.fechar_ciclo(...)  : cria a fatura do ciclo e liga as aulas (gravando o valor editado de cada uma), conferindo no banco:
--                               o ciclo já terminou (fecha-se a partir do dia seguinte ao fim, fuso de São Paulo), não há outra fatura
--                               do período, as aulas são do personal e ainda não foram faturadas, e o total bate com os itens.
--   treino.cancelar_fatura(id): cancela só fatura aberta ou enviada (paga não: desfaz o pagamento antes) e solta as aulas.
-- SECURITY INVOKER: a RLS vale como se o personal fizesse cada passo pelo app (assinatura ativa, só o que é dele).
-- Reversão: DROP FUNCTION treino.fechar_ciclo(UUID, DATE, DATE, TEXT, INT, NUMERIC, NUMERIC, TEXT, NUMERIC, DATE, JSONB);
--           DROP FUNCTION treino.cancelar_fatura(UUID);
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.fechar_ciclo(
  p_aluno_id UUID, p_periodo_inicio DATE, p_periodo_fim DATE, p_modelo TEXT, p_qtd_aulas INT,
  p_valor_aulas NUMERIC, p_ajuste NUMERIC, p_ajuste_descricao TEXT, p_total NUMERIC, p_vencimento DATE, p_itens JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_itens JSONB := COALESCE(p_itens, '[]'::JSONB);
  v_qtd INT;
  v_ids UUID[];
  v_fatura UUID;
  v_ligadas INT;
  v_soma NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(v_itens) <> 'array' THEN
    RAISE EXCEPTION 'Itens inválidos.' USING ERRCODE = 'P0001';
  END IF;
  IF p_modelo NOT IN ('por_aula', 'mensal') THEN
    RAISE EXCEPTION 'Modelo de cobrança inválido.' USING ERRCODE = 'P0001';
  END IF;
  IF p_periodo_fim < p_periodo_inicio THEN
    RAISE EXCEPTION 'Período inválido.' USING ERRCODE = 'P0001';
  END IF;
  -- só se fecha a partir do dia seguinte ao último dia do ciclo: aulas feitas depois de um fechamento antecipado ficariam sem fatura
  IF p_periodo_fim >= v_hoje THEN
    RAISE EXCEPTION 'Este ciclo ainda não terminou. Feche a partir do dia seguinte ao último dia do ciclo.' USING ERRCODE = 'P0001';
  END IF;
  IF p_total IS NULL OR p_total <= 0 THEN
    RAISE EXCEPTION 'Não há nada a cobrar neste ciclo.' USING ERRCODE = 'P0001';
  END IF;

  -- uma operação de fechamento por aluno por vez (dois toques ou duas abas)
  PERFORM pg_advisory_xact_lock(hashtextextended('fechar_ciclo:' || p_aluno_id::TEXT, 0));

  IF NOT EXISTS (SELECT 1 FROM treino.alunos a WHERE a.id = p_aluno_id) THEN
    RAISE EXCEPTION 'Aluno não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  v_qtd := jsonb_array_length(v_itens);
  IF v_qtd <> COALESCE(p_qtd_aulas, -1) THEN
    RAISE EXCEPTION 'A quantidade de aulas não confere com os itens.' USING ERRCODE = 'P0001';
  END IF;
  SELECT array_agg((e->>'id')::UUID) INTO v_ids FROM jsonb_array_elements(v_itens) e;

  -- refechar um ciclo cuja fatura foi cancelada: a cancelada sai (UNIQUE aluno + período vale para ela também)
  DELETE FROM treino.faturas WHERE aluno_id = p_aluno_id AND periodo_inicio = p_periodo_inicio AND status = 'cancelada';
  IF EXISTS (SELECT 1 FROM treino.faturas f WHERE f.aluno_id = p_aluno_id AND f.periodo_inicio = p_periodo_inicio) THEN
    RAISE EXCEPTION 'Este ciclo já foi encerrado.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO treino.faturas (professional_id, aluno_id, periodo_inicio, periodo_fim, modelo, qtd_aulas, valor_aulas, ajuste, ajuste_descricao, total, vencimento)
  VALUES (v_uid, p_aluno_id, p_periodo_inicio, p_periodo_fim, p_modelo, v_qtd, COALESCE(p_valor_aulas, 0), COALESCE(p_ajuste, 0), NULLIF(trim(p_ajuste_descricao), ''), p_total, p_vencimento)
  RETURNING id INTO v_fatura;

  IF v_qtd > 0 THEN
    -- liga as aulas à fatura (e grava o valor editado, quando veio): só aulas deste aluno, ainda sem fatura e cobráveis
    UPDATE treino.aula_participantes ap
       SET fatura_id = v_fatura,
           valor = COALESCE((SELECT (e->>'valor')::NUMERIC FROM jsonb_array_elements(v_itens) e WHERE (e->>'id')::UUID = ap.id), ap.valor)
     WHERE ap.id = ANY (v_ids) AND ap.aluno_id = p_aluno_id AND ap.fatura_id IS NULL AND ap.cobrar IS TRUE;
    GET DIAGNOSTICS v_ligadas = ROW_COUNT;
    IF v_ligadas <> v_qtd THEN
      RAISE EXCEPTION 'Alguma aula do ciclo não pode ser faturada (já está em outra fatura ou mudou). Atualize a tela e tente de novo.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- por aula: o total tem que bater com os itens (aulas + ajuste)
  IF p_modelo = 'por_aula' THEN
    SELECT COALESCE(sum(ap.valor), 0) INTO v_soma FROM treino.aula_participantes ap WHERE ap.fatura_id = v_fatura;
    IF abs(v_soma - COALESCE(p_valor_aulas, 0)) > 0.005 OR abs(v_soma + COALESCE(p_ajuste, 0) - p_total) > 0.005 THEN
      RAISE EXCEPTION 'O total não confere com as aulas do ciclo. Atualize a tela e tente de novo.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN v_fatura;
END;
$$;

REVOKE ALL ON FUNCTION treino.fechar_ciclo(UUID, DATE, DATE, TEXT, INT, NUMERIC, NUMERIC, TEXT, NUMERIC, DATE, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.fechar_ciclo(UUID, DATE, DATE, TEXT, INT, NUMERIC, NUMERIC, TEXT, NUMERIC, DATE, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION treino.cancelar_fatura(p_fatura_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '42501';
  END IF;

  SELECT f.status INTO v_status FROM treino.faturas f WHERE f.id = p_fatura_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  -- paga não se cancela de uma vez: o pagamento sumiria do "Recebido"
  IF v_status NOT IN ('aberta', 'enviada') THEN
    RAISE EXCEPTION 'Esta fatura não pode ser cancelada agora: se está paga, desfaça o pagamento antes.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE treino.faturas SET status = 'cancelada' WHERE id = p_fatura_id;
  UPDATE treino.aula_participantes SET fatura_id = NULL WHERE fatura_id = p_fatura_id;
END;
$$;

REVOKE ALL ON FUNCTION treino.cancelar_fatura(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.cancelar_fatura(UUID) TO authenticated;

COMMIT;
