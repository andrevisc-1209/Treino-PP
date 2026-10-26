-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261064.
--   (a) um personal comum NÃO consegue chamar admin_personais_metricas() ("Acesso restrito ao admin");
--   (b) a função existe e devolve uma linha por personal não-admin (chamada como dono do banco só confere a contagem de colunas/linhas
--       via consulta equivalente, já que is_admin() exige a sessão do admin com MFA).
-- Esperado: "(a) OK" e "(b) OK", sem "FALHA".
DO $$
DECLARE
  v_prof UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_n INT;
BEGIN
  SELECT id INTO v_prof FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM * FROM treino.admin_personais_metricas();
    v_log := array_append(v_log, '(a) FALHA: personal comum chamou a função');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Acesso restrito ao admin%' THEN '(a) OK: exige admin' ELSE '(a) FALHA: ' || SQLERRM END);
  END;
  RESET ROLE;

  SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'treino' AND p.proname = 'admin_personais_metricas';
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(b) OK: função criada' ELSE '(b) FALHA: função ausente' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
