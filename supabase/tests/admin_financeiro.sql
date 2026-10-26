-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261066.
--   (a) um personal comum NÃO consegue chamar admin_financeiro();
--   (b) o livro treino.pagamentos_assinatura é INVISÍVEL para o cliente (sem grant): personal logado não lê nem escreve;
--   (c) o livro aceita um pagamento válido (como dono do banco) e recusa plano inválido e valor zerado.
-- Esperado: "(a) OK" … "(c) OK", sem "FALHA".
DO $$
DECLARE
  v_prof UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT id INTO v_prof FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  BEGIN
    PERFORM * FROM treino.admin_financeiro();
    v_log := array_append(v_log, '(a) FALHA: personal comum chamou a função');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Acesso restrito ao admin%' THEN '(a) OK: exige admin' ELSE '(a) FALHA: ' || SQLERRM END);
  END;

  BEGIN
    PERFORM 1 FROM treino.pagamentos_assinatura LIMIT 1;
    v_log := array_append(v_log, '(b) FALHA: personal leu o livro');
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO treino.pagamentos_assinatura (payment_id, professional_id, plano, valor) VALUES ('teste-cliente', v_prof, 'mensal', 15);
      v_log := array_append(v_log, '(b) FALHA: personal escreveu no livro');
    EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(b) OK: livro invisível para o cliente'); END;
  END;
  RESET ROLE;

  BEGIN
    INSERT INTO treino.pagamentos_assinatura (payment_id, professional_id, plano, valor) VALUES ('teste-ok', v_prof, 'trimestral', 39);
    BEGIN INSERT INTO treino.pagamentos_assinatura (payment_id, professional_id, plano, valor) VALUES ('teste-plano', v_prof, 'anual', 39);
      v_log := array_append(v_log, '(c) FALHA: aceitou plano inválido');
    EXCEPTION WHEN check_violation THEN
      BEGIN INSERT INTO treino.pagamentos_assinatura (payment_id, professional_id, plano, valor) VALUES ('teste-zero', v_prof, 'mensal', 0);
        v_log := array_append(v_log, '(c) FALHA: aceitou valor zerado');
      EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(c) OK: livro aceita o válido e recusa plano inválido e valor zerado'); END;
    END;
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(c) FALHA: ' || SQLERRM); END;

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
