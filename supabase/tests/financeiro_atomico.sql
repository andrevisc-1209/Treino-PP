-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261103.
-- Como personal logado com assinatura ativa (num aluno de teste criado aqui), prova:
--   (a) fechar_ciclo cria a fatura, liga as aulas e grava o valor editado de uma delas;
--   (b) refechar o mesmo período dá "já foi encerrado";
--   (c) ciclo que ainda não terminou é recusado;
--   (d) ATOMICIDADE: se uma aula não pode ser faturada (já está em outra fatura), NENHUMA fatura é criada e a outra aula continua solta;
--   (e) total que não bate com as aulas é recusado, sem deixar fatura;
--   (f) cancelar_fatura: fatura paga é recusada; enviada é cancelada e solta as aulas;
--   (g) refechar um ciclo cuja fatura foi cancelada: com erro, a cancelada continua lá (atômico); com o total certo, vira 1 fatura nova;
--   (h) outro personal não cancela fatura alheia;
--   (i) anon não executa as funções.
-- Esperado: "(a) OK" … "(i) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_aluno UUID;
  v_aula1 UUID; v_aula2 UUID; v_aula3 UUID; v_aula4 UUID;
  v_p1 UUID; v_p2 UUID; v_p3 UUID; v_p4 UUID;
  v_fat UUID; v_fat2 UUID;
  v_n INT; v_m INT; v_valor NUMERIC;
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_f TEXT := 'treino.fechar_ciclo(uuid,date,date,text,integer,numeric,numeric,text,numeric,date,jsonb)';
BEGIN
  SELECT p.id INTO v_dono
  FROM treino.professionals p
  JOIN treino.assinaturas a ON a.professional_id = p.id
  WHERE p.is_admin = FALSE
    AND ((a.status = 'trial' AND a.trial_fim > now()) OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())))
  ORDER BY p.id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal com assinatura ativa; teste não executado'; END IF;
  SELECT p.id INTO v_outro FROM treino.professionals p WHERE p.id <> v_dono AND p.is_admin = FALSE ORDER BY p.id LIMIT 1;

  -- dados de teste (como dono do banco): 1 aluno e 4 aulas com presença cobrável: jan (100, 100, 50) e fev (70)
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_dono, '[E2E] Aluno financeiro') RETURNING id INTO v_aluno;
  INSERT INTO treino.aulas (professional_id, starts_at, duration_min, status) VALUES (v_dono, '2026-01-05T13:00:00-03:00', 60, 'realizada') RETURNING id INTO v_aula1;
  INSERT INTO treino.aulas (professional_id, starts_at, duration_min, status) VALUES (v_dono, '2026-01-12T13:00:00-03:00', 60, 'realizada') RETURNING id INTO v_aula2;
  INSERT INTO treino.aulas (professional_id, starts_at, duration_min, status) VALUES (v_dono, '2026-01-19T13:00:00-03:00', 60, 'realizada') RETURNING id INTO v_aula3;
  INSERT INTO treino.aulas (professional_id, starts_at, duration_min, status) VALUES (v_dono, '2026-02-02T13:00:00-03:00', 60, 'realizada') RETURNING id INTO v_aula4;
  INSERT INTO treino.aula_participantes (aula_id, aluno_id, status, cobrar, valor) VALUES (v_aula1, v_aluno, 'presente', TRUE, 100) RETURNING id INTO v_p1;
  INSERT INTO treino.aula_participantes (aula_id, aluno_id, status, cobrar, valor) VALUES (v_aula2, v_aluno, 'presente', TRUE, 100) RETURNING id INTO v_p2;
  INSERT INTO treino.aula_participantes (aula_id, aluno_id, status, cobrar, valor) VALUES (v_aula3, v_aluno, 'presente', TRUE, 50) RETURNING id INTO v_p3;
  INSERT INTO treino.aula_participantes (aula_id, aluno_id, status, cobrar, valor) VALUES (v_aula4, v_aluno, 'presente', TRUE, 70) RETURNING id INTO v_p4;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a) fecha janeiro com a aula 2 editada de 100 para 80: itens 100 + 80 + 50 = 230
  v_fat := treino.fechar_ciclo(v_aluno, '2026-01-01', '2026-01-31', 'por_aula', 3, 230, 0, NULL, 230, '2026-02-05',
    jsonb_build_array(jsonb_build_object('id', v_p1), jsonb_build_object('id', v_p2, 'valor', 80), jsonb_build_object('id', v_p3)));
  SELECT count(*), COALESCE(sum(valor), 0) INTO v_n, v_valor FROM treino.aula_participantes WHERE fatura_id = v_fat;
  v_log := array_append(v_log, CASE WHEN v_fat IS NOT NULL AND v_n = 3 AND v_valor = 230 AND (SELECT valor FROM treino.aula_participantes WHERE id = v_p2) = 80
    THEN '(a) OK: fatura criada, 3 aulas ligadas e o valor editado (80) gravado na aula' ELSE '(a) FALHA: n=' || v_n || ' soma=' || v_valor END);

  -- (b) mesmo período de novo
  BEGIN
    PERFORM treino.fechar_ciclo(v_aluno, '2026-01-01', '2026-01-31', 'mensal', 0, 0, 100, 'x', 100, '2026-02-05', '[]'::JSONB);
    v_log := array_append(v_log, '(b) FALHA: fechou o mesmo período duas vezes');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM ILIKE '%já foi encerrado%' THEN '(b) OK: período já encerrado recusado' ELSE '(b) FALHA: ' || SQLERRM END);
  END;

  -- (c) ciclo que só termina em 2099
  BEGIN
    PERFORM treino.fechar_ciclo(v_aluno, '2099-01-01', '2099-01-31', 'mensal', 0, 0, 100, NULL, 100, '2099-02-05', '[]'::JSONB);
    v_log := array_append(v_log, '(c) FALHA: fechou ciclo que não terminou');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM ILIKE '%ainda não terminou%' THEN '(c) OK: ciclo em andamento recusado' ELSE '(c) FALHA: ' || SQLERRM END);
  END;

  -- (d) fevereiro com uma aula nova (p4) e uma que já está na fatura de janeiro (p1): tem que falhar INTEIRO
  BEGIN
    PERFORM treino.fechar_ciclo(v_aluno, '2026-02-01', '2026-02-28', 'por_aula', 2, 170, 0, NULL, 170, '2026-03-05',
      jsonb_build_array(jsonb_build_object('id', v_p4), jsonb_build_object('id', v_p1)));
    v_log := array_append(v_log, '(d) FALHA: faturou uma aula que já estava em outra fatura');
  EXCEPTION WHEN OTHERS THEN
    SELECT count(*) INTO v_n FROM treino.faturas WHERE aluno_id = v_aluno AND periodo_inicio = '2026-02-01';
    v_log := array_append(v_log, CASE WHEN v_n = 0 AND (SELECT fatura_id FROM treino.aula_participantes WHERE id = v_p4) IS NULL
      THEN '(d) OK: aula já faturada recusada; nenhuma fatura criada e a outra aula continua solta' ELSE '(d) FALHA: sobrou fatura=' || v_n END);
  END;

  -- (e) total que não bate com as aulas (170 em vez de 70)
  BEGIN
    PERFORM treino.fechar_ciclo(v_aluno, '2026-02-01', '2026-02-28', 'por_aula', 1, 70, 0, NULL, 170, '2026-03-05', jsonb_build_array(jsonb_build_object('id', v_p4)));
    v_log := array_append(v_log, '(e) FALHA: aceitou total que não bate');
  EXCEPTION WHEN OTHERS THEN
    SELECT count(*) INTO v_n FROM treino.faturas WHERE aluno_id = v_aluno AND periodo_inicio = '2026-02-01';
    v_log := array_append(v_log, CASE WHEN v_n = 0 AND SQLERRM ILIKE '%não confere%' THEN '(e) OK: total que não bate recusado, sem deixar fatura'
      ELSE '(e) FALHA: ' || SQLERRM || ' fatura=' || v_n END);
  END;

  -- (f1) fatura paga não se cancela (marca como paga como dono do banco, volta ao personal)
  RESET ROLE;
  UPDATE treino.faturas SET status = 'paga', paga_em = '2026-02-10', forma_pagamento = 'pix' WHERE id = v_fat;
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM treino.cancelar_fatura(v_fat);
    v_log := array_append(v_log, '(f1) FALHA: cancelou fatura paga');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM ILIKE '%desfaça o pagamento%' AND (SELECT status FROM treino.faturas WHERE id = v_fat) = 'paga'
      THEN '(f1) OK: fatura paga não se cancela' ELSE '(f1) FALHA: ' || SQLERRM END);
  END;

  -- (f2) enviada: cancela e solta as aulas
  RESET ROLE;
  UPDATE treino.faturas SET status = 'enviada', paga_em = NULL, forma_pagamento = NULL WHERE id = v_fat;
  SET LOCAL ROLE authenticated;
  PERFORM treino.cancelar_fatura(v_fat);
  SELECT count(*) INTO v_n FROM treino.aula_participantes WHERE fatura_id = v_fat;
  v_log := array_append(v_log, CASE WHEN (SELECT status FROM treino.faturas WHERE id = v_fat) = 'cancelada' AND v_n = 0
    AND (SELECT fatura_id FROM treino.aula_participantes WHERE id = v_p1) IS NULL
    THEN '(f2) OK: fatura enviada cancelada e as aulas voltaram a ficar soltas' ELSE '(f2) FALHA: aulas ainda ligadas=' || v_n END);

  -- (g1) refechar janeiro com total errado (250 para itens que somam 230): recusa E a fatura cancelada continua lá (atômico)
  BEGIN
    PERFORM treino.fechar_ciclo(v_aluno, '2026-01-01', '2026-01-31', 'por_aula', 3, 250, 0, NULL, 250, '2026-02-05',
      jsonb_build_array(jsonb_build_object('id', v_p1), jsonb_build_object('id', v_p2), jsonb_build_object('id', v_p3)));
    v_log := array_append(v_log, '(g1) FALHA: aceitou total 250 para itens que somam 230');
  EXCEPTION WHEN OTHERS THEN
    SELECT count(*) INTO v_n FROM treino.faturas WHERE aluno_id = v_aluno AND periodo_inicio = '2026-01-01' AND status = 'cancelada';
    SELECT count(*) INTO v_m FROM treino.aula_participantes WHERE aluno_id = v_aluno AND fatura_id IS NOT NULL;
    v_log := array_append(v_log, CASE WHEN SQLERRM ILIKE '%não confere%' AND v_n = 1 AND v_m = 0
      THEN '(g1) OK: refechamento com erro recusado e nada mudou (a cancelada segue lá, aulas soltas)' ELSE '(g1) FALHA: ' || SQLERRM || ' canceladas=' || v_n || ' ligadas=' || v_m END);
  END;

  -- (g2) refecha com o total certo: a cancelada sai e entra 1 fatura aberta
  v_fat2 := treino.fechar_ciclo(v_aluno, '2026-01-01', '2026-01-31', 'por_aula', 3, 230, 0, NULL, 230, '2026-02-05',
    jsonb_build_array(jsonb_build_object('id', v_p1), jsonb_build_object('id', v_p2), jsonb_build_object('id', v_p3)));
  SELECT count(*) INTO v_n FROM treino.faturas WHERE aluno_id = v_aluno AND periodo_inicio = '2026-01-01';
  v_log := array_append(v_log, CASE WHEN v_n = 1 AND (SELECT status FROM treino.faturas WHERE id = v_fat2) = 'aberta'
    THEN '(g2) OK: ciclo com fatura cancelada refechado (1 fatura do período)' ELSE '(g2) FALHA: faturas do período=' || v_n END);

  -- (h) outro personal não cancela fatura alheia
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(h) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    BEGIN
      PERFORM treino.cancelar_fatura(v_fat2);
      v_log := array_append(v_log, '(h) FALHA: outro personal cancelou fatura alheia');
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, CASE WHEN (SELECT status FROM treino.faturas WHERE id = v_fat2) IS NULL THEN '(h) OK: outro personal não enxerga nem cancela a fatura'
        ELSE '(h) OK: recusado (' || left(SQLERRM, 50) || ')' END);
    END;
  END IF;

  -- (i)
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN NOT has_function_privilege('anon', v_f, 'EXECUTE') AND NOT has_function_privilege('anon', 'treino.cancelar_fatura(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', v_f, 'EXECUTE') AND has_function_privilege('authenticated', 'treino.cancelar_fatura(uuid)', 'EXECUTE')
    THEN '(i) OK: anon não executa; authenticated sim' ELSE '(i) FALHA: permissões erradas' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
