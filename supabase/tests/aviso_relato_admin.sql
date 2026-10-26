-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece
-- na mensagem desse erro. Rode DEPOIS da migration 20261062. Prova:
--   (a) whatsapp_log aceita o tipo 'relato_novo' e permite mais de um no mesmo dia (tipo "por evento");
--   (b) o trigger de aviso existe em treino.relatos;
--   (c) enviar um relato como personal funciona e NÃO é bloqueado pelo aviso (mesmo se pg_net/Vault falharem);
--   (d) o Vault tem o secret `cron_secret` (sem ele o aviso é silenciosamente ignorado).
-- A chamada HTTP em si só acontece no COMMIT, então aqui ela é descartada: o teste de ponta a ponta é mandar um relato real pelo app.
-- Esperado: "(a) OK" … "(d) OK", sem "FALHA".

DO $$
DECLARE
  v_prof UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_n INT;
BEGIN
  SELECT id INTO v_prof FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  -- (a)
  BEGIN
    INSERT INTO treino.whatsapp_log (professional_id, tipo, status, dia) VALUES (v_prof, 'relato_novo', 'enviado', current_date), (v_prof, 'relato_novo', 'enviado', current_date);
    v_log := array_append(v_log, '(a) OK: relato_novo aceito, dois no mesmo dia');
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(a) FALHA: ' || SQLERRM); END;

  -- (b)
  SELECT count(*) INTO v_n FROM pg_trigger WHERE tgname = 'tg_relato_avisar_admin' AND NOT tgisinternal;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(b) OK: trigger existe' ELSE '(b) FALHA: trigger ausente' END);

  -- (c)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO treino.relatos (professional_id, tipo, mensagem) VALUES (v_prof, 'duvida', 'Teste do aviso ao admin');
    v_log := array_append(v_log, '(c) OK: relato enviado sem ser bloqueado pelo aviso');
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(c) FALHA: ' || SQLERRM); END;
  RESET ROLE;

  -- (d)
  SELECT count(*) INTO v_n FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(d) OK: cron_secret no Vault' ELSE '(d) FALHA: sem cron_secret no Vault (o aviso não sai)' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
