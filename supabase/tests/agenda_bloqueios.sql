-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261088.
-- Como personal logado com assinatura ativa, prova:
--   (a) o dono cria um bloqueio e o lê de volta;
--   (b) data final antes da inicial e motivo com mais de 60 caracteres são recusados;
--   (c) outro personal não enxerga nem apaga o bloqueio e não cria em nome do dono.
-- Esperado: "(a) OK" … "(c) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_n INT;
  v_del INT;
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

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  INSERT INTO treino.agenda_bloqueios (professional_id, data_inicio, data_fim, motivo) VALUES (v_dono, '2026-12-20', '2026-12-31', 'Férias');
  SELECT count(*) INTO v_n FROM treino.agenda_bloqueios WHERE motivo = 'Férias';
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(a) OK: dono criou e leu o bloqueio' ELSE '(a) FALHA: n=' || v_n END);

  -- (b)
  BEGIN
    INSERT INTO treino.agenda_bloqueios (professional_id, data_inicio, data_fim) VALUES (v_dono, '2026-12-10', '2026-12-09');
    v_log := array_append(v_log, '(b) FALHA: aceitou fim antes do início');
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(b) OK: fim antes do início recusado'); END;
  BEGIN
    INSERT INTO treino.agenda_bloqueios (professional_id, data_inicio, data_fim, motivo) VALUES (v_dono, '2026-12-10', '2026-12-10', repeat('x', 61));
    v_log := array_append(v_log, '(b) FALHA: aceitou motivo longo');
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(b) OK: motivo acima de 60 caracteres recusado'); END;

  -- (c)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(c) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    SELECT count(*) INTO v_n FROM treino.agenda_bloqueios WHERE professional_id = v_dono;
    DELETE FROM treino.agenda_bloqueios WHERE professional_id = v_dono;
    GET DIAGNOSTICS v_del = ROW_COUNT;
    BEGIN
      INSERT INTO treino.agenda_bloqueios (professional_id, data_inicio, data_fim) VALUES (v_dono, '2026-12-01', '2026-12-02');
      v_log := array_append(v_log, '(c) FALHA: outro personal criou bloqueio em nome do dono');
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, CASE WHEN v_n = 0 AND v_del = 0 THEN '(c) OK: outro personal não enxerga, não apaga e não cria em nome do dono' ELSE '(c) FALHA: enxerga=' || v_n || ' apagou=' || v_del END);
    END;
  END IF;

  RESET ROLE;
  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
