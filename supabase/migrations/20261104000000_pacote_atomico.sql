-- ============================================================
-- Pacote de aulas atômico (revisão total do financeiro de 12/11/2026, PR D)
--
-- Vender, editar, encerrar e renovar um pacote eram feitos em VÁRIAS etapas, do celular (fatura → pacote → desligar a cobrança por aula;
-- ligar as presenças à fatura → encurtar o prazo da fatura → encerrar o pacote; renovar = encerrar + vender). Se a rede caísse no meio
-- sobrava estado pela metade: fatura sem pacote, pacote com a cobrança por aula ainda ligada, pacote encerrado sem relatório, ou o pacote
-- antigo encerrado e nenhum novo. Cada função abaixo faz tudo numa única transação (ou faz tudo, ou nada).
--
--   treino.vender_pacote(...)   : fatura da venda (paga ou aberta) + pacote ativo + desliga a cobrança por aula/mensal do aluno.
--   treino.editar_pacote(...)   : atualiza o pacote ativo e, enquanto a fatura não está paga, a fatura junto (quantidade, valor e prazo).
--   treino.encerrar_pacote(...) : liga as presenças do pacote à fatura da venda, encurta o prazo da fatura se encerrou antes e encerra.
--   treino.renovar_pacote(...)  : encerrar + vender na mesma transação (se a venda nova falha, o pacote antigo continua ativo).
-- SECURITY INVOKER: a RLS vale como se o personal fizesse cada passo pelo app (assinatura ativa, só o que é dele). As mensagens de regra
-- (SQLSTATE P0001) já vêm em português. Datas no fuso de São Paulo.
-- Reversão: DROP FUNCTION treino.vender_pacote(UUID, INT, NUMERIC, INT, INT, BOOLEAN, BOOLEAN, DATE, TEXT);
--           DROP FUNCTION treino.renovar_pacote(UUID, INT, NUMERIC, INT, INT, BOOLEAN, BOOLEAN, DATE, TEXT);
--           DROP FUNCTION treino.encerrar_pacote(UUID); DROP FUNCTION treino.editar_pacote(UUID, INT, NUMERIC, INT, INT, BOOLEAN);
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.encerrar_pacote(p_aluno_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_p treino.aluno_pacotes%ROWTYPE;
  v_fim DATE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pacote:' || p_aluno_id::TEXT, 0));

  SELECT * INTO v_p FROM treino.aluno_pacotes WHERE aluno_id = p_aluno_id AND status = 'ativo' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN; -- sem pacote ativo (ou não é seu): nada a encerrar
  END IF;

  IF v_p.fatura_id IS NOT NULL THEN
    -- as presenças presenciais do pacote (desde o dia de início, em São Paulo) passam a fazer parte da fatura da venda: o relatório lista as aulas
    UPDATE treino.aula_participantes ap
       SET fatura_id = v_p.fatura_id
      FROM treino.aulas a
     WHERE a.id = ap.aula_id AND ap.aluno_id = p_aluno_id AND ap.status = 'presente' AND a.tipo = 'presencial' AND ap.fatura_id IS NULL
       AND (a.starts_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= v_p.inicio;

    -- encerrou antes do prazo: a fatura termina no dia do encerramento (nunca antes do início)
    v_fim := v_p.inicio + (v_p.validade_dias - 1);
    IF v_hoje < v_fim THEN
      UPDATE treino.faturas SET periodo_fim = GREATEST(v_hoje, v_p.inicio) WHERE id = v_p.fatura_id;
    END IF;
  END IF;

  UPDATE treino.aluno_pacotes SET status = 'encerrado', encerrado_em = now() WHERE id = v_p.id;
END;
$$;

REVOKE ALL ON FUNCTION treino.encerrar_pacote(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.encerrar_pacote(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION treino.vender_pacote(
  p_aluno_id UUID, p_qtd_aulas INT, p_valor NUMERIC, p_validade_dias INT, p_aulas_anteriores INT, p_conta_distancia BOOLEAN,
  p_recebido BOOLEAN, p_data DATE, p_forma TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_fatura UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '42501';
  END IF;
  IF p_qtd_aulas IS NULL OR p_qtd_aulas < 1 OR p_qtd_aulas > 500 THEN
    RAISE EXCEPTION 'Quantidade de aulas deve ser de 1 a 500.' USING ERRCODE = 'P0001';
  END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Informe um valor maior que zero.' USING ERRCODE = 'P0001';
  END IF;
  IF p_validade_dias IS NULL OR p_validade_dias < 1 OR p_validade_dias > 730 THEN
    RAISE EXCEPTION 'Prazo deve ser de 1 a 730 dias.' USING ERRCODE = 'P0001';
  END IF;
  IF p_aulas_anteriores IS NULL OR p_aulas_anteriores < 0 OR p_aulas_anteriores > p_qtd_aulas THEN
    RAISE EXCEPTION 'Aulas já feitas não pode passar da quantidade do pacote.' USING ERRCODE = 'P0001';
  END IF;
  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data do pagamento.' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(p_recebido, FALSE) AND p_data > v_hoje THEN
    RAISE EXCEPTION 'A data do recebimento não pode ser futura.' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(p_recebido, FALSE) AND (p_forma IS NULL OR p_forma NOT IN ('pix', 'dinheiro', 'cartao', 'transferencia', 'outro')) THEN
    RAISE EXCEPTION 'Informe a forma de pagamento.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('pacote:' || p_aluno_id::TEXT, 0));

  IF NOT EXISTS (SELECT 1 FROM treino.alunos a WHERE a.id = p_aluno_id) THEN
    RAISE EXCEPTION 'Aluno não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM treino.aluno_pacotes WHERE aluno_id = p_aluno_id AND status = 'ativo') THEN
    RAISE EXCEPTION 'Este aluno já tem um pacote ativo. Renove ou encerre o atual.' USING ERRCODE = 'P0001';
  END IF;

  -- UNIQUE (aluno, início do período) vale até para fatura cancelada: a cancelada sai; uma fatura viva começando hoje impede a venda
  DELETE FROM treino.faturas WHERE aluno_id = p_aluno_id AND periodo_inicio = v_hoje AND status = 'cancelada';
  IF EXISTS (SELECT 1 FROM treino.faturas f WHERE f.aluno_id = p_aluno_id AND f.periodo_inicio = v_hoje) THEN
    RAISE EXCEPTION 'Este aluno já tem uma cobrança que começa hoje. Cancele a fatura anterior ou renove amanhã.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO treino.faturas (professional_id, aluno_id, periodo_inicio, periodo_fim, modelo, qtd_aulas, valor_aulas, ajuste, total, vencimento, status, paga_em, forma_pagamento)
  VALUES (
    v_uid, p_aluno_id, v_hoje, v_hoje + (p_validade_dias - 1), 'pacote', p_qtd_aulas, p_valor, 0, p_valor,
    CASE WHEN COALESCE(p_recebido, FALSE) THEN NULL ELSE p_data END,
    CASE WHEN COALESCE(p_recebido, FALSE) THEN 'paga' ELSE 'aberta' END,
    CASE WHEN COALESCE(p_recebido, FALSE) THEN p_data ELSE NULL END,
    CASE WHEN COALESCE(p_recebido, FALSE) THEN p_forma ELSE NULL END
  )
  RETURNING id INTO v_fatura;

  INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias, inicio, aulas_anteriores, conta_distancia, fatura_id)
  VALUES (v_uid, p_aluno_id, p_qtd_aulas, p_valor, p_validade_dias, v_hoje, p_aulas_anteriores, COALESCE(p_conta_distancia, FALSE), v_fatura);

  -- quem vira aluno de pacote deixa a cobrança por aula/mensal (senão entraria no fechamento de ciclo)
  UPDATE treino.aluno_cobranca SET ativo = FALSE WHERE aluno_id = p_aluno_id;

  RETURN v_fatura;
END;
$$;

REVOKE ALL ON FUNCTION treino.vender_pacote(UUID, INT, NUMERIC, INT, INT, BOOLEAN, BOOLEAN, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.vender_pacote(UUID, INT, NUMERIC, INT, INT, BOOLEAN, BOOLEAN, DATE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION treino.renovar_pacote(
  p_aluno_id UUID, p_qtd_aulas INT, p_valor NUMERIC, p_validade_dias INT, p_aulas_anteriores INT, p_conta_distancia BOOLEAN,
  p_recebido BOOLEAN, p_data DATE, p_forma TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM treino.encerrar_pacote(p_aluno_id);
  RETURN treino.vender_pacote(p_aluno_id, p_qtd_aulas, p_valor, p_validade_dias, p_aulas_anteriores, p_conta_distancia, p_recebido, p_data, p_forma);
END;
$$;

REVOKE ALL ON FUNCTION treino.renovar_pacote(UUID, INT, NUMERIC, INT, INT, BOOLEAN, BOOLEAN, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.renovar_pacote(UUID, INT, NUMERIC, INT, INT, BOOLEAN, BOOLEAN, DATE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION treino.editar_pacote(
  p_pacote_id UUID, p_qtd_aulas INT, p_valor NUMERIC, p_validade_dias INT, p_aulas_anteriores INT, p_conta_distancia BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_p treino.aluno_pacotes%ROWTYPE;
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '42501';
  END IF;
  IF p_qtd_aulas IS NULL OR p_qtd_aulas < 1 OR p_qtd_aulas > 500 THEN
    RAISE EXCEPTION 'Quantidade de aulas deve ser de 1 a 500.' USING ERRCODE = 'P0001';
  END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Informe um valor maior que zero.' USING ERRCODE = 'P0001';
  END IF;
  IF p_validade_dias IS NULL OR p_validade_dias < 1 OR p_validade_dias > 730 THEN
    RAISE EXCEPTION 'Prazo deve ser de 1 a 730 dias.' USING ERRCODE = 'P0001';
  END IF;
  IF p_aulas_anteriores IS NULL OR p_aulas_anteriores < 0 OR p_aulas_anteriores > p_qtd_aulas THEN
    RAISE EXCEPTION 'Aulas já feitas não pode passar da quantidade do pacote.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_p FROM treino.aluno_pacotes WHERE id = p_pacote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pacote não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_p.status <> 'ativo' THEN
    RAISE EXCEPTION 'Este pacote já foi encerrado.' USING ERRCODE = 'P0001';
  END IF;

  -- enquanto a fatura da venda não está paga, ela acompanha a quantidade, o valor e o prazo (paga: o que foi recebido não muda)
  IF v_p.fatura_id IS NOT NULL THEN
    SELECT f.status INTO v_status FROM treino.faturas f WHERE f.id = v_p.fatura_id FOR UPDATE;
    IF v_status IN ('aberta', 'enviada') THEN
      UPDATE treino.faturas
         SET qtd_aulas = p_qtd_aulas, valor_aulas = p_valor, total = p_valor, periodo_fim = v_p.inicio + (p_validade_dias - 1)
       WHERE id = v_p.fatura_id;
    END IF;
  END IF;

  UPDATE treino.aluno_pacotes
     SET qtd_aulas = p_qtd_aulas, valor = p_valor, validade_dias = p_validade_dias, aulas_anteriores = p_aulas_anteriores,
         conta_distancia = COALESCE(p_conta_distancia, FALSE)
   WHERE id = p_pacote_id;
END;
$$;

REVOKE ALL ON FUNCTION treino.editar_pacote(UUID, INT, NUMERIC, INT, INT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.editar_pacote(UUID, INT, NUMERIC, INT, INT, BOOLEAN) TO authenticated;

COMMIT;
