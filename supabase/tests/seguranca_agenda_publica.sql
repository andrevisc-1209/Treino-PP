-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261102.
-- Prova:
--   (a) link novo da agenda pública sai com sufixo de 8 caracteres hex;
--   (b) limite_atingido só lê (não soma) e vira true ao atingir o máximo;
--   (c) criar_pedido_agenda respeita o teto de pendentes e recusa o pedido repetido;
--   (d) expirar_pedidos_agenda expira o pendente antigo e o de horário passado, e não mexe no recente;
--   (e) as 3 funções novas não são executáveis por anon nem authenticated.
-- Esperado: "(a) OK" … "(e) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_slug TEXT;
  v_r JSONB;
  v_n INT;
  v_pend INT;
  v_futuro TIMESTAMPTZ := now() + interval '3 days';
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT p.id INTO v_dono FROM treino.professionals p WHERE p.is_admin = FALSE ORDER BY p.id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal; teste não executado'; END IF;

  -- (b) feito como dono do banco: a RPC do contador é service_role
  PERFORM treino.upsert_rate_limit('teste:seg-agenda', 3, 3600);
  PERFORM treino.upsert_rate_limit('teste:seg-agenda', 3, 3600);
  v_log := array_append(v_log, CASE WHEN NOT treino.limite_atingido('teste:seg-agenda', 3, 3600) AND NOT treino.limite_atingido('teste:seg-agenda', 3, 3600)
    THEN '(b1) OK: com 2 de 3 ainda não atingiu (e ler não soma)' ELSE '(b1) FALHA: atingiu cedo ou a leitura somou' END);
  PERFORM treino.upsert_rate_limit('teste:seg-agenda', 3, 3600);
  v_log := array_append(v_log, CASE WHEN treino.limite_atingido('teste:seg-agenda', 3, 3600) THEN '(b2) OK: com 3 de 3 atingiu' ELSE '(b2) FALHA: não atingiu' END);
  v_log := array_append(v_log, CASE WHEN NOT treino.limite_atingido('teste:chave-que-nao-existe', 3, 3600) THEN '(b3) OK: chave sem registro = não atingiu' ELSE '(b3) FALHA' END);

  SELECT count(*) INTO v_pend FROM treino.pedidos_agenda WHERE professional_id = v_dono AND status = 'pendente';

  -- (c) teto relativo (o personal pode já ter pedidos reais pendentes): cabem 2 a mais; o terceiro é "cheio"; dois entram, o terceiro é "cheio"; o mesmo telefone/horário vira "duplicado"
  v_r := treino.criar_pedido_agenda(v_dono, '[E2E] A', '5521999990031', NULL, NULL, NULL, v_futuro, 60, v_pend + 2);
  v_log := array_append(v_log, CASE WHEN v_r->>'estado' = 'ok' THEN '(c1) OK: primeiro pedido entrou' ELSE '(c1) FALHA: ' || v_r::TEXT END);
  v_r := treino.criar_pedido_agenda(v_dono, '[E2E] A', '5521999990031', NULL, NULL, NULL, v_futuro, 60, v_pend + 5);
  v_log := array_append(v_log, CASE WHEN v_r->>'estado' = 'duplicado' THEN '(c2) OK: mesmo telefone e horário = duplicado' ELSE '(c2) FALHA: ' || v_r::TEXT END);
  v_r := treino.criar_pedido_agenda(v_dono, '[E2E] B', '5521999990032', 'oi', NULL, 'musculacao', v_futuro, 60, v_pend + 2);
  v_log := array_append(v_log, CASE WHEN v_r->>'estado' = 'ok' THEN '(c3) OK: segundo pedido entrou' ELSE '(c3) FALHA: ' || v_r::TEXT END);
  v_r := treino.criar_pedido_agenda(v_dono, '[E2E] C', '5521999990033', NULL, NULL, NULL, v_futuro, 60, v_pend + 2);
  v_log := array_append(v_log, CASE WHEN v_r->>'estado' = 'cheio' THEN '(c4) OK: teto de pendentes barrou o terceiro' ELSE '(c4) FALHA: ' || v_r::TEXT END);

  -- (d) um pendente antigo (criado há 8 dias) e um de horário passado expiram; o de agora (futuro) fica
  INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min, created_at)
  VALUES (v_dono, '[E2E] Antigo', '5521999990034', now() + interval '10 days', 60, now() - interval '8 days');
  INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min)
  VALUES (v_dono, '[E2E] Passado', '5521999990035', now() - interval '1 hour', 60);
  v_n := treino.expirar_pedidos_agenda();
  v_log := array_append(v_log, CASE WHEN v_n >= 2
    AND (SELECT status FROM treino.pedidos_agenda WHERE visitante_nome = '[E2E] Antigo') = 'indisponivel'
    AND (SELECT status FROM treino.pedidos_agenda WHERE visitante_nome = '[E2E] Passado') = 'indisponivel'
    AND (SELECT status FROM treino.pedidos_agenda WHERE visitante_nome = '[E2E] B') = 'pendente'
    THEN '(d) OK: expirou o antigo e o de horário passado; o recente continua pendente' ELSE '(d) FALHA: expirou=' || v_n END);

  -- (a) como personal logado: o link novo tem 8 hex no fim
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_slug := treino.configurar_agenda_publica(TRUE, TRUE);
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_slug ~ '-[0-9a-f]{8}$' THEN '(a) OK: link novo com 8 caracteres hex' ELSE '(a) FALHA: ' || COALESCE(v_slug, 'null') END);

  -- (e)
  v_log := array_append(v_log, CASE WHEN
        NOT has_function_privilege('authenticated', 'treino.limite_atingido(text,integer,integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'treino.limite_atingido(text,integer,integer)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'treino.criar_pedido_agenda(uuid,text,text,text,text,text,timestamptz,integer,integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'treino.criar_pedido_agenda(uuid,text,text,text,text,text,timestamptz,integer,integer)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'treino.expirar_pedidos_agenda()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'treino.expirar_pedidos_agenda()', 'EXECUTE')
    AND has_function_privilege('service_role', 'treino.criar_pedido_agenda(uuid,text,text,text,text,text,timestamptz,integer,integer)', 'EXECUTE')
    THEN '(e) OK: só service_role executa as 3 funções' ELSE '(e) FALHA: permissão aberta demais' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
