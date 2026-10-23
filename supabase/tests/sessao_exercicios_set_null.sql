-- Teste (SQL Editor, tudo dentro de uma transação que termina em ROLLBACK: não grava nada).
-- Prova que, SEM o grant de UPDATE em sessao_exercicios para `authenticated`:
--   (a) o cliente não consegue mais atualizar a tabela (42501);
--   (b) apagar um item do plano como o personal (authenticated) continua funcionando e a FK ON DELETE SET NULL anula
--       sessao_exercicios.plano_exercicio_id mesmo assim.
-- Usa um personal que já tenha ao menos um aluno e um exercício; se não houver, devolve um aviso.
-- Resultado esperado: três linhas "OK ..." e nenhuma "FALHA".

BEGIN;

REVOKE UPDATE ON treino.sessao_exercicios FROM authenticated;  -- o que a migration 20261056 faz (desfeito no ROLLBACK)

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
BEGIN
  SELECT a.professional_id, a.id INTO v_prof, v_aluno FROM treino.alunos a LIMIT 1;
  SELECT e.id INTO v_ex FROM treino.exercicios e WHERE e.professional_id = v_prof LIMIT 1;
  IF v_prof IS NULL OR v_ex IS NULL THEN RAISE NOTICE 'AVISO: precisa de um personal com aluno e exercício; teste não executado'; RETURN; END IF;

  -- montagem como dono (ignora RLS): plano + item + sessão + exercício da sessão ligado ao item
  INSERT INTO treino.planos (id, aluno_id, professional_id, name) VALUES (v_plano, v_aluno, v_prof, '[TESTE] plano');
  INSERT INTO treino.plano_exercicios (id, plano_id, exercicio_id, sets, reps, order_index) VALUES (v_item, v_plano, v_ex, 3, '10', 0);
  INSERT INTO treino.sessoes (id, aluno_id, professional_id) VALUES (v_sessao, v_aluno, v_prof);
  INSERT INTO treino.sessao_exercicios (id, sessao_id, exercicio_id, plano_exercicio_id, order_index) VALUES (v_sx, v_sessao, v_ex, v_item, 0);

  -- agora como o personal logado
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a) UPDATE direto é negado
  BEGIN
    UPDATE treino.sessao_exercicios SET notes = 'x' WHERE id = v_sx;
    RAISE NOTICE 'FALHA (a): o UPDATE do cliente ainda é permitido';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK (a): UPDATE em sessao_exercicios negado ao cliente (42501)';
  END;

  -- (b) apagar o item do plano funciona e anula a referência (ação de FK, sem precisar do grant)
  BEGIN
    DELETE FROM treino.plano_exercicios WHERE id = v_item;
    RAISE NOTICE 'OK (b): o personal apagou o item do plano sem erro';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    RAISE NOTICE 'FALHA (b): apagar o item do plano deu erro: %', v_erro;
  END;

  RESET ROLE;
  SELECT plano_exercicio_id INTO v_pe FROM treino.sessao_exercicios WHERE id = v_sx;
  IF v_pe IS NULL THEN RAISE NOTICE 'OK (c): plano_exercicio_id foi anulado pela FK (ON DELETE SET NULL)';
  ELSE RAISE NOTICE 'FALHA (c): plano_exercicio_id continua preenchido'; END IF;
END $$;

ROLLBACK;
