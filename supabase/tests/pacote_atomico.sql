-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261104.
-- Como personal logado com assinatura ativa (num aluno de teste com cobrança por aula criado aqui), prova:
--   (a) vender_pacote cria a fatura (aberta, vencimento na data), o pacote ativo e DESLIGA a cobrança por aula;
--   (b) vender outro enquanto há um ativo é recusado, sem sobrar fatura;
--   (c) dados inválidos (0 aulas, "já feitas" maior que o pacote, recebimento futuro, sem forma) são recusados, sem sobrar nada;
--   (d) editar_pacote acompanha a fatura enquanto ela está aberta (quantidade, valor e prazo);
--   (e) outro personal não encerra o pacote alheio (nada acontece);
--   (f) ATOMICIDADE da renovação: se a venda nova falha (já há cobrança começando hoje), o pacote ANTIGO continua ativo;
--   (g) encerrar_pacote liga só as presenças presenciais desde o início à fatura, encurta o prazo da fatura para hoje e encerra;
--   (h) editar pacote encerrado é recusado; vender de novo depois de encerrar na mesma data é recusado (fatura começando hoje);
--   (i) anon não executa as funções.
-- Esperado: "(a) OK" … "(i) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_aluno UUID;
  v_hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_fat UUID;
  v_pac UUID;
  v_aula_hoje UUID; v_aula_ontem UUID; v_aula_dist UUID;
  v_p_hoje UUID; v_p_ontem UUID; v_p_dist UUID;
  v_n INT; v_m INT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT p.id INTO v_dono
  FROM treino.professionals p
  JOIN treino.assinaturas a ON a.professional_id = p.id
  WHERE p.is_admin = FALSE
    AND ((a.status = 'trial' AND a.trial_fim > now()) OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())))
  ORDER BY p.id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal com assinatura ativa; teste não executado'; END IF;
  SELECT p.id INTO v_outro FROM treino.professionals p WHERE p.id <> v_dono AND p.is_admin = FALSE ORDER BY p.id LIMIT 1;

  -- dados de teste (como dono do banco): aluno com cobrança por aula ativa e 3 presenças: hoje (presencial), ontem (presencial) e hoje (à distância)
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_dono, '[E2E] Aluno pacote') RETURNING id INTO v_aluno;
  INSERT INTO treino.aluno_cobranca (aluno_id, professional_id, modelo, valor_aula, dia_ciclo, dias_vencimento, ativo) VALUES (v_aluno, v_dono, 'por_aula', 100, 1, 5, TRUE);
  INSERT INTO treino.aulas (professional_id, starts_at, duration_min, status, tipo) VALUES (v_dono, (v_hoje::TIMESTAMP + TIME '10:00') AT TIME ZONE 'America/Sao_Paulo', 60, 'realizada', 'presencial') RETURNING id INTO v_aula_hoje;
  INSERT INTO treino.aulas (professional_id, starts_at, duration_min, status, tipo) VALUES (v_dono, ((v_hoje - 1)::TIMESTAMP + TIME '10:00') AT TIME ZONE 'America/Sao_Paulo', 60, 'realizada', 'presencial') RETURNING id INTO v_aula_ontem;
  INSERT INTO treino.aulas (professional_id, starts_at, duration_min, status, tipo) VALUES (v_dono, (v_hoje::TIMESTAMP + TIME '11:00') AT TIME ZONE 'America/Sao_Paulo', 1, 'realizada', 'distancia') RETURNING id INTO v_aula_dist;
  INSERT INTO treino.aula_participantes (aula_id, aluno_id, status, cobrar, valor) VALUES (v_aula_hoje, v_aluno, 'presente', TRUE, NULL) RETURNING id INTO v_p_hoje;
  INSERT INTO treino.aula_participantes (aula_id, aluno_id, status, cobrar, valor) VALUES (v_aula_ontem, v_aluno, 'presente', TRUE, NULL) RETURNING id INTO v_p_ontem;
  INSERT INTO treino.aula_participantes (aula_id, aluno_id, status, cobrar, valor) VALUES (v_aula_dist, v_aluno, 'presente', TRUE, NULL) RETURNING id INTO v_p_dist;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a) vende 10 aulas por 500, 30 dias, a receber (vencimento daqui a 7 dias)
  v_fat := treino.vender_pacote(v_aluno, 10, 500, 30, 0, FALSE, FALSE, v_hoje + 7, NULL);
  SELECT id INTO v_pac FROM treino.aluno_pacotes WHERE aluno_id = v_aluno AND status = 'ativo';
  v_log := array_append(v_log, CASE WHEN v_fat IS NOT NULL AND v_pac IS NOT NULL
    AND (SELECT status FROM treino.faturas WHERE id = v_fat) = 'aberta'
    AND (SELECT modelo FROM treino.faturas WHERE id = v_fat) = 'pacote'
    AND (SELECT total FROM treino.faturas WHERE id = v_fat) = 500
    AND (SELECT vencimento FROM treino.faturas WHERE id = v_fat) = v_hoje + 7
    AND (SELECT periodo_fim FROM treino.faturas WHERE id = v_fat) = v_hoje + 29
    AND (SELECT fatura_id FROM treino.aluno_pacotes WHERE id = v_pac) = v_fat
    AND (SELECT ativo FROM treino.aluno_cobranca WHERE aluno_id = v_aluno) = FALSE
    THEN '(a) OK: fatura aberta de 500 criada, pacote ativo ligado a ela e cobrança por aula desligada' ELSE '(a) FALHA' END);

  -- (b) outro pacote com um ativo
  BEGIN
    PERFORM treino.vender_pacote(v_aluno, 5, 200, 30, 0, FALSE, FALSE, v_hoje + 7, NULL);
    v_log := array_append(v_log, '(b) FALHA: vendeu com pacote ativo');
  EXCEPTION WHEN OTHERS THEN
    SELECT count(*) INTO v_n FROM treino.faturas WHERE aluno_id = v_aluno;
    v_log := array_append(v_log, CASE WHEN SQLERRM ILIKE '%já tem um pacote ativo%' AND v_n = 1 THEN '(b) OK: segundo pacote recusado, só 1 fatura' ELSE '(b) FALHA: ' || SQLERRM || ' faturas=' || v_n END);
  END;

  -- (c) inválidos
  DECLARE v_casos INT := 0; v_ok INT := 0;
  BEGIN
    BEGIN v_casos := v_casos + 1; PERFORM treino.vender_pacote(v_aluno, 0, 200, 30, 0, FALSE, FALSE, v_hoje, NULL); EXCEPTION WHEN OTHERS THEN v_ok := v_ok + 1; END;
    BEGIN v_casos := v_casos + 1; PERFORM treino.vender_pacote(v_aluno, 5, 200, 30, 6, FALSE, FALSE, v_hoje, NULL); EXCEPTION WHEN OTHERS THEN v_ok := v_ok + 1; END;
    BEGIN v_casos := v_casos + 1; PERFORM treino.vender_pacote(v_aluno, 5, 200, 30, 0, FALSE, TRUE, v_hoje + 3, 'pix'); EXCEPTION WHEN OTHERS THEN v_ok := v_ok + 1; END;
    BEGIN v_casos := v_casos + 1; PERFORM treino.vender_pacote(v_aluno, 5, 200, 30, 0, FALSE, TRUE, v_hoje, NULL); EXCEPTION WHEN OTHERS THEN v_ok := v_ok + 1; END;
    SELECT count(*) INTO v_n FROM treino.faturas WHERE aluno_id = v_aluno;
    v_log := array_append(v_log, CASE WHEN v_ok = v_casos AND v_n = 1 THEN '(c) OK: 4 entradas inválidas recusadas, nada criado' ELSE '(c) FALHA: recusadas=' || v_ok || '/' || v_casos || ' faturas=' || v_n END);
  END;

  -- (d) editar: 12 aulas por 600, 40 dias; a fatura aberta acompanha
  PERFORM treino.editar_pacote(v_pac, 12, 600, 40, 1, TRUE);
  v_log := array_append(v_log, CASE WHEN (SELECT qtd_aulas FROM treino.faturas WHERE id = v_fat) = 12 AND (SELECT total FROM treino.faturas WHERE id = v_fat) = 600
    AND (SELECT periodo_fim FROM treino.faturas WHERE id = v_fat) = v_hoje + 39
    AND (SELECT qtd_aulas FROM treino.aluno_pacotes WHERE id = v_pac) = 12 AND (SELECT conta_distancia FROM treino.aluno_pacotes WHERE id = v_pac) = TRUE
    THEN '(d) OK: pacote editado e a fatura aberta acompanhou (12 aulas, 600, prazo de 40 dias)' ELSE '(d) FALHA' END);

  -- (e) outro personal não encerra o pacote alheio
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(e) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    BEGIN
      PERFORM treino.encerrar_pacote(v_aluno);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
    v_log := array_append(v_log, CASE WHEN (SELECT status FROM treino.aluno_pacotes WHERE id = v_pac) = 'ativo' THEN '(e) OK: outro personal não encerrou o pacote' ELSE '(e) FALHA: pacote alheio encerrado' END);
  END IF;

  -- (f) renovar enquanto já há fatura começando hoje: a venda nova falha, e o encerramento do antigo precisa ser DESFEITO
  BEGIN
    PERFORM treino.renovar_pacote(v_aluno, 10, 500, 30, 0, FALSE, FALSE, v_hoje + 7, NULL);
    v_log := array_append(v_log, '(f) FALHA: renovou apesar da fatura que começa hoje');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN (SELECT status FROM treino.aluno_pacotes WHERE id = v_pac) = 'ativo' AND SQLERRM ILIKE '%começa hoje%'
      THEN '(f) OK: renovação recusada e o pacote antigo continua ATIVO (atômico)' ELSE '(f) FALHA: ' || SQLERRM || ' status=' || (SELECT status FROM treino.aluno_pacotes WHERE id = v_pac) END);
  END;

  -- (g) encerrar: liga as presenças presenciais desde o início (hoje) à fatura; ontem e a distância ficam de fora
  PERFORM treino.encerrar_pacote(v_aluno);
  SELECT count(*) INTO v_n FROM treino.aula_participantes WHERE fatura_id = v_fat;
  v_log := array_append(v_log, CASE WHEN (SELECT status FROM treino.aluno_pacotes WHERE id = v_pac) = 'encerrado'
    AND (SELECT encerrado_em FROM treino.aluno_pacotes WHERE id = v_pac) IS NOT NULL
    AND v_n = 1 AND (SELECT fatura_id FROM treino.aula_participantes WHERE id = v_p_hoje) = v_fat
    AND (SELECT fatura_id FROM treino.aula_participantes WHERE id = v_p_ontem) IS NULL
    AND (SELECT fatura_id FROM treino.aula_participantes WHERE id = v_p_dist) IS NULL
    AND (SELECT periodo_fim FROM treino.faturas WHERE id = v_fat) = v_hoje
    THEN '(g) OK: pacote encerrado, só a presença presencial de hoje ligada à fatura e o prazo da fatura encurtado para hoje'
    ELSE '(g) FALHA: ligadas=' || v_n || ' fim=' || (SELECT periodo_fim FROM treino.faturas WHERE id = v_fat) END);

  -- (h) pacote encerrado não se edita; nova venda no mesmo dia é recusada (fatura começando hoje)
  BEGIN
    PERFORM treino.editar_pacote(v_pac, 10, 500, 30, 0, FALSE);
    v_m := 0;
  EXCEPTION WHEN OTHERS THEN v_m := 1; END;
  BEGIN
    PERFORM treino.vender_pacote(v_aluno, 10, 500, 30, 0, FALSE, FALSE, v_hoje + 7, NULL);
    v_n := 0;
  EXCEPTION WHEN OTHERS THEN v_n := 1; END;
  v_log := array_append(v_log, CASE WHEN v_m = 1 AND v_n = 1 THEN '(h) OK: editar encerrado e vender no mesmo dia recusados' ELSE '(h) FALHA: editar=' || v_m || ' vender=' || v_n END);

  -- (i)
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN
        NOT has_function_privilege('anon', 'treino.vender_pacote(uuid,integer,numeric,integer,integer,boolean,boolean,date,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'treino.renovar_pacote(uuid,integer,numeric,integer,integer,boolean,boolean,date,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'treino.encerrar_pacote(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'treino.editar_pacote(uuid,integer,numeric,integer,integer,boolean)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'treino.vender_pacote(uuid,integer,numeric,integer,integer,boolean,boolean,date,text)', 'EXECUTE')
    THEN '(i) OK: anon não executa as 4 funções; authenticated sim' ELSE '(i) FALHA: permissões erradas' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
