-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece na
-- mensagem desse erro. Rode DEPOIS da migration 20261069. Usa dois personais que já existem (A indica, B é indicado; ambos com trial/
-- assinatura ATIVO, senão a regra de modo leitura barra a inserção de alunos) e prova:
--   (a) os dois têm código de indicação, diferentes e no formato certo;
--   (b) B (logado) recebe 'invalido' para código inexistente, 'proprio' para o próprio, 'registrado' para o de A e 'ja_registrado' na repetição;
--   (c) com 2 alunos a indicação segue PENDENTE e ninguém ganha bônus;
--   (d) ao cadastrar o 3º aluno (nome diferente) a indicação vira CONCEDIDA e A e B ganham ~30 dias de bonus_ate;
--   (e) assinatura_ativa() fica verdadeira com o bonus (mesmo sem trial/assinatura vigentes);
--   (f) com o teto em 0, o indicado ainda ganha, mas o indicador NÃO (indicador_ganhou = false, bonus de A não muda);
--   (g) conta com mais de 7 dias não consegue registrar código ('expirado');
--   (i) [migration 20261072] quem já tem aluno NÃO é usuário novo: registrar devolve 'nao_novo';
--   (j) alunos criados ANTES do registro não contam: com 3 alunos antigos, só depois de 3 novos a indicação é concedida;
--   (h) [migration 20261070] cada concessão cria o aviso no sino: 1 para o indicado e 1 para o indicador, o do indicador com ganhou=false quando o
--       teto está cheio (f), sem aluno_id e sem dado pessoal no payload.
-- Esperado: "(a) OK" … "(j) OK", sem "FALHA".

