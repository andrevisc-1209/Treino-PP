-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261073.
-- Usa dois personais que já existem (A indica, B é o indicado; B é "reformado" dentro da transação: sem alunos e sem indicação) e prova que
-- a indicação só vale para conta criada DEPOIS de o link ser aberto:
--   (a) conta criada há 1 hora, link aberto há 60 s (a conta já existia antes do link) -> 'nao_novo';
--   (b) conta criada há 20 min, link aberto há 10 min (a conta ainda é anterior ao link) -> 'nao_novo';
--   (c) conta criada há 30 s, link aberto há 10 min (conta criada depois do link, sem alunos) -> 'registrado';
--   (d) link aberto há mais de 48 horas -> 'expirado';
--   (e) segundos ausentes ou negativos -> 'expirado';
--   (f) a função antiga de 1 parâmetro NÃO existe mais (não dá para pular a regra).
-- Esperado: "(a) OK" … "(f) OK", sem "FALHA".
DO $$
DECLARE
  v_ids UUID[];
  v_a UUID;
  v_b UUID;
  v_cod_a TEXT;
  v_r TEXT;
  v_n INT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT array_agg(id) INTO v_ids FROM (SELECT id FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 2) x;
  IF coalesce(array_length(v_ids, 1), 0) < 2 THEN RAISE EXCEPTION 'RESULTADO: AVISO - preciso de 2 personais cadastrados; teste não executado'; END IF;
  v_a := v_ids[1];
  v_b := v_ids[2];
  SELECT codigo_indicacao INTO v_cod_a FROM treino.professionals WHERE id = v_a;

  DELETE FROM treino.indicacoes WHERE indicador_id IN (v_a, v_b) OR indicado_id IN (v_a, v_b);
  DELETE FROM treino.alunos WHERE professional_id = v_b; -- B precisa estar sem alunos (tudo isto é desfeito no fim)

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);

  -- (a)
  UPDATE treino.professionals SET created_at = now() - INTERVAL '1 hour' WHERE id = v_b;
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_indicacao(v_cod_a, 60);
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'nao_novo' THEN '(a) OK: conta anterior ao link não registra' ELSE '(a) FALHA: ' || v_r END);

  -- (b)
  UPDATE treino.professionals SET created_at = now() - INTERVAL '20 minutes' WHERE id = v_b;
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_indicacao(v_cod_a, 600);
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'nao_novo' THEN '(b) OK: conta criada 10 min antes do link não registra' ELSE '(b) FALHA: ' || v_r END);

  -- (d) e (e) antes do (c), para não consumir o registro
  UPDATE treino.professionals SET created_at = now() - INTERVAL '30 seconds' WHERE id = v_b;
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_indicacao(v_cod_a, 200000);
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'expirado' THEN '(d) OK: link com mais de 48 h expira' ELSE '(d) FALHA: ' || v_r END);

  SET LOCAL ROLE authenticated;
  v_r := coalesce(treino.registrar_indicacao(v_cod_a, NULL), 'x') || '/' || treino.registrar_indicacao(v_cod_a, -5);
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'expirado/expirado' THEN '(e) OK: segundos ausentes ou negativos expiram' ELSE '(e) FALHA: ' || v_r END);

  -- (c)
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_indicacao(v_cod_a, 600);
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'registrado' THEN '(c) OK: conta criada depois do link, sem alunos, registra' ELSE '(c) FALHA: ' || v_r END);

  -- (f)
  SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'treino' AND p.proname = 'registrar_indicacao' AND p.pronargs = 1;
  v_log := array_append(v_log, CASE WHEN v_n = 0 THEN '(f) OK: a função antiga de 1 parâmetro não existe mais' ELSE '(f) FALHA: ainda existe a de 1 parâmetro' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
