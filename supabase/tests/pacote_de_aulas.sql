-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece
-- na mensagem desse erro. Rode DEPOIS da migration 20261081. Como personal logado, prova:
--   (a) o dono cria um pacote para um aluno dele e o lê de volta;
--   (b) um segundo pacote ATIVO do mesmo aluno é recusado (índice único), e depois de encerrar o primeiro o segundo entra;
--   (c) valores fora do limite são recusados (qtd 0, valor 0, aulas anteriores acima da quantidade);
--   (d) outro personal não enxerga nem altera o pacote, e não consegue criar pacote para aluno que não é dele.
-- Esperado: "(a) OK" … "(d) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_aluno UUID;
  v_pac UUID;
  v_n INT;
  v_alt INT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT p.id INTO v_dono
  FROM treino.professionals p
  JOIN treino.assinaturas a ON a.professional_id = p.id
  WHERE p.is_admin = FALSE
    AND ((a.status = 'trial' AND a.trial_fim > now()) OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())))
    AND EXISTS (SELECT 1 FROM treino.alunos al WHERE al.professional_id = p.id AND al.apagado_em IS NULL)
  ORDER BY p.id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal com assinatura ativa e aluno; teste não executado'; END IF;
  SELECT al.id INTO v_aluno FROM treino.alunos al WHERE al.professional_id = v_dono AND al.apagado_em IS NULL ORDER BY al.id LIMIT 1;
  SELECT p.id INTO v_outro FROM treino.professionals p WHERE p.id <> v_dono AND p.is_admin = FALSE ORDER BY p.id LIMIT 1;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias, aulas_anteriores)
  VALUES (v_dono, v_aluno, 10, 800, 60, 1) RETURNING id INTO v_pac;
  SELECT count(*) INTO v_n FROM treino.aluno_pacotes WHERE id = v_pac AND qtd_aulas = 10 AND status = 'ativo' AND aulas_anteriores = 1;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(a) OK: dono criou e leu o pacote' ELSE '(a) FALHA: n=' || v_n END);

  -- (b)
  BEGIN
    INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias) VALUES (v_dono, v_aluno, 5, 400, 30);
    v_log := array_append(v_log, '(b) FALHA: aceitou 2 pacotes ativos');
  EXCEPTION WHEN unique_violation THEN
    v_log := array_append(v_log, '(b) OK: segundo pacote ativo recusado');
  END;
  UPDATE treino.aluno_pacotes SET status = 'encerrado', encerrado_em = now() WHERE id = v_pac;
  BEGIN
    INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias) VALUES (v_dono, v_aluno, 5, 400, 30);
    v_log := array_append(v_log, '(b) OK: depois de encerrar o primeiro, o novo entra');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, '(b) FALHA: novo pacote recusado após encerrar: ' || SQLERRM);
  END;

  -- (c)
  BEGIN
    UPDATE treino.aluno_pacotes SET status = 'encerrado', encerrado_em = now() WHERE aluno_id = v_aluno AND status = 'ativo';
    INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias) VALUES (v_dono, v_aluno, 0, 100, 30);
    v_log := array_append(v_log, '(c) FALHA: aceitou qtd 0');
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(c) OK: qtd 0 recusada'); END;
  BEGIN
    INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias) VALUES (v_dono, v_aluno, 10, 0, 30);
    v_log := array_append(v_log, '(c) FALHA: aceitou valor 0');
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(c) OK: valor 0 recusado'); END;
  BEGIN
    INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias, aulas_anteriores) VALUES (v_dono, v_aluno, 10, 100, 30, 11);
    v_log := array_append(v_log, '(c) FALHA: aceitou aulas anteriores acima da quantidade');
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(c) OK: aulas anteriores acima da quantidade recusadas'); END;

  -- (d)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(d) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    SELECT count(*) INTO v_n FROM treino.aluno_pacotes WHERE aluno_id = v_aluno;
    UPDATE treino.aluno_pacotes SET valor = 1 WHERE aluno_id = v_aluno;
    GET DIAGNOSTICS v_alt = ROW_COUNT;
    BEGIN
      INSERT INTO treino.aluno_pacotes (professional_id, aluno_id, qtd_aulas, valor, validade_dias) VALUES (v_outro, v_aluno, 10, 100, 30);
      v_log := array_append(v_log, '(d) FALHA: outro personal criou pacote em aluno alheio');
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, CASE WHEN v_n = 0 AND v_alt = 0 THEN '(d) OK: outro personal não enxerga, não altera e não cria em aluno alheio' ELSE '(d) FALHA: enxerga=' || v_n || ' alterou=' || v_alt END);
    END;
  END IF;

  RESET ROLE;
  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
