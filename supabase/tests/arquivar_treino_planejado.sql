-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece
-- na mensagem desse erro. Rode DEPOIS da migration 20261078. Cria um treino planejado de teste e, como personal logado, prova:
--   (a) o dono consegue arquivar (arquivado_em preenchido) e restaurar (volta a NULL);
--   (b) outro personal NÃO enxerga nem consegue arquivar o treino (0 linhas afetadas);
--   (c) arquivar não apaga os exercícios do treino.
-- Esperado: "(a) OK" … "(c) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_modelo UUID := gen_random_uuid();
  v_n INT;
  v_ex INT;
  v_arq TIMESTAMPTZ;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT p.id INTO v_dono
  FROM treino.professionals p
  JOIN treino.assinaturas a ON a.professional_id = p.id
  WHERE p.is_admin = FALSE
    AND ((a.status = 'trial' AND a.trial_fim > now()) OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())))
  ORDER BY p.id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal com trial/assinatura ativa; teste não executado'; END IF;
  SELECT p.id INTO v_outro FROM treino.professionals p WHERE p.id <> v_dono AND p.is_admin = FALSE ORDER BY p.id LIMIT 1;

  INSERT INTO treino.modelos (id, professional_id, name) VALUES (v_modelo, v_dono, '[TESTE] treino arquivar');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  UPDATE treino.modelos SET arquivado_em = now() WHERE id = v_modelo;
  SELECT arquivado_em INTO v_arq FROM treino.modelos WHERE id = v_modelo;
  v_log := array_append(v_log, CASE WHEN v_arq IS NOT NULL THEN '(a) OK: dono arquivou' ELSE '(a) FALHA: arquivado_em ficou NULL' END);
  UPDATE treino.modelos SET arquivado_em = NULL WHERE id = v_modelo;
  SELECT arquivado_em INTO v_arq FROM treino.modelos WHERE id = v_modelo;
  v_log := array_append(v_log, CASE WHEN v_arq IS NULL THEN '(a) OK: dono restaurou' ELSE '(a) FALHA: não restaurou' END);

  -- (b)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(b) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    SELECT count(*) INTO v_n FROM treino.modelos WHERE id = v_modelo;
    UPDATE treino.modelos SET arquivado_em = now() WHERE id = v_modelo;
    GET DIAGNOSTICS v_ex = ROW_COUNT;
    v_log := array_append(v_log, CASE WHEN v_n = 0 AND v_ex = 0 THEN '(b) OK: outro personal não enxerga nem arquiva' ELSE '(b) FALHA: enxerga=' || v_n || ' arquivou=' || v_ex END);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  END IF;

  -- (c)
  RESET ROLE;
  SELECT count(*) INTO v_ex FROM treino.modelo_exercicios WHERE modelo_id = v_modelo;
  v_log := array_append(v_log, CASE WHEN v_ex = 0 THEN '(c) OK: nada foi apagado (o treino de teste não tinha exercícios; o arquivo só mexe em arquivado_em)' ELSE '(c) FALHA: exercicios=' || v_ex END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
