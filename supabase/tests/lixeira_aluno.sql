-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo, e o RESULTADO aparece
-- na mensagem desse erro ("RESULTADO: ..."). Rode DEPOIS da migration 20261059.
-- Prova, com alunos de teste criados dentro da transação, como personal logado:
--   (a) não manda aluno ATIVO para a lixeira;
--   (b) manda aluno ARQUIVADO para a lixeira e o banco grava a data (now()), mesmo que o cliente mande outra;
--   (c) não reativa aluno que está na lixeira;
--   (d) restaura da lixeira (apagado_em = NULL) e depois reativa;
--   (e) não apaga aluno arquivado que NÃO está na lixeira;
--   (f) apaga aluno que está na lixeira;
--   (g) como dono do banco, a limpeza dos vencidos (> 30 dias) apaga só os vencidos.
-- Atenção: o personal usado (o primeiro da tabela) precisa estar com assinatura/trial ATIVO; com assinatura vencida a regra de modo leitura
-- barra os UPDATE e o teste acusa falha que não é da lixeira.
-- Esperado: "(a) OK" … "(g) OK", sem nenhuma "FALHA".

DO $$
DECLARE
  v_prof UUID;
  v_ativo UUID := gen_random_uuid();
  v_arq UUID := gen_random_uuid();
  v_lix UUID := gen_random_uuid();
  v_velho UUID := gen_random_uuid();
  v_novo UUID := gen_random_uuid();
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_n INT;
  v_data TIMESTAMPTZ;
BEGIN
  SELECT id INTO v_prof FROM treino.professionals LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  INSERT INTO treino.alunos (id, professional_id, name, active, apagado_em) VALUES
    (v_ativo, v_prof, '[TESTE] ativo', TRUE, NULL),
    (v_arq, v_prof, '[TESTE] arquivado', FALSE, NULL),
    (v_lix, v_prof, '[TESTE] na lixeira', FALSE, now()),
    (v_velho, v_prof, '[TESTE] lixeira vencida', FALSE, now() - interval '31 days'),
    (v_novo, v_prof, '[TESTE] lixeira recente', FALSE, now() - interval '5 days');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  BEGIN
    UPDATE treino.alunos SET apagado_em = now() WHERE id = v_ativo;
    v_log := array_append(v_log, '(a) FALHA: aluno ativo foi para a lixeira');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Arquive o aluno antes%' THEN '(a) OK: ativo não vai para a lixeira' ELSE '(a) FALHA: ' || SQLERRM END);
  END;

  -- (b)
  UPDATE treino.alunos SET apagado_em = '2000-01-01' WHERE id = v_arq;
  SELECT apagado_em INTO v_data FROM treino.alunos WHERE id = v_arq;
  v_log := array_append(v_log, CASE WHEN v_data > now() - interval '1 minute' THEN '(b) OK: arquivado foi para a lixeira com a data do banco' ELSE '(b) FALHA: data = ' || coalesce(v_data::TEXT, 'NULL') END);

  -- (c)
  BEGIN
    UPDATE treino.alunos SET active = TRUE WHERE id = v_arq;
    v_log := array_append(v_log, '(c) FALHA: reativou aluno da lixeira');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Restaure o aluno da lixeira%' THEN '(c) OK: não reativa sem restaurar' ELSE '(c) FALHA: ' || SQLERRM END);
  END;

  -- (d)
  UPDATE treino.alunos SET apagado_em = NULL WHERE id = v_arq;
  UPDATE treino.alunos SET active = TRUE WHERE id = v_arq;
  SELECT count(*) INTO v_n FROM treino.alunos WHERE id = v_arq AND active AND apagado_em IS NULL;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(d) OK: restaurou e reativou' ELSE '(d) FALHA' END);

  -- (e) arquivado sem lixeira
  UPDATE treino.alunos SET active = FALSE WHERE id = v_arq;
  BEGIN
    DELETE FROM treino.alunos WHERE id = v_arq;
    v_log := array_append(v_log, '(e) FALHA: apagou arquivado fora da lixeira');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Mande o aluno para a lixeira%' THEN '(e) OK: arquivado fora da lixeira não é apagado' ELSE '(e) FALHA: ' || SQLERRM END);
  END;

  -- (f)
  DELETE FROM treino.alunos WHERE id = v_lix;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(f) OK: apagou aluno da lixeira' ELSE '(f) FALHA' END);

  -- (g) limpeza do cron (dono do banco)
  RESET ROLE;
  DELETE FROM treino.alunos WHERE apagado_em IS NOT NULL AND apagado_em < now() - interval '30 days' AND id IN (v_velho, v_novo);
  SELECT count(*) INTO v_n FROM treino.alunos WHERE id IN (v_velho, v_novo);
  v_log := array_append(v_log, CASE WHEN v_n = 1 AND EXISTS (SELECT 1 FROM treino.alunos WHERE id = v_novo) THEN '(g) OK: limpeza apaga só o vencido' ELSE '(g) FALHA' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
