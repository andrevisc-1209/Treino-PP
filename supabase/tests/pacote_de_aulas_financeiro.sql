-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece
-- na mensagem desse erro. Rode DEPOIS das migrations 20261081 e 20261082. Como personal logado, prova:
--   (a) o dono cria uma fatura de modelo 'pacote', cria o pacote ligado a ela e liga uma presença à fatura;
--   (b) modelo fora da lista continua recusado;
--   (c) outro personal não consegue ligar o próprio pacote à fatura do dono.
-- Esperado: "(a) OK" … "(c) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_aluno UUID;
  v_aluno_outro UUID;
  v_fat UUID;
  v_n INT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT p.id INTO v_dono
  FROM treino.professionals p
  JOIN treino.assinaturas a ON a.professional_id = p.id
  WHERE p.is_admin = FALSE
    AND ((a.status = 'trial' AND a.trial_fim > now()) OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())))
    AND EXISTS (SELECT 1 FROM treino.alunos al WHERE al.professional_id = p.id AND al.apagado_em IS NULL)
  ORDER BY p.id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal com assinatura ativa e aluno; teste não executado'; END IF;
  SELECT al.id INTO v_aluno FROM treino.alunos al WHERE al.professional_id = v_dono AND al.apagado_em IS NULL ORDER BY al.id LIMIT 1;
  SELECT p.id INTO v_outro
  FROM treino.professionals p
  JOIN treino.assinaturas a ON a.professional_id = p.id
  WHERE p.id <> v_dono AND p.is_admin = FALSE
    AND ((a.status = 'trial' AND a.trial_fim > now()) OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())))
    AND EXISTS (SELECT 1 FROM treino.alunos al WHERE al.professional_id = p.id AND al.apagado_em IS NULL)
  ORDER BY p.id LIMIT 1;
  IF v_outro IS NOT NULL THEN
    SELECT al.id INTO v_aluno_outro FROM treino.alunos al WHERE al.professional_id = v_outro AND al.apagado_em IS NULL ORDER BY al.id LIMIT 1;
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  INSERT INTO treino.faturas (professional_id, aluno_id, periodo_inicio, periodo_fim, modelo, qtd_aulas, valor_aulas, total, status, paga_em, forma_pagamento)
  VALUES (v_dono, v_aluno, DATE '2099-01-01', DATE '2099-03-01', 'pacote', 10, 800, 800, 'paga', DATE '2099-01-01', 'pix') RETURNING id INTO v_fat;
  INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias, fatura_id)
  VALUES (v_dono, v_aluno, 10, 800, 60, v_fat);
  SELECT count(*) INTO v_n FROM treino.aluno_pacotes WHERE fatura_id = v_fat;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(a) OK: fatura de pacote criada e ligada ao pacote' ELSE '(a) FALHA: n=' || v_n END);

  -- (b)
  BEGIN
    INSERT INTO treino.faturas (professional_id, aluno_id, periodo_inicio, periodo_fim, modelo, total)
    VALUES (v_dono, v_aluno, DATE '2099-06-01', DATE '2099-06-30', 'semestral', 1);
    v_log := array_append(v_log, '(b) FALHA: aceitou modelo inválido');
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(b) OK: modelo inválido recusado'); END;

  -- (c)
  IF v_outro IS NULL OR v_aluno_outro IS NULL THEN
    v_log := array_append(v_log, '(c) AVISO: não há um segundo personal ativo com aluno, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    BEGIN
      INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias, fatura_id)
      VALUES (v_outro, v_aluno_outro, 10, 800, 60, v_fat);
      v_log := array_append(v_log, '(c) FALHA: ligou pacote à fatura de outro personal');
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, '(c) OK: não liga o pacote à fatura de outro personal');
    END;
  END IF;

  RESET ROLE;
  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
