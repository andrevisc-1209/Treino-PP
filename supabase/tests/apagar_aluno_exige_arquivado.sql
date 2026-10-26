-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo, e o RESULTADO aparece
-- na mensagem desse erro ("RESULTADO: ..."). Rode DEPOIS das migrations 20261057 e 20261059 (ou cole a migration antes, dentro do mesmo editor).
-- Prova, com um aluno de teste criado dentro da transação:
--   (a) personal logado NÃO consegue apagar um aluno ATIVO ("Arquive o aluno antes de apagar.");
--   (b) personal logado consegue apagar um aluno que já está na LIXEIRA (migration 20261059; arquivado sem lixeira é barrado, ver lixeira_aluno.sql);
--   (c) o dono do banco (SQL Editor, service_role) apaga aluno ativo normalmente (é o caminho da cascata e da manutenção).
-- Cada caso usa o seu próprio aluno, criado já no estado certo (assim a regra de assinatura vencida, que barra UPDATE do personal,
-- não interfere no teste).
-- Esperado: "(a) OK", "(b) OK" e "(c) OK", sem nenhuma "FALHA".

DO $$
DECLARE
  v_prof UUID;
  v_ativo UUID := gen_random_uuid();
  v_arquivado UUID := gen_random_uuid();
  v_dono UUID := gen_random_uuid();
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_n INT;
BEGIN
  SELECT id INTO v_prof FROM treino.professionals LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  INSERT INTO treino.alunos (id, professional_id, name, active, apagado_em) VALUES
    (v_ativo, v_prof, '[TESTE] aluno ativo', TRUE, NULL),
    (v_arquivado, v_prof, '[TESTE] aluno na lixeira', FALSE, now()),
    (v_dono, v_prof, '[TESTE] aluno ativo (dono)', TRUE, NULL);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a) ativo: barrado
  BEGIN
    DELETE FROM treino.alunos WHERE id = v_ativo;
    v_log := array_append(v_log, '(a) FALHA: o personal apagou um aluno ATIVO');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'Arquive o aluno antes de apagar%' THEN v_log := array_append(v_log, '(a) OK: aluno ativo não pode ser apagado pelo cliente');
    ELSE v_log := array_append(v_log, '(a) FALHA: erro inesperado: ' || SQLERRM); END IF;
  END;

  -- (b) arquivado: apaga
  DELETE FROM treino.alunos WHERE id = v_arquivado;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(b) OK: aluno arquivado foi apagado' ELSE '(b) FALHA: aluno arquivado não foi apagado' END);

  -- (c) dono do banco: apaga aluno ATIVO (caminho da cascata e da manutenção)
  RESET ROLE;
  DELETE FROM treino.alunos WHERE id = v_dono;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(c) OK: o dono do banco apaga aluno ativo' ELSE '(c) FALHA: o dono do banco foi barrado' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
