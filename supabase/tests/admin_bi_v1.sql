-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece na mensagem.
-- Rode DEPOIS da migration 20261079. Prova:
--   (a) um personal comum NÃO consegue chamar admin_bi_v1() nem admin_lista_acao();
--   (b) as funções internas (*_dados) NÃO são chamáveis pelo cliente;
--   (c) registrar_origem_cadastro(): conta nova registra (limpando o texto); a segunda chamada e a conta antiga são ignoradas;
--   (d) como dono do banco, admin_bi_v1_dados() devolve meta/funil/cidades/origens, com o funil coerente (3 alunos ≤ 1º aluno ≤ cadastrou);
--       período inválido é recusado; admin_lista_acao_dados() executa e só traz os 3 motivos conhecidos.
-- Esperado: "(a) OK" … "(d) OK", sem "FALHA".
DO $$
DECLARE
  v_prof UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_j JSONB;
  v_r TEXT;
  v_src TEXT;
  v_n INT;
BEGIN
  SELECT id INTO v_prof FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM treino.admin_bi_v1(30);
    v_log := array_append(v_log, '(a) FALHA: personal comum chamou admin_bi_v1');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Acesso restrito ao admin%' THEN '(a) OK: admin_bi_v1 exige admin' ELSE '(a) FALHA: ' || SQLERRM END);
  END;
  BEGIN
    PERFORM * FROM treino.admin_lista_acao();
    v_log := array_append(v_log, '(a) FALHA: personal comum chamou admin_lista_acao');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Acesso restrito ao admin%' THEN '(a) OK: admin_lista_acao exige admin' ELSE '(a) FALHA: ' || SQLERRM END);
  END;
  BEGIN
    PERFORM treino.admin_bi_v1_dados(30, NULL, NULL, NULL);
    v_log := array_append(v_log, '(b) FALHA: cliente chamou admin_bi_v1_dados');
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(b) OK: admin_bi_v1_dados fechada ao cliente'); END;
  BEGIN
    PERFORM * FROM treino.admin_lista_acao_dados();
    v_log := array_append(v_log, '(b) FALHA: cliente chamou admin_lista_acao_dados');
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(b) OK: admin_lista_acao_dados fechada ao cliente'); END;
  RESET ROLE;

  -- (c) conta nova (criada agora, dentro desta transação) registra; segunda chamada ignorada; conta antiga ignorada
  UPDATE treino.professionals SET created_at = now(), origem_source = NULL, origem_medium = NULL, origem_campaign = NULL WHERE id = v_prof;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_origem_cadastro('Instagram!!', 'Reels ', 'Tema_1');
  RESET ROLE;
  SELECT origem_source INTO v_src FROM treino.professionals WHERE id = v_prof;
  v_log := array_append(v_log, CASE WHEN v_r = 'registrado' AND v_src = 'instagram' THEN '(c) OK: conta nova registrou "instagram" (texto limpo)' ELSE '(c) FALHA: ' || v_r || ' / ' || COALESCE(v_src, 'NULL') END);
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_origem_cadastro('outro', '', '');
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'ignorado' THEN '(c) OK: segunda chamada ignorada (primeiro toque vence)' ELSE '(c) FALHA: segunda chamada = ' || v_r END);
  UPDATE treino.professionals SET created_at = now() - interval '10 days', origem_source = NULL WHERE id = v_prof;
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_origem_cadastro('instagram', '', '');
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'ignorado' THEN '(c) OK: conta antiga ignorada' ELSE '(c) FALHA: conta antiga = ' || v_r END);

  -- (d) como dono do banco
  v_j := treino.admin_bi_v1_dados(30, NULL, NULL, NULL);
  v_log := array_append(v_log, CASE
    WHEN v_j ? 'meta' AND v_j ? 'funil' AND v_j ? 'cidades' AND v_j ? 'origens'
     AND (v_j->'funil'->>'tres_alunos')::int <= (v_j->'funil'->>'primeiro_aluno')::int
     AND (v_j->'funil'->>'primeiro_aluno')::int <= (v_j->'funil'->>'cadastrou')::int
    THEN '(d) OK: BI v1 completo e funil coerente (cadastrou ' || (v_j->'funil'->>'cadastrou') || ', 1º aluno ' || (v_j->'funil'->>'primeiro_aluno') || ', 3 alunos ' || (v_j->'funil'->>'tres_alunos') || ', pagou ' || (v_j->'funil'->>'pagou') || ')'
    ELSE '(d) FALHA: ' || left(v_j::TEXT, 200) END);
  BEGIN
    PERFORM treino.admin_bi_v1_dados(7, NULL, NULL, NULL);
    v_log := array_append(v_log, '(d) FALHA: aceitou período 7');
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, CASE WHEN SQLERRM = 'Período inválido.' THEN '(d) OK: período inválido recusado' ELSE '(d) FALHA: ' || SQLERRM END); END;
  SELECT count(*) INTO v_n FROM treino.admin_lista_acao_dados() WHERE motivo NOT IN ('trial_sem_ativacao', 'pagante_sem_uso', 'vencendo');
  v_log := array_append(v_log, CASE WHEN v_n = 0 THEN '(d) OK: lista de ação só com os 3 motivos' ELSE '(d) FALHA: motivos desconhecidos=' || v_n END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
