-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261107.
-- Usa uma conta admin existente (simula o token aal2 do MFA) e dois personais comuns (A = conta ANTIGA, com assinatura paga e 1 aluno; B = conta NOVA). Prova:
--   (a) admin cria uma campanha "novos" e uma "todos"; um valor de público inválido é recusado com mensagem em português;
--   (b) conta antiga tenta a campanha "novos": 'nao_novo';
--   (c) conta antiga usa a campanha "todos": 'ok', e os dias SOMAM depois do fim da assinatura paga (bonus_ate = assinatura_fim + dias);
--   (d) conta nova continua podendo usar a campanha "novos": 'ok';
--   (e) admin_cupons() devolve o público de cada campanha;
--   (f) a função antiga de 5 parâmetros não existe mais e a nova não é executável por anon.
-- Esperado: "(a) OK" … "(f) OK", sem "FALHA".
DO $$
DECLARE
  v_adm UUID;
  v_a UUID;
  v_b UUID;
  v_fim TIMESTAMPTZ;
  v_bonus TIMESTAMPTZ;
  v_r JSONB;
  v_j JSONB;
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
  UPDATE treino.professionals SET created_at = now() - INTERVAL '30 days' WHERE id = v_a;
  UPDATE treino.professionals SET created_at = now() - INTERVAL '1 day' WHERE id = v_b;
  v_fim := now() + INTERVAL '20 days';
  UPDATE treino.assinaturas SET status = 'ativa', plano = 'mensal', assinatura_fim = v_fim, bonus_ate = NULL WHERE professional_id = v_a;
  UPDATE treino.assinaturas SET status = 'trial', trial_fim = now() + INTERVAL '10 days', bonus_ate = NULL, assinatura_fim = NULL WHERE professional_id = v_b;
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_a, '[E2E] Aluno antigo');

  -- (a) criar as duas campanhas
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  PERFORM treino.admin_criar_campanha_cupom('PUBN77', '[E2E] So novos', 30, now() + INTERVAL '30 days', 5, 'novos');
  PERFORM treino.admin_criar_campanha_cupom('PUBT77', '[E2E] Todos', 60, now() + INTERVAL '30 days', 5, 'todos');
  v_ok := TRUE;
  BEGIN PERFORM treino.admin_criar_campanha_cupom('PUBX77', 'x', 10, now() + INTERVAL '1 day', 5, 'qualquer'); v_ok := FALSE; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Escolha quem pode usar%' THEN v_ok := FALSE; END IF; END;
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_ok
    AND (SELECT publico FROM treino.campanhas_cupom WHERE codigo = 'PUBN77') = 'novos'
    AND (SELECT publico FROM treino.campanhas_cupom WHERE codigo = 'PUBT77') = 'todos'
    THEN '(a) OK: criou "novos" e "todos"; público inválido recusado' ELSE '(a) FALHA' END);

  -- (b) conta antiga na campanha "novos"
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('PUBN77');
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r->>'resultado' = 'nao_novo' THEN '(b) OK: conta antiga não usa campanha "novos"' ELSE '(b) FALHA: ' || v_r::TEXT END);

  -- (c) conta antiga na campanha "todos": soma depois da assinatura paga
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('PUBT77');
  RESET ROLE;
  SELECT bonus_ate INTO v_bonus FROM treino.assinaturas WHERE professional_id = v_a;
  v_log := array_append(v_log, CASE WHEN v_r->>'resultado' = 'ok' AND (v_r->>'dias')::INT = 60
    AND abs(extract(epoch FROM (v_bonus - (v_fim + INTERVAL '60 days')))) < 1
    THEN '(c) OK: conta antiga usa "todos"; bonus_ate = fim da assinatura + 60 dias' ELSE '(c) FALHA: ' || v_r::TEXT || ' bonus=' || coalesce(v_bonus::TEXT, 'null') END);

  -- (d) conta nova na campanha "novos"
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('PUBN77');
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r->>'resultado' = 'ok' THEN '(d) OK: conta nova usa "novos"' ELSE '(d) FALHA: ' || v_r::TEXT END);

  -- (e) o painel devolve o público
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_j := treino.admin_cupons();
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN
        (SELECT x->>'publico' FROM jsonb_array_elements(v_j->'campanhas') x WHERE x->>'codigo' = 'PUBN77') = 'novos'
    AND (SELECT x->>'publico' FROM jsonb_array_elements(v_j->'campanhas') x WHERE x->>'codigo' = 'PUBT77') = 'todos'
    THEN '(e) OK: admin_cupons mostra o público de cada campanha' ELSE '(e) FALHA' END);

  -- (f) assinatura da função
  SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'treino' AND p.proname = 'admin_criar_campanha_cupom' AND p.pronargs = 5;
  v_log := array_append(v_log, CASE WHEN v_n = 0
    AND NOT has_function_privilege('anon', 'treino.admin_criar_campanha_cupom(text,text,integer,timestamp with time zone,integer,text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'treino.admin_criar_campanha_cupom(text,text,integer,timestamp with time zone,integer,text)', 'EXECUTE')
    THEN '(f) OK: a função antiga de 5 parâmetros não existe; a nova não é de anon' ELSE '(f) FALHA' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
