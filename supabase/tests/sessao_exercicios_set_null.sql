-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo, e o RESULTADO aparece
-- na mensagem desse erro ("RESULTADO: ..."). (O SQL Editor não mostra RAISE NOTICE, por isso o relatório vai na exceção.)
-- Prova que, SEM o grant de UPDATE em sessao_exercicios para `authenticated`:
--   (a) o cliente não consegue mais atualizar a tabela (42501);
--   (b) apagar um item do plano como o personal (authenticated) continua funcionando;
--   (c) a FK ON DELETE SET NULL anula sessao_exercicios.plano_exercicio_id mesmo assim.
-- Usa um personal que já tenha um aluno e um exercício. Esperado: "(a) OK", "(b) OK", "(c) OK" e nenhuma "FALHA".

DO $$
DECLARE
  v_prof   UUID;
  v_aluno  UUID;
  v_ex     UUID;
  v_plano  UUID := gen_random_uuid();
  v_item   UUID := gen_random_uuid();
  v_sessao UUID := gen_random_uuid();
  v_sx     UUID := gen_random_uuid();
  v_pe     UUID;
  v_erro   TEXT;
  v_log    TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- o que a migration 20261056 faz (desfeito pela exceção final)
  REVOKE UPDATE ON treino.sessao_exercicios FROM authenticated;

  SELECT a.professional_id, a.id INTO v_prof, v_aluno FROM treino.alunos a ORDER BY a.created_at LIMIT 1;
  SELECT e.id INTO v_ex FROM treino.exercicios e WHERE e.professional_id = v_prof LIMIT 1;
  IF v_prof IS NULL OR v_ex IS NULL THEN
    RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal com aluno e exercício; teste não executado';
  END IF;

  -- montagem como dono (ignora RLS): plano + item + sessão + exercício da sessão ligado ao item
  INSERT INTO treino.planos (id, aluno_id, professional_id, name) VALUES (v_plano, v_aluno, v_prof, '[TESTE] plano');
  INSERT INTO treino.plano_exercicios (id, plano_id, exercicio_id, sets, reps, order_index) VALUES (v_item, v_plano, v_ex, 3, '10', 0);
  INSERT INTO treino.sessoes (id, aluno_id, professional_id) VALUES (v_sessao, v_aluno, v_prof);
  INSERT INTO treino.sessao_exercicios (id, sessao_id, exercicio_id, plano_exercicio_id, order_index) VALUES (v_sx, v_sessao, v_ex, v_item, 0);

  -- agora como o personal logado
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE treino.sessao_exercicios SET notes = 'x' WHERE id = v_sx;
    v_log := v_log || '(a) FALHA: o UPDATE do cliente ainda é permitido';
  EXCEPTION WHEN insufficient_privilege THEN
    v_log := v_log || '(a) OK: UPDATE em sessao_exercicios negado ao cliente (42501)';
  END;

  BEGIN
    DELETE FROM treino.plano_exercicios WHERE id = v_item;
    v_log := v_log || '(b) OK: o personal apagou o item do plano sem erro';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    v_log := v_log || ('(b) FALHA: apagar o item do plano deu erro: ' || v_erro);
  END;

  RESET ROLE;
  SELECT plano_exercicio_id INTO v_pe FROM treino.sessao_exercicios WHERE id = v_sx;
  IF v_pe IS NULL THEN v_log := v_log || '(c) OK: plano_exercicio_id foi anulado pela FK (ON DELETE SET NULL)';
  ELSE v_log := v_log || '(c) FALHA: plano_exercicio_id continua preenchido'; END IF;

  -- A exceção desfaz tudo (REVOKE, plano, sessão...) e entrega o relatório na mensagem.
  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
