-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece na mensagem
-- desse erro. Rode DEPOIS da migration 20261074. Cria um personal de teste (login + dados de verdade, inclusive as ligações que travavam o
-- delete: exercício usado em plano, sessão e modelo) e prova:
--   (a) sem a palavra EXCLUIR o pedido é recusado;
--   (b) com ela: gera protocolo EXC-aaaa-XXXXXXXX, desliga o WhatsApp e a conta vira modo leitura (assinatura_ativa() = false);
--   (c) pedir de novo devolve o MESMO protocolo (1 pedido pendente só); minha_exclusao() mostra o protocolo só para o dono;
--   (d) cancelar devolve o WhatsApp e o acesso (assinatura_ativa() = true) e marca 'cancelled';
--   (e) vencida a carência, o job apaga TUDO do personal (login, perfil, alunos, treinos, sessões, modelos, exercício próprio):
--       nenhuma tabela do schema treino guarda mais linha com o professional_id dele; o pedido fica 'completed' sem dado pessoal;
--   (f) o pagamento do plano sobrevive, sem professional_id, com o identificador anônimo do pedido;
--   (g) o log do admin sobrevive sem vínculo e sem o campo `detalhes` (e-mail/CPF);
--   (h) conta de administrador não pode ser excluída por aqui.
-- Esperado: "(a) OK" … "(h) OK", sem "FALHA".
DO $$
DECLARE
  v_x UUID := gen_random_uuid();
  v_adm UUID;
  v_outro UUID;
  v_aluno UUID := gen_random_uuid();
  v_exe UUID := gen_random_uuid();
  v_plano UUID := gen_random_uuid();
  v_sessao UUID := gen_random_uuid();
  v_modelo UUID := gen_random_uuid();
  v_pe UUID := gen_random_uuid();
  v_se UUID := gen_random_uuid();
  v_me UUID := gen_random_uuid();
  v_r JSONB;
  v_r2 JSONB;
  v_prot TEXT;
  v_req treino.deletion_requests%ROWTYPE;
  v_b BOOLEAN;
  v_n INT;
  v_resto BIGINT := 0;
  t RECORD;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT id INTO v_adm FROM treino.professionals WHERE is_admin = TRUE ORDER BY id LIMIT 1;
  SELECT id INTO v_outro FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;

  INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  VALUES (v_x, 'authenticated', 'authenticated', 'teste-exclusao-' || v_x || '@invalid.example',
          jsonb_build_object('name', '[TESTE] exclusao', 'termos_versao', '1.4', 'privacidade_versao', '1.9'), now(), now());
  IF NOT EXISTS (SELECT 1 FROM treino.professionals WHERE id = v_x) THEN
    RAISE EXCEPTION 'RESULTADO: AVISO - o cadastro do usuário de teste não criou o perfil; teste não executado';
  END IF;
  UPDATE treino.professionals SET phone = '(11) 90000-0000', whatsapp_opt_in = TRUE WHERE id = v_x;

  INSERT INTO treino.alunos (id, professional_id, name) VALUES (v_aluno, v_x, '[TESTE] aluno exclusao');
  INSERT INTO treino.exercicios (id, professional_id, name) VALUES (v_exe, v_x, '[TESTE] exercicio proprio');
  INSERT INTO treino.planos (id, aluno_id, professional_id, name) VALUES (v_plano, v_aluno, v_x, '[TESTE] plano');
  INSERT INTO treino.plano_exercicios (id, plano_id, exercicio_id, sets, reps) VALUES (v_pe, v_plano, v_exe, 3, '10');
  INSERT INTO treino.sessoes (id, aluno_id, professional_id) VALUES (v_sessao, v_aluno, v_x);
  INSERT INTO treino.sessao_exercicios (id, sessao_id, exercicio_id) VALUES (v_se, v_sessao, v_exe);
  INSERT INTO treino.modelos (id, professional_id, name) VALUES (v_modelo, v_x, '[TESTE] modelo');
  INSERT INTO treino.modelo_exercicios (id, modelo_id, exercicio_id, sets, reps) VALUES (v_me, v_modelo, v_exe, 3, '10');
  INSERT INTO treino.pagamentos_assinatura (payment_id, professional_id, plano, valor) VALUES ('TESTE-EXCLUSAO-' || v_x, v_x, 'mensal', 15);
  INSERT INTO treino.admin_logs (acao, target_professional_id, detalhes) VALUES ('alterar_trial', v_x, jsonb_build_object('antes', jsonb_build_object('email', 'x@y.z')));

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_x, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  BEGIN
    PERFORM treino.solicitar_exclusao_conta('apagar');
    v_log := array_append(v_log, '(a) FALHA: aceitou sem a palavra EXCLUIR');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Digite EXCLUIR%' THEN '(a) OK: recusa sem EXCLUIR' ELSE '(a) FALHA: ' || SQLERRM END);
  END;

  -- (b)
  v_r := treino.solicitar_exclusao_conta(' excluir ');
  v_prot := v_r->>'protocolo';
  RESET ROLE;
  SELECT whatsapp_opt_in INTO v_b FROM treino.professionals WHERE id = v_x;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_x, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_log := array_append(v_log, CASE WHEN v_prot ~ '^EXC-[0-9]{4}-[A-HJ-NP-Z2-9]{8}$' AND NOT v_b AND NOT treino.assinatura_ativa() AND (v_r->>'ja_existia')::BOOLEAN = FALSE
    THEN '(b) OK: protocolo ' || v_prot || ', WhatsApp desligado, conta em modo leitura' ELSE '(b) FALHA: ' || v_r::TEXT || ' wpp=' || v_b::TEXT END);

  -- (c)
  v_r2 := treino.solicitar_exclusao_conta('EXCLUIR');
  SELECT count(*) INTO v_n FROM (SELECT 1) s WHERE treino.minha_exclusao() ->> 'protocolo' = v_prot;
  RESET ROLE;
  SELECT count(*) INTO v_resto FROM treino.deletion_requests WHERE personal_id = v_x AND status = 'pending';
  v_log := array_append(v_log, CASE WHEN v_r2->>'protocolo' = v_prot AND (v_r2->>'ja_existia')::BOOLEAN AND v_resto = 1 AND v_n = 1
    THEN '(c) OK: pedido repetido devolve o mesmo protocolo' ELSE '(c) FALHA: ' || v_r2::TEXT || ' pendentes=' || v_resto END);
  IF v_outro IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO v_n FROM (SELECT 1) s WHERE treino.minha_exclusao() IS NOT NULL;
    RESET ROLE;
    v_log := array_append(v_log, CASE WHEN v_n = 0 THEN '(c2) OK: outro personal não vê o pedido' ELSE '(c2) FALHA: outro personal viu o pedido' END);
  END IF;

  -- (d) cancelar
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_x, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_b := treino.cancelar_exclusao_conta();
  v_n := CASE WHEN treino.assinatura_ativa() THEN 1 ELSE 0 END;
  RESET ROLE;
  SELECT status INTO v_req.status FROM treino.deletion_requests WHERE protocol = v_prot;
  SELECT whatsapp_opt_in INTO v_resto FROM (SELECT CASE WHEN whatsapp_opt_in THEN 1 ELSE 0 END AS whatsapp_opt_in FROM treino.professionals WHERE id = v_x) q;
  v_log := array_append(v_log, CASE WHEN v_b AND v_n = 1 AND v_req.status = 'cancelled' AND v_resto = 1 THEN '(d) OK: cancelar devolve acesso e WhatsApp' ELSE '(d) FALHA: v_b=' || v_b::TEXT || ' ativa=' || v_n || ' status=' || coalesce(v_req.status, 'NULL') END);

  -- (e) pede de novo, vence a carência e o job apaga
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_x, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.solicitar_exclusao_conta('EXCLUIR');
  RESET ROLE;
  UPDATE treino.deletion_requests SET scheduled_for = now() - INTERVAL '1 day' WHERE protocol = v_r->>'protocolo';
  v_n := treino.finalizar_exclusoes_vencidas();
  SELECT * INTO v_req FROM treino.deletion_requests WHERE protocol = v_r->>'protocolo';

  v_resto := 0;
  FOR t IN
    SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'treino' AND c.column_name = 'professional_id' AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('SELECT count(*) FROM treino.%I WHERE professional_id = $1', t.table_name) INTO v_n USING v_x;
    v_resto := v_resto + v_n;
  END LOOP;
  v_log := array_append(v_log, CASE WHEN v_req.status = 'completed' AND v_req.completed_at IS NOT NULL AND v_req.personal_id IS NULL AND v_req.erro IS NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_x) AND NOT EXISTS (SELECT 1 FROM treino.professionals WHERE id = v_x)
      AND NOT EXISTS (SELECT 1 FROM treino.alunos WHERE id = v_aluno) AND NOT EXISTS (SELECT 1 FROM treino.exercicios WHERE id = v_exe)
      AND NOT EXISTS (SELECT 1 FROM treino.sessoes WHERE id = v_sessao) AND NOT EXISTS (SELECT 1 FROM treino.modelos WHERE id = v_modelo) AND v_resto = 0
    THEN '(e) OK: o job apagou tudo (login, perfil, alunos, treinos, sessões, modelos); nada com o professional_id dele' ELSE '(e) FALHA: status=' || v_req.status || ' erro=' || coalesce(v_req.erro, '-') || ' linhas_restantes=' || v_resto END);

  -- (f)
  SELECT count(*) INTO v_n FROM treino.pagamentos_assinatura WHERE payment_id = 'TESTE-EXCLUSAO-' || v_x AND professional_id IS NULL AND titular_anonimo = v_req.id_anonimo AND valor = 15;
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(f) OK: o pagamento do plano ficou, sem vínculo, com o id anônimo' ELSE '(f) FALHA: linhas=' || v_n END);

  -- (g)
  SELECT count(*) INTO v_n FROM treino.admin_logs WHERE target_professional_id IS NULL AND detalhes IS NULL AND acao = 'alterar_trial' AND criado_em >= now();
  v_log := array_append(v_log, CASE WHEN v_n >= 1 THEN '(g) OK: o log do admin ficou sem vínculo e sem detalhes' ELSE '(g) FALHA: linhas=' || v_n END);

  -- (h)
  IF v_adm IS NULL THEN
    v_log := array_append(v_log, '(h) PULADO: não há conta de administrador para testar');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated', 'aal', 'aal2')::TEXT, TRUE);
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM treino.solicitar_exclusao_conta('EXCLUIR');
      v_log := array_append(v_log, '(h) FALHA: o administrador conseguiu pedir a exclusão');
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, CASE WHEN SQLERRM LIKE '%administrador%' THEN '(h) OK: conta de administrador é recusada' ELSE '(h) FALHA: ' || SQLERRM END);
    END;
    RESET ROLE;
  END IF;

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
