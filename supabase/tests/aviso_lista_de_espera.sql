-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261098.
-- Prova:
--   (a) a primeira entrada na espera cria 1 aviso com qtd = 1;
--   (b) a segunda e a terceira, com o aviso ainda não lido, SOMAM no mesmo aviso (qtd = 3, uma linha só);
--   (c) o aviso não leva nome nem telefone (o payload só tem "qtd");
--   (d) depois de lido, a próxima entrada abre um aviso novo (qtd = 1);
--   (e) authenticated e anon não podem executar a função.
-- Esperado: "(a) OK" … "(e) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_n INT;
  v_qtd INT;
  v_payload JSONB;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT p.id INTO v_dono FROM treino.professionals p WHERE p.is_admin = FALSE ORDER BY p.id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal; teste não executado'; END IF;
  DELETE FROM treino.notificacoes_professor WHERE professional_id = v_dono AND tipo = 'espera_agenda';

  PERFORM treino.avisar_espera_agenda(v_dono);
  SELECT count(*), max((payload->>'qtd')::int) INTO v_n, v_qtd FROM treino.notificacoes_professor WHERE professional_id = v_dono AND tipo = 'espera_agenda';
  v_log := array_append(v_log, CASE WHEN v_n = 1 AND v_qtd = 1 THEN '(a) OK: 1 aviso, qtd = 1' ELSE 'FALHA (a): n=' || v_n || ' qtd=' || coalesce(v_qtd::text, 'null') END);

  PERFORM treino.avisar_espera_agenda(v_dono);
  PERFORM treino.avisar_espera_agenda(v_dono);
  SELECT count(*), max((payload->>'qtd')::int) INTO v_n, v_qtd FROM treino.notificacoes_professor WHERE professional_id = v_dono AND tipo = 'espera_agenda';
  v_log := array_append(v_log, CASE WHEN v_n = 1 AND v_qtd = 3 THEN '(b) OK: agrupou em 1 aviso, qtd = 3' ELSE 'FALHA (b): n=' || v_n || ' qtd=' || coalesce(v_qtd::text, 'null') END);

  SELECT payload INTO v_payload FROM treino.notificacoes_professor WHERE professional_id = v_dono AND tipo = 'espera_agenda' LIMIT 1;
  v_log := array_append(v_log, CASE WHEN (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v_payload) k) = ARRAY['qtd'] THEN '(c) OK: payload só tem qtd' ELSE 'FALHA (c): payload ' || v_payload::text END);

  UPDATE treino.notificacoes_professor SET lida = TRUE WHERE professional_id = v_dono AND tipo = 'espera_agenda';
  PERFORM treino.avisar_espera_agenda(v_dono);
  SELECT count(*) INTO v_n FROM treino.notificacoes_professor WHERE professional_id = v_dono AND tipo = 'espera_agenda';
  SELECT (payload->>'qtd')::int INTO v_qtd FROM treino.notificacoes_professor WHERE professional_id = v_dono AND tipo = 'espera_agenda' AND lida = FALSE;
  v_log := array_append(v_log, CASE WHEN v_n = 2 AND v_qtd = 1 THEN '(d) OK: depois de lido, abre aviso novo' ELSE 'FALHA (d): n=' || v_n || ' qtd=' || coalesce(v_qtd::text, 'null') END);

  v_log := array_append(v_log, CASE
    WHEN has_function_privilege('authenticated', 'treino.avisar_espera_agenda(uuid)', 'EXECUTE') OR has_function_privilege('anon', 'treino.avisar_espera_agenda(uuid)', 'EXECUTE')
    THEN 'FALHA (e): authenticated ou anon executa'
    ELSE '(e) OK: só o service_role executa' END);

  RAISE EXCEPTION 'RESULTADO (nada foi gravado): %', array_to_string(v_log, E'\n');
END $$;
