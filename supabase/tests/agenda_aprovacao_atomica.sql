-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261092.
-- Como personal logado com assinatura ativa, prova:
--   (a) aprovar cria o aluno novo, a aula, o participante e liga o pedido à aula;
--   (b) um segundo pedido no mesmo horário vira "indisponivel" e não pode mais ser aprovado;
--   (c) aprovar de novo o mesmo pedido é recusado;
--   (d) outro personal não aprova pedido alheio;
--   (e) apresentação com mais de 160 caracteres é recusada.
-- Esperado: "(a) OK" … "(e) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_p1 UUID;
  v_p2 UUID;
  v_r JSONB;
  v_n INT;
  v_status TEXT;
  v_aula UUID;
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

  -- pedidos de teste (inseridos como dono do banco, antes de virar o personal)
  INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min)
  VALUES (v_dono, '[E2E] Visitante Um', '5521999990001', '2030-01-15 13:00:00+00', 60) RETURNING id INTO v_p1;
  INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min)
  VALUES (v_dono, '[E2E] Visitante Dois', '5521999990002', '2030-01-15 13:30:00+00', 60) RETURNING id INTO v_p2;

  INSERT INTO treino.professional_config (professional_id) VALUES (v_dono) ON CONFLICT (professional_id) DO NOTHING;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  v_r := treino.aprovar_pedido_agenda(v_p1, NULL::UUID, NULL::TEXT, FALSE);
  SELECT aula_id INTO v_aula FROM treino.pedidos_agenda WHERE id = v_p1;
  SELECT count(*) INTO v_n FROM treino.aula_participantes WHERE aula_id = v_aula AND aluno_id = (v_r->>'aluno_id')::UUID;
  v_log := array_append(v_log, CASE WHEN (v_r->>'novo_aluno')::BOOLEAN AND v_aula = (v_r->>'aula_id')::UUID AND v_n = 1
    THEN '(a) OK: aluno, aula e participante criados e pedido ligado à aula' ELSE '(a) FALHA: ' || v_r::TEXT END);

  -- (b)
  SELECT status INTO v_status FROM treino.pedidos_agenda WHERE id = v_p2;
  BEGIN
    PERFORM treino.aprovar_pedido_agenda(v_p2, NULL::UUID, NULL::TEXT, FALSE);
    v_log := array_append(v_log, '(b) FALHA: aprovou pedido sobreposto');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN v_status = 'indisponivel' THEN '(b) OK: sobreposto virou indisponível e não foi aprovado' ELSE '(b) FALHA: status=' || v_status END);
  END;

  -- (c)
  BEGIN
    PERFORM treino.aprovar_pedido_agenda(v_p1, NULL::UUID, NULL::TEXT, FALSE);
    v_log := array_append(v_log, '(c) FALHA: aprovou duas vezes');
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(c) OK: segunda aprovação recusada (' || SQLERRM || ')'); END;

  -- (d)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(d) AVISO: só há um personal, isolamento não testado');
  ELSE
    RESET ROLE;
    INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min)
    VALUES (v_dono, '[E2E] Visitante Tres', '5521999990003', '2030-01-16 13:00:00+00', 60) RETURNING id INTO v_p2;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM treino.aprovar_pedido_agenda(v_p2, NULL::UUID, NULL::TEXT, FALSE);
      v_log := array_append(v_log, '(d) FALHA: outro personal aprovou pedido alheio');
    EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(d) OK: outro personal não aprova pedido alheio'); END;
  END IF;

  -- (e)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  BEGIN
    UPDATE treino.professional_config SET apresentacao = repeat('x', 161) WHERE professional_id = v_dono;
    v_log := array_append(v_log, '(e) FALHA: aceitou apresentação de 161 caracteres');
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(e) OK: apresentação acima de 160 caracteres recusada'); END;

  RESET ROLE;
  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
