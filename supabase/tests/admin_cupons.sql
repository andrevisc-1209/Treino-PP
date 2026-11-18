-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS das migrations
-- 20261105 e 20261106. Usa uma conta admin existente (simula o token aal2 do MFA) e dois personais comuns (B resgata um cupom). Prova:
--   (a) personal comum NÃO chama admin_cupons(), admin_criar_campanha_cupom() nem admin_atualizar_campanha_cupom();
--   (b) o admin cria uma campanha (código em maiúsculas) e a ação entra em admin_logs; código repetido, dias 0, validade passada, limite 0
--       e código curto são recusados com mensagem em português;
--   (c) admin_cupons() mostra a campanha com 0 usos; depois de B resgatar (conta nova, com 1 aluno cadastrado depois do resgate e 1 pagamento no
--       livro), mostra 1 uso, 1 ativado e 1 pagante, e a lista de recentes traz só o NOME do personal;
--   (d) pausar: a campanha fica inativa e o resgate de outro personal vira 'invalido'; reativar volta a valer;
--   (e) o limite de usos não pode ficar abaixo dos usos já feitos; estender a validade funciona e grava em admin_logs;
--   (f) anon não executa as 3 funções.
-- Esperado: "(a) OK" … "(f) OK", sem "FALHA".
DO $$
DECLARE
  v_adm UUID;
  v_a UUID;
  v_b UUID;
  v_id UUID;
  v_j JSONB;
  v_r JSONB;
  v_n INT;
  v_ok BOOLEAN;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT id INTO v_adm FROM treino.professionals WHERE is_admin = TRUE ORDER BY id LIMIT 1;
  SELECT (array_agg(id))[1], (array_agg(id))[2] INTO v_a, v_b FROM (
    SELECT p.id FROM treino.professionals p JOIN treino.assinaturas s ON s.professional_id = p.id WHERE p.is_admin = FALSE ORDER BY p.id LIMIT 2
  ) x;
  IF v_adm IS NULL OR v_a IS NULL OR v_b IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - preciso de 1 admin e 2 personais com assinatura; teste não executado'; END IF;

  DELETE FROM treino.alunos WHERE professional_id IN (v_a, v_b);
  DELETE FROM treino.resgates_cupom WHERE professional_id IN (v_a, v_b);
  DELETE FROM treino.cupom_tentativas WHERE professional_id IN (v_a, v_b);
  DELETE FROM treino.pagamentos_assinatura WHERE professional_id = v_b;
  UPDATE treino.professionals SET created_at = now() - INTERVAL '1 day' WHERE id IN (v_a, v_b);
  UPDATE treino.assinaturas SET status = 'trial', trial_fim = now() + INTERVAL '10 days', bonus_ate = NULL, assinatura_fim = NULL WHERE professional_id IN (v_a, v_b);

  -- (a) personal comum
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_n := 0;
  BEGIN PERFORM treino.admin_cupons(); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Acesso restrito ao admin%' THEN v_n := v_n + 1; END IF; END;
  BEGIN PERFORM treino.admin_criar_campanha_cupom('ABCD1', 'x', 10, now() + INTERVAL '1 day', 5); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Acesso restrito ao admin%' THEN v_n := v_n + 1; END IF; END;
  BEGIN PERFORM treino.admin_atualizar_campanha_cupom(gen_random_uuid(), FALSE, NULL, NULL); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Acesso restrito ao admin%' THEN v_n := v_n + 1; END IF; END;
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_n = 3 THEN '(a) OK: as 3 funções exigem admin' ELSE '(a) FALHA: só ' || v_n || ' de 3 recusaram' END);

  -- (b) admin cria e valida
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_id := treino.admin_criar_campanha_cupom(' teste77 ', '[E2E] Parceiro', 90, now() + INTERVAL '30 days', 3);
  v_ok := TRUE;
  BEGIN PERFORM treino.admin_criar_campanha_cupom('TESTE77', 'x', 10, now() + INTERVAL '1 day', 5); v_ok := FALSE; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Já existe uma campanha%' THEN v_ok := FALSE; END IF; END;
  BEGIN PERFORM treino.admin_criar_campanha_cupom('NOVO88', 'x', 0, now() + INTERVAL '1 day', 5); v_ok := FALSE; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Os dias do cupom%' THEN v_ok := FALSE; END IF; END;
  BEGIN PERFORM treino.admin_criar_campanha_cupom('NOVO88', 'x', 10, now() - INTERVAL '1 day', 5); v_ok := FALSE; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'A validade%' THEN v_ok := FALSE; END IF; END;
  BEGIN PERFORM treino.admin_criar_campanha_cupom('NOVO88', 'x', 10, now() + INTERVAL '1 day', 0); v_ok := FALSE; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'O limite de usos%' THEN v_ok := FALSE; END IF; END;
  BEGIN PERFORM treino.admin_criar_campanha_cupom('AB', 'x', 10, now() + INTERVAL '1 day', 5); v_ok := FALSE; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'O código precisa%' THEN v_ok := FALSE; END IF; END;
  RESET ROLE;
  SELECT count(*) INTO v_n FROM treino.admin_logs WHERE acao = 'criar_campanha_cupom' AND detalhes->>'codigo' = 'TESTE77' AND admin_id = v_adm;
  v_log := array_append(v_log, CASE WHEN v_ok AND v_n = 1 AND (SELECT codigo FROM treino.campanhas_cupom WHERE id = v_id) = 'TESTE77'
    THEN '(b) OK: criou TESTE77 (maiúsculas), registrou em admin_logs e recusou os 5 casos inválidos' ELSE '(b) FALHA: ok=' || v_ok::TEXT || ' logs=' || v_n END);

  -- (c) funil: B resgata, ganha um aluno depois e tem 1 pagamento
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('TESTE77');
  RESET ROLE;
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_b, '[E2E] Aluno cupom admin');
  INSERT INTO treino.pagamentos_assinatura (payment_id, professional_id, plano, valor) VALUES ('E2E-CUPOM-1', v_b, 'mensal', 15);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_j := treino.admin_cupons();
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r->>'resultado' = 'ok'
    AND (SELECT (x->>'usos')::INT = 1 AND (x->>'ativados')::INT = 1 AND (x->>'pagantes')::INT = 1 FROM jsonb_array_elements(v_j->'campanhas') x WHERE x->>'codigo' = 'TESTE77')
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_j->'recentes') r WHERE r->>'codigo' = 'TESTE77' AND r ? 'personal_nome' AND NOT (r ? 'email') AND NOT (r ? 'cpf'))
    THEN '(c) OK: 1 uso, 1 ativado, 1 pagante; recentes só com nome do personal' ELSE '(c) FALHA: ' || coalesce(v_r::TEXT, 'null') END);

  -- (d) pausar e reativar
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  PERFORM treino.admin_atualizar_campanha_cupom(v_id, FALSE, NULL, NULL);
  RESET ROLE;
  v_ok := (SELECT ativa FROM treino.campanhas_cupom WHERE id = v_id) = FALSE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('TESTE77');
  RESET ROLE;
  v_ok := v_ok AND v_r->>'resultado' = 'invalido';
  DELETE FROM treino.cupom_tentativas WHERE professional_id = v_a;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  PERFORM treino.admin_atualizar_campanha_cupom(v_id, TRUE, NULL, NULL);
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('TESTE77');
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_ok AND v_r->>'resultado' = 'ok' THEN '(d) OK: pausada vira "invalido"; reativada, A resgata' ELSE '(d) FALHA: ' || coalesce(v_r::TEXT, 'null') END);

  -- (e) limite abaixo dos usos (2 usos feitos) e estender validade
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_ok := TRUE;
  BEGIN PERFORM treino.admin_atualizar_campanha_cupom(v_id, NULL, NULL, 1); v_ok := FALSE; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'O limite não pode ser menor%' THEN v_ok := FALSE; END IF; END;
  PERFORM treino.admin_atualizar_campanha_cupom(v_id, NULL, now() + INTERVAL '90 days', 10);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM treino.admin_logs WHERE acao = 'atualizar_campanha_cupom' AND detalhes->>'codigo' = 'TESTE77';
  v_log := array_append(v_log, CASE WHEN v_ok AND v_n >= 3 AND (SELECT max_usos FROM treino.campanhas_cupom WHERE id = v_id) = 10
    THEN '(e) OK: limite abaixo dos usos recusado; estender validade e limite funciona e grava em admin_logs' ELSE '(e) FALHA: ok=' || v_ok::TEXT || ' logs=' || v_n END);

  -- (f) anon
  v_log := array_append(v_log, CASE WHEN
        NOT has_function_privilege('anon', 'treino.admin_cupons()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'treino.admin_criar_campanha_cupom(text,text,integer,timestamp with time zone,integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'treino.admin_atualizar_campanha_cupom(uuid,boolean,timestamp with time zone,integer)', 'EXECUTE')
    THEN '(f) OK: anon não executa as 3 funções' ELSE '(f) FALHA: permissões erradas' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
