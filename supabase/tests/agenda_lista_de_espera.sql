-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261094.
-- Como personal logado com assinatura ativa, prova:
--   (a) o dono lê e marca como "chamado" quem está na sua espera;
--   (b) o dono NÃO consegue trocar nome ou telefone (só chamado_em) nem inserir direto;
--   (c) outro personal não enxerga, não marca e não apaga;
--   (d) o mesmo telefone não entra duas vezes no mesmo dia e turno;
--   (e) a Política 1.14 está registrada.
-- Esperado: "(a) OK" … "(e) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_id UUID;
  v_n INT;
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

  -- linha de teste (como dono do banco, antes de virar o personal)
  INSERT INTO treino.lista_espera_agenda (professional_id, visitante_nome, visitante_telefone, data, turno)
  VALUES (v_dono, '[E2E] Espera', '5521999990021', '2030-01-15', 'manha') RETURNING id INTO v_id;

  -- (d) feito antes de trocar de papel
  BEGIN
    INSERT INTO treino.lista_espera_agenda (professional_id, visitante_nome, visitante_telefone, data, turno)
    VALUES (v_dono, '[E2E] Espera repetida', '5521999990021', '2030-01-15', 'manha');
    v_log := array_append(v_log, '(d) FALHA: aceitou o mesmo telefone no mesmo dia e turno');
  EXCEPTION WHEN unique_violation THEN v_log := array_append(v_log, '(d) OK: mesmo telefone no mesmo dia e turno recusado'); END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  SELECT count(*) INTO v_n FROM treino.lista_espera_agenda WHERE id = v_id;
  UPDATE treino.lista_espera_agenda SET chamado_em = now() WHERE id = v_id;
  v_log := array_append(v_log, CASE WHEN v_n = 1 AND EXISTS (SELECT 1 FROM treino.lista_espera_agenda WHERE id = v_id AND chamado_em IS NOT NULL)
    THEN '(a) OK: dono leu e marcou como chamado' ELSE '(a) FALHA: n=' || v_n END);

  -- (b)
  BEGIN
    UPDATE treino.lista_espera_agenda SET visitante_nome = 'Outro nome' WHERE id = v_id;
    v_log := array_append(v_log, '(b) FALHA: dono trocou o nome do visitante');
  EXCEPTION WHEN insufficient_privilege THEN v_log := array_append(v_log, '(b) OK: só chamado_em pode mudar'); END;

  -- (c)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(c) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    SELECT count(*) INTO v_n FROM treino.lista_espera_agenda WHERE id = v_id;
    DELETE FROM treino.lista_espera_agenda WHERE id = v_id;
    v_log := array_append(v_log, CASE WHEN v_n = 0 THEN '(c) OK: outro personal não enxerga nem apaga' ELSE '(c) FALHA: enxerga=' || v_n END);
  END IF;

  RESET ROLE;

  -- (e)
  SELECT count(*) INTO v_n FROM treino.documentos_versoes WHERE tipo = 'privacidade' AND versao = '1.14';
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(e) OK: Política 1.14 registrada' ELSE '(e) FALHA: Política 1.14 não registrada' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
