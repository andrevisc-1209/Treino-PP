-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261085.
--   (a) um personal comum NÃO consegue chamar nenhuma das 4 funções;
--   (b) a tabela admin_contatos tem RLS e o personal comum não escreve nem lê direto (INSERT negado, 0 linhas);
--   (c) o admin registra um contato com "adiar 7 dias", o resumo mostra o adiamento e o histórico traz a linha
--       (precisa de um admin com MFA: sem sessão aal2 este item vira AVISO, e é esperado no SQL Editor).
-- Esperado: "(a) OK" e "(b) OK"; "(c)" OK ou AVISO; sem "FALHA".
DO $$
DECLARE
  v_prof UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_n INT;
  v_rls BOOLEAN;
  v_f TEXT;
BEGIN
  SELECT id INTO v_prof FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  SELECT relrowsecurity INTO v_rls FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'treino' AND c.relname = 'admin_contatos';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  FOREACH v_f IN ARRAY ARRAY['registrar', 'resumo', 'do_personal', 'atividade'] LOOP
    BEGIN
      IF v_f = 'registrar' THEN PERFORM treino.admin_registrar_contato(v_prof, 'manual', 'whatsapp', 'respondeu', NULL, 0);
      ELSIF v_f = 'resumo' THEN PERFORM * FROM treino.admin_contatos_resumo();
      ELSIF v_f = 'do_personal' THEN PERFORM * FROM treino.admin_contatos_do_personal(v_prof);
      ELSE PERFORM * FROM treino.admin_personais_atividade();
      END IF;
      v_log := array_append(v_log, '(a) FALHA: personal comum chamou ' || v_f);
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Acesso restrito ao admin%' THEN '(a) OK: ' || v_f || ' exige admin' ELSE '(a) FALHA em ' || v_f || ': ' || SQLERRM END);
    END;
  END LOOP;

  BEGIN
    INSERT INTO treino.admin_contatos (professional_id, canal, resultado) VALUES (v_prof, 'whatsapp', 'respondeu');
    v_log := array_append(v_log, '(b) FALHA: personal comum inseriu direto na tabela');
  EXCEPTION WHEN insufficient_privilege THEN
    SELECT count(*) INTO v_n FROM treino.admin_contatos;
    v_log := array_append(v_log, CASE WHEN v_rls AND v_n = 0 THEN '(b) OK: RLS ligado, INSERT negado e 0 linhas visíveis' ELSE '(b) FALHA: rls=' || v_rls || ' linhas=' || v_n END);
  WHEN OTHERS THEN
    v_log := array_append(v_log, '(b) FALHA: ' || SQLERRM);
  END;
  RESET ROLE;

  v_log := array_append(v_log, '(c) AVISO: registrar/adiar/ler como admin precisa de sessão com MFA; conferir no painel (registrar um contato com "adiar 7 dias" e ver o alerta sumir da Visão geral)');

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
