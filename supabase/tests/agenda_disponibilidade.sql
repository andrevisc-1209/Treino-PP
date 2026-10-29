-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261087.
-- Como personal logado com assinatura ativa, prova:
--   (a) salvar_disponibilidade grava as janelas e os parâmetros e o personal as lê de volta; "agenda ajustada" fica preenchida;
--   (b) salvar de novo TROCA tudo (não acumula) e o padrão de antecedência é 3 h quando não há linha de configuração;
--   (c) janela sobreposta no mesmo dia e janela com fim antes do início são recusadas e a troca volta inteira (as janelas anteriores continuam);
--   (d) outro personal não enxerga as janelas.
-- Esperado: "(a) OK" … "(d) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_n INT;
  v_ant INT;
  v_ajustada TIMESTAMPTZ;
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

  DELETE FROM treino.disponibilidade_semanal WHERE professional_id = v_dono;
  DELETE FROM treino.professional_config WHERE professional_id = v_dono;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  PERFORM treino.salvar_disponibilidade(
    '[{"weekday":1,"start_time":"07:00","end_time":"09:00"},{"weekday":1,"start_time":"14:00","end_time":"18:00"},{"weekday":3,"start_time":"07:00","end_time":"12:00"}]'::JSONB,
    60, 10, 3, 4);
  SELECT count(*) INTO v_n FROM treino.disponibilidade_semanal;
  SELECT antecedencia_horas, agenda_ajustada_em INTO v_ant, v_ajustada FROM treino.professional_config WHERE professional_id = v_dono;
  v_log := array_append(v_log, CASE WHEN v_n = 3 AND v_ant = 3 AND v_ajustada IS NOT NULL THEN '(a) OK: 3 janelas e parâmetros gravados, agenda ajustada preenchida' ELSE '(a) FALHA: n=' || v_n || ' ant=' || COALESCE(v_ant::TEXT, 'null') END);

  -- (b)
  PERFORM treino.salvar_disponibilidade('[{"weekday":5,"start_time":"08:00","end_time":"10:00"}]'::JSONB, 45, 0, 6, 2);
  SELECT count(*) INTO v_n FROM treino.disponibilidade_semanal;
  SELECT antecedencia_horas INTO v_ant FROM treino.professional_config WHERE professional_id = v_dono;
  v_log := array_append(v_log, CASE WHEN v_n = 1 AND v_ant = 6 THEN '(b) OK: salvar de novo troca tudo' ELSE '(b) FALHA: n=' || v_n || ' ant=' || COALESCE(v_ant::TEXT, 'null') END);

  -- (c)
  BEGIN
    PERFORM treino.salvar_disponibilidade('[{"weekday":2,"start_time":"07:00","end_time":"10:00"},{"weekday":2,"start_time":"09:00","end_time":"12:00"}]'::JSONB, 60, 0, 3, 4);
    v_log := array_append(v_log, '(c) FALHA: aceitou janelas sobrepostas');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Há horários que se sobrepõem%' THEN '(c) OK: sobreposição recusada' ELSE '(c) FALHA: ' || SQLERRM END);
  END;
  BEGIN
    PERFORM treino.salvar_disponibilidade('[{"weekday":2,"start_time":"10:00","end_time":"09:00"}]'::JSONB, 60, 0, 3, 4);
    v_log := array_append(v_log, '(c) FALHA: aceitou fim antes do início');
  EXCEPTION WHEN check_violation THEN
    v_log := array_append(v_log, '(c) OK: fim antes do início recusado');
  END;
  SELECT count(*) INTO v_n FROM treino.disponibilidade_semanal;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(c) OK: as janelas anteriores continuam' ELSE '(c) FALHA: ficaram ' || v_n || ' janelas' END);

  -- (d)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(d) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    SELECT count(*) INTO v_n FROM treino.disponibilidade_semanal WHERE professional_id = v_dono;
    v_log := array_append(v_log, CASE WHEN v_n = 0 THEN '(d) OK: outro personal não enxerga' ELSE '(d) FALHA: enxerga ' || v_n END);
  END IF;

  RESET ROLE;
  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
