-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS das migrations
-- 20261069 e 20261071. Usa dois personais comuns (A indica, B é indicado) e uma conta admin existente (simula o token aal2 do MFA):
--   (a) um personal comum NÃO consegue chamar admin_indicacoes(), admin_bonus_personais() nem admin_revogar_indicacao();
--   (b) o admin enxerga B em admin_bonus_personais() quando B tem mês grátis vigente;
--   (c) admin_indicacoes() conta a indicação e marca os sinais "mesmo telefone" e "concedida rápida"; devolve só nomes e números;
--   (d) admin_revogar_indicacao() muda o status para 'revogada', tira o mês grátis de B e grava em admin_logs;
--   (e) revogar de novo (já revogada) é recusado.
-- Esperado: "(a) OK" … "(e) OK", sem "FALHA".
DO $$
DECLARE
  v_adm UUID;
  v_a UUID;
  v_b UUID;
  v_ind UUID := gen_random_uuid();
  v_j JSONB;
  v_n INT;
  v_bonus TIMESTAMPTZ;
  v_st TEXT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT id INTO v_adm FROM treino.professionals WHERE is_admin = TRUE ORDER BY id LIMIT 1;
  SELECT (array_agg(id))[1], (array_agg(id))[2] INTO v_a, v_b FROM (SELECT id FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 2) x;
  IF v_adm IS NULL OR v_a IS NULL OR v_b IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - preciso de 1 admin e 2 personais cadastrados; teste não executado'; END IF;

  DELETE FROM treino.indicacoes WHERE indicador_id IN (v_a, v_b) OR indicado_id IN (v_a, v_b);
  UPDATE treino.professionals SET phone = '(11) 91111-2222' WHERE id IN (v_a, v_b);
  UPDATE treino.professionals SET created_at = now() - INTERVAL '10 minutes' WHERE id = v_b;
  UPDATE treino.assinaturas SET bonus_ate = now() + INTERVAL '40 days' WHERE professional_id IN (v_a, v_b);
  INSERT INTO treino.indicacoes (id, indicador_id, indicado_id, status, indicador_ganhou, concedida_em)
  VALUES (v_ind, v_a, v_b, 'concedida', TRUE, now());

  -- (a) personal comum
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_n := 0;
  BEGIN PERFORM treino.admin_indicacoes(); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Acesso restrito ao admin%' THEN v_n := v_n + 1; END IF; END;
  BEGIN PERFORM * FROM treino.admin_bonus_personais(); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Acesso restrito ao admin%' THEN v_n := v_n + 1; END IF; END;
  BEGIN PERFORM treino.admin_revogar_indicacao(v_ind); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Acesso restrito ao admin%' THEN v_n := v_n + 1; END IF; END;
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_n = 3 THEN '(a) OK: as 3 funções exigem admin' ELSE '(a) FALHA: só ' || v_n || ' de 3 recusaram' END);

  -- (b) admin (token aal2)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM treino.admin_bonus_personais() WHERE professional_id = v_b;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(b) OK: admin vê o mês grátis de B' ELSE '(b) FALHA: linhas=' || v_n END);

  -- (c)
  v_j := treino.admin_indicacoes();
  v_log := array_append(v_log, CASE WHEN (v_j->'totais'->>'concedidas')::INT >= 1
      AND (v_j->'recentes'->0->>'mesmo_telefone')::BOOLEAN AND (v_j->'recentes'->0->>'concedida_rapida')::BOOLEAN
      AND (v_j->'recentes'->0 ? 'indicador_nome') AND NOT (v_j->'recentes'->0 ? 'email') AND NOT (v_j->'recentes'->0 ? 'cpf')
      AND jsonb_array_length(v_j->'por_indicador') >= 1
    THEN '(c) OK: totais e sinais certos, sem e-mail nem CPF' ELSE '(c) FALHA: ' || left(v_j::TEXT, 300) END);

  -- (d)
  PERFORM treino.admin_revogar_indicacao(v_ind);
  RESET ROLE;
  SELECT status INTO v_st FROM treino.indicacoes WHERE id = v_ind;
  SELECT bonus_ate INTO v_bonus FROM treino.assinaturas WHERE professional_id = v_b;
  SELECT count(*) INTO v_n FROM treino.admin_logs WHERE acao = 'revogar_indicacao' AND detalhes->>'indicacao_id' = v_ind::TEXT;
  v_log := array_append(v_log, CASE WHEN v_st = 'revogada' AND v_bonus < now() + INTERVAL '11 days' AND v_bonus > now() + INTERVAL '9 days' AND v_n = 1
    THEN '(d) OK: revogada, 30 dias a menos para B, log gravado' ELSE '(d) FALHA: status=' || coalesce(v_st, 'NULL') || ' bonus=' || coalesce(v_bonus::TEXT, 'NULL') || ' logs=' || v_n END);

  -- (e)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM treino.admin_revogar_indicacao(v_ind);
    v_log := array_append(v_log, '(e) FALHA: revogou duas vezes');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Só uma indicação já concedida%' THEN '(e) OK: segunda revogação recusada' ELSE '(e) FALHA: ' || SQLERRM END);
  END;
  RESET ROLE;

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
