-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261067.
--   (a) um personal comum NÃO consegue chamar admin_bi();
--   (b) a função interna admin_bi_janela() NÃO é chamável pelo cliente (só dono do banco/admin_bi);
--   (c) como dono do banco, admin_bi_janela() devolve todas as 15 métricas, inclusive com janela vazia (zeros, nunca nulo);
--   (d) numa janela que cobre todo o histórico, "cadastros" bate com a contagem da tabela de personais.
-- Esperado: "(a) OK" … "(d) OK", sem "FALHA".
DO $$
DECLARE
  v_prof UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_j JSONB;
  v_n BIGINT;
BEGIN
  SELECT id INTO v_prof FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM treino.admin_bi(30);
    v_log := array_append(v_log, '(a) FALHA: personal comum chamou admin_bi');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Acesso restrito ao admin%' THEN '(a) OK: admin_bi exige admin' ELSE '(a) FALHA: ' || SQLERRM END);
  END;
  BEGIN
    PERFORM treino.admin_bi_janela(now() - interval '1 day', now());
    v_log := array_append(v_log, '(b) FALHA: cliente chamou a função interna');
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(b) OK: função interna fechada ao cliente'); END;
  RESET ROLE;

  v_j := treino.admin_bi_janela('2000-01-01', '2000-01-02');
  v_log := array_append(v_log, CASE WHEN (SELECT count(*) FROM jsonb_object_keys(v_j)) = 15 AND NOT EXISTS (SELECT 1 FROM jsonb_each_text(v_j) WHERE value IS NULL OR value::numeric <> 0)
    THEN '(c) OK: 15 métricas, janela vazia zerada' ELSE '(c) FALHA: ' || v_j::TEXT END);

  v_n := (treino.admin_bi_janela('1970-01-01', now() + interval '1 hour') ->> 'cadastros')::BIGINT;
  v_log := array_append(v_log, CASE WHEN v_n = (SELECT count(*) FROM treino.professionals WHERE is_admin = FALSE) THEN '(d) OK: cadastros bate com a tabela (' || v_n || ')' ELSE '(d) FALHA: ' || v_n END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
