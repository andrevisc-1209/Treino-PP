-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261090.
--   (a) o sino aceita um aviso 'pedido_aula' SEM aluno; um segundo aviso do mesmo pedido é recusado (um por pedido);
--   (b) os outros tipos continuam exigindo aluno (um 'treino_concluido' sem aluno é recusado);
--   (c) o WhatsApp aceita o tipo 'pedido_aula' mais de uma vez no mesmo dia (por evento), enquanto 'briefing_diario' continua com um por dia.
-- Esperado: "(a) OK" … "(c) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT id INTO v_dono FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  -- (a)
  INSERT INTO treino.notificacoes_professor (professional_id, tipo, payload) VALUES (v_dono, 'pedido_aula', '{"pedido_id":"teste-1"}'::JSONB);
  v_log := array_append(v_log, '(a) OK: aviso de pedido de aula sem aluno aceito');
  BEGIN
    INSERT INTO treino.notificacoes_professor (professional_id, tipo, payload) VALUES (v_dono, 'pedido_aula', '{"pedido_id":"teste-1"}'::JSONB);
    v_log := array_append(v_log, '(a) FALHA: aceitou dois avisos do mesmo pedido');
  EXCEPTION WHEN unique_violation THEN v_log := array_append(v_log, '(a) OK: segundo aviso do mesmo pedido recusado'); END;

  -- (b)
  BEGIN
    INSERT INTO treino.notificacoes_professor (professional_id, tipo, payload) VALUES (v_dono, 'treino_concluido', '{}'::JSONB);
    v_log := array_append(v_log, '(b) FALHA: treino concluído sem aluno foi aceito');
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(b) OK: outros tipos continuam exigindo aluno'); END;

  -- (c)
  INSERT INTO treino.whatsapp_log (professional_id, tipo, status, dia) VALUES (v_dono, 'pedido_aula', 'enviado', current_date);
  BEGIN
    INSERT INTO treino.whatsapp_log (professional_id, tipo, status, dia) VALUES (v_dono, 'pedido_aula', 'enviado', current_date);
    v_log := array_append(v_log, '(c) OK: pedido_aula pode sair mais de uma vez no dia');
  EXCEPTION WHEN unique_violation THEN v_log := array_append(v_log, '(c) FALHA: pedido_aula ficou limitado a um por dia'); END;
  INSERT INTO treino.whatsapp_log (professional_id, tipo, status, dia) VALUES (v_dono, 'briefing_diario', 'enviado', current_date);
  BEGIN
    INSERT INTO treino.whatsapp_log (professional_id, tipo, status, dia) VALUES (v_dono, 'briefing_diario', 'enviado', current_date);
    v_log := array_append(v_log, '(c) FALHA: briefing_diario passou a sair duas vezes no dia');
  EXCEPTION WHEN unique_violation THEN v_log := array_append(v_log, '(c) OK: briefing_diario continua com um por dia'); END;

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