DO $$
DECLARE
  v_ids UUID[];
  v_a UUID;
  v_b UUID;
  v_cod_a TEXT;
  v_cod_b TEXT;
  v_r TEXT;
  v_st TEXT;
  v_ganhou BOOLEAN;
  v_bonus_a TIMESTAMPTZ;
  v_bonus_b TIMESTAMPTZ;
  v_bonus_a2 TIMESTAMPTZ;
  v_bonus_b2 TIMESTAMPTZ;
  v_ativo BOOLEAN;
  v_n_a INT;
  v_st2 TEXT;
  v_n_a_sem INT;
  v_n_b INT;
  v_pessoal INT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT array_agg(id) INTO v_ids FROM (
    SELECT p.id FROM treino.professionals p
    JOIN treino.assinaturas a ON a.professional_id = p.id
    WHERE p.is_admin = FALSE
      AND ((a.status = 'trial' AND a.trial_fim > now()) OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())))
    ORDER BY p.id LIMIT 2
  ) x;
  IF coalesce(array_length(v_ids, 1), 0) < 2 THEN RAISE EXCEPTION 'RESULTADO: AVISO - preciso de 2 personais com trial/assinatura ativa; teste não executado'; END IF;
  v_a := v_ids[1];
  v_b := v_ids[2];

  DELETE FROM treino.indicacoes WHERE indicador_id IN (v_a, v_b) OR indicado_id IN (v_a, v_b);
  UPDATE treino.assinaturas SET bonus_ate = NULL WHERE professional_id IN (v_a, v_b);
  UPDATE treino.professionals SET created_at = now() WHERE id = v_b;
  -- B precisa ser "usuário novo" (sem nenhum aluno): apaga os que tem (tudo isto é desfeito no fim)
  DELETE FROM treino.alunos WHERE professional_id = v_b;

  -- (a)
  SELECT codigo_indicacao INTO v_cod_a FROM treino.professionals WHERE id = v_a;
  SELECT codigo_indicacao INTO v_cod_b FROM treino.professionals WHERE id = v_b;
  v_log := array_append(v_log, CASE WHEN v_cod_a ~ '^[A-HJ-NP-Z2-9]{8}$' AND v_cod_b ~ '^[A-HJ-NP-Z2-9]{8}$' AND v_cod_a <> v_cod_b
    THEN '(a) OK: códigos válidos e diferentes' ELSE '(a) FALHA: a=' || coalesce(v_cod_a, 'NULL') || ' b=' || coalesce(v_cod_b, 'NULL') END);

  -- (b) B logado registra
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_indicacao('ZZZZZZZZ') || '/' || treino.registrar_indicacao(v_cod_b) || '/' || treino.registrar_indicacao(lower(v_cod_a)) || '/' || treino.registrar_indicacao(v_cod_a);
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'invalido/proprio/registrado/ja_registrado' THEN '(b) OK: ' || v_r ELSE '(b) FALHA: ' || v_r END);

  -- (c) 2 alunos: segue pendente
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_b, '[TESTE] indicacao 1'), (v_b, '[TESTE] indicacao 1 ');
  RESET ROLE;
  SELECT status INTO v_st FROM treino.indicacoes WHERE indicado_id = v_b;
  SELECT bonus_ate INTO v_bonus_a FROM treino.assinaturas WHERE professional_id = v_a;
  v_log := array_append(v_log, CASE WHEN v_st = 'pendente' AND v_bonus_a IS NULL THEN '(c) OK: nomes repetidos não contam, segue pendente' ELSE '(c) FALHA: status=' || coalesce(v_st, 'NULL') END);

  -- (d) 3º nome diferente concede
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_b, '[TESTE] indicacao 2'), (v_b, '[TESTE] indicacao 3');
  RESET ROLE;
  SELECT status, indicador_ganhou INTO v_st, v_ganhou FROM treino.indicacoes WHERE indicado_id = v_b;
  SELECT bonus_ate INTO v_bonus_a FROM treino.assinaturas WHERE professional_id = v_a;
  SELECT bonus_ate INTO v_bonus_b FROM treino.assinaturas WHERE professional_id = v_b;
  v_log := array_append(v_log, CASE WHEN v_st = 'concedida' AND v_ganhou AND v_bonus_a > now() + INTERVAL '29 days' AND v_bonus_b > now() + INTERVAL '29 days'
    THEN '(d) OK: concedida, A e B com bônus' ELSE '(d) FALHA: status=' || coalesce(v_st, 'NULL') || ' ganhou=' || coalesce(v_ganhou::TEXT, 'NULL') END);

  -- (e) o bônus mantém o acesso mesmo sem trial/assinatura vigentes
  UPDATE treino.assinaturas SET status = 'expirada' WHERE professional_id = v_b;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  SELECT treino.assinatura_ativa() INTO v_ativo;
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_ativo THEN '(e) OK: assinatura_ativa() verdadeira só com o bônus' ELSE '(e) FALHA: assinatura_ativa() = false' END);

  -- (f) teto 0: indicado ganha, indicador não
  EXECUTE 'CREATE OR REPLACE FUNCTION treino.indicacao_teto() RETURNS INT LANGUAGE sql IMMUTABLE AS $f$ SELECT 0 $f$';
  v_bonus_a2 := v_bonus_a;
  v_bonus_b2 := v_bonus_b;
  DELETE FROM treino.indicacoes WHERE indicado_id = v_b;
  INSERT INTO treino.indicacoes (indicador_id, indicado_id) VALUES (v_a, v_b);
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_b, '[TESTE] indicacao 4');
  SELECT status, indicador_ganhou INTO v_st, v_ganhou FROM treino.indicacoes WHERE indicado_id = v_b;
  SELECT bonus_ate INTO v_bonus_a FROM treino.assinaturas WHERE professional_id = v_a;
  SELECT bonus_ate INTO v_bonus_b FROM treino.assinaturas WHERE professional_id = v_b;
  v_log := array_append(v_log, CASE WHEN v_st = 'concedida' AND NOT v_ganhou AND v_bonus_a = v_bonus_a2 AND v_bonus_b > v_bonus_b2
    THEN '(f) OK: teto cheio, só o indicado ganhou' ELSE '(f) FALHA: status=' || coalesce(v_st, 'NULL') || ' ganhou=' || coalesce(v_ganhou::TEXT, 'NULL') END);

  -- (h) avisos no sino (as duas concessões: (d) e (f)); só os criados nesta transação (criada_em >= now()), para não somar avisos reais já existentes
  SELECT count(*) INTO v_n_a FROM treino.notificacoes_professor WHERE professional_id = v_a AND tipo = 'indicacao_concedida' AND criada_em >= now();
  SELECT count(*) INTO v_n_a_sem FROM treino.notificacoes_professor WHERE professional_id = v_a AND tipo = 'indicacao_concedida' AND criada_em >= now() AND (payload->>'ganhou')::BOOLEAN = FALSE;
  SELECT count(*) INTO v_n_b FROM treino.notificacoes_professor WHERE professional_id = v_b AND tipo = 'indicacao_concedida' AND criada_em >= now() AND aluno_id IS NULL;
  SELECT count(*) INTO v_pessoal FROM treino.notificacoes_professor WHERE tipo = 'indicacao_concedida' AND professional_id IN (v_a, v_b) AND (payload ? 'nome' OR payload ? 'email' OR payload ? 'cpf');
  v_log := array_append(v_log, CASE WHEN v_n_a = 2 AND v_n_a_sem = 1 AND v_n_b = 2 AND v_pessoal = 0
    THEN '(h) OK: avisos no sino para os dois, o do teto cheio com ganhou=false' ELSE '(h) FALHA: a=' || v_n_a || ' a_sem=' || v_n_a_sem || ' b=' || v_n_b || ' pessoal=' || v_pessoal END);

  -- (g) conta antiga não registra
  DELETE FROM treino.indicacoes WHERE indicado_id = v_b;
  UPDATE treino.professionals SET created_at = now() - INTERVAL '10 days' WHERE id = v_b;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_indicacao(v_cod_a);
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'expirado' THEN '(g) OK: conta com mais de 7 dias não registra' ELSE '(g) FALHA: ' || v_r END);

  -- (i) quem já tem aluno não é usuário novo (B ainda tem os alunos de teste dos passos anteriores)
  DELETE FROM treino.indicacoes WHERE indicado_id = v_b;
  UPDATE treino.professionals SET created_at = now() WHERE id = v_b;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.registrar_indicacao(v_cod_a);
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r = 'nao_novo' THEN '(i) OK: conta com alunos não registra (nao_novo)' ELSE '(i) FALHA: ' || v_r END);

  -- (j) alunos de antes do registro não contam: os 4 alunos de B passam a ter 1 dia; a indicação nasce agora (registro forçado)
  UPDATE treino.alunos SET created_at = now() - INTERVAL '1 day' WHERE professional_id = v_b;
  INSERT INTO treino.indicacoes (indicador_id, indicado_id) VALUES (v_a, v_b);
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_b, '[TESTE] depois 1');
  SELECT status INTO v_st FROM treino.indicacoes WHERE indicado_id = v_b;
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_b, '[TESTE] depois 2'), (v_b, '[TESTE] depois 3');
  SELECT status INTO v_st2 FROM treino.indicacoes WHERE indicado_id = v_b;
  v_log := array_append(v_log, CASE WHEN v_st = 'pendente' AND v_st2 = 'concedida' THEN '(j) OK: os alunos antigos não contaram; concedida só com 3 novos' ELSE '(j) FALHA: depois_de_1=' || coalesce(v_st, 'NULL') || ' depois_de_3=' || coalesce(v_st2, 'NULL') END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END
$$;
