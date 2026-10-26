-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece
-- na mensagem desse erro. Rode DEPOIS das migrations 20261059 e 20261061. Cria um aluno de teste e, como personal logado
-- (o primeiro da tabela, com assinatura/trial ATIVO), prova:
--   (a) antes da lixeira o personal enxerga a fatura, a participação em aula futura e o vínculo do horário do aluno;
--   (b) ao mandar para a lixeira, a aula futura que ficou vazia some, o horário fixo vazio é desativado e a cobrança é desativada;
--   (c) depois disso o personal NÃO enxerga mais a fatura do aluno (policy lixeira_esconde);
--   (d) resumo_apagar_aluno() continua contando a fatura (1) para a confirmação de "Apagar agora";
--   (e) ao tirar da lixeira, a fatura volta a aparecer.
-- Esperado: "(a) OK" … "(e) OK", sem "FALHA".

DO $$
DECLARE
  v_prof UUID;
  v_aluno UUID := gen_random_uuid();
  v_horario UUID := gen_random_uuid();
  v_aula UUID := gen_random_uuid();
  v_n INT;
  v_ativo BOOLEAN;
  v_cob BOOLEAN;
  v_fat BIGINT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT id INTO v_prof FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  INSERT INTO treino.alunos (id, professional_id, name, active) VALUES (v_aluno, v_prof, '[TESTE] aluno lixeira', FALSE);
  INSERT INTO treino.aluno_cobranca (aluno_id, professional_id, modelo, valor_mensal, dia_ciclo, ativo) VALUES (v_aluno, v_prof, 'mensal', 100, 1, TRUE);
  INSERT INTO treino.horarios_fixos (id, professional_id, weekday, start_time) VALUES (v_horario, v_prof, 1, '07:00');
  INSERT INTO treino.horario_alunos (horario_id, aluno_id) VALUES (v_horario, v_aluno);
  INSERT INTO treino.aulas (id, professional_id, horario_id, starts_at) VALUES (v_aula, v_prof, v_horario, now() + interval '3 days');
  INSERT INTO treino.aula_participantes (aula_id, aluno_id) VALUES (v_aula, v_aluno);
  INSERT INTO treino.faturas (professional_id, aluno_id, periodo_inicio, periodo_fim, modelo, vencimento, total) VALUES (v_prof, v_aluno, current_date - 30, current_date - 1, 'mensal', current_date + 5, 100);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  SELECT count(*) INTO v_n FROM treino.faturas WHERE aluno_id = v_aluno;
  SELECT count(*) INTO v_fat FROM treino.aula_participantes WHERE aluno_id = v_aluno;
  v_log := array_append(v_log, CASE WHEN v_n = 1 AND v_fat = 1 THEN '(a) OK: antes da lixeira enxerga fatura e aula' ELSE '(a) FALHA: faturas=' || v_n || ' participações=' || v_fat END);

  -- (b)
  UPDATE treino.alunos SET apagado_em = now() WHERE id = v_aluno;
  RESET ROLE;
  SELECT count(*) INTO v_n FROM treino.aulas WHERE id = v_aula;
  SELECT active INTO v_ativo FROM treino.horarios_fixos WHERE id = v_horario;
  SELECT ativo INTO v_cob FROM treino.aluno_cobranca WHERE aluno_id = v_aluno;
  v_log := array_append(v_log, CASE WHEN v_n = 0 AND v_ativo = FALSE AND v_cob = FALSE THEN '(b) OK: aula futura, horário e cobrança saíram' ELSE '(b) FALHA: aulas=' || v_n || ' horario_ativo=' || coalesce(v_ativo::TEXT, 'NULL') || ' cobranca_ativa=' || coalesce(v_cob::TEXT, 'NULL') END);

  -- (c)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM treino.faturas WHERE aluno_id = v_aluno;
  v_log := array_append(v_log, CASE WHEN v_n = 0 THEN '(c) OK: fatura escondida na lixeira' ELSE '(c) FALHA: ainda enxerga ' || v_n END);

  -- (d)
  SELECT faturas INTO v_fat FROM treino.resumo_apagar_aluno(v_aluno);
  v_log := array_append(v_log, CASE WHEN v_fat = 1 THEN '(d) OK: resumo_apagar_aluno conta a fatura' ELSE '(d) FALHA: faturas=' || coalesce(v_fat::TEXT, 'NULL') END);

  -- (e)
  UPDATE treino.alunos SET apagado_em = NULL WHERE id = v_aluno;
  SELECT count(*) INTO v_n FROM treino.faturas WHERE aluno_id = v_aluno;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(e) OK: voltou a aparecer ao restaurar' ELSE '(e) FALHA: faturas=' || v_n END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
