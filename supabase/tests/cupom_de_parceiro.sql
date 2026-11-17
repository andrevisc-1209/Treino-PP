-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261105.
-- Usa dois personais que já existem (B resgata primeiro; A serve para os casos de recusa). Tudo é desfeito no fim (alunos e datas inclusive). Prova:
--   (a) B (conta de 1 dia, sem alunos, trial de 10 dias) resgata o cupom de 90 dias: 'ok', e bonus_ate = fim do trial + 90 dias (os dias SOMAM);
--   (b) o mesmo personal não usa um segundo cupom ('ja_usou'); meu_cupom() mostra 'usou' com 90 dias;
--   (c) código que não existe: 'invalido'; código com formato errado também;
--   (d) depois de 8 códigos errados na hora, até o código certo devolve 'muitas_tentativas' (freio contra adivinhação);
--   (e) conta com mais de 7 dias: 'nao_novo'; conta nova mas com aluno: 'nao_novo';
--   (f) campanha fora do período: 'fora_do_periodo'; campanha pausada: 'invalido';
--   (g) campanha esgotada (limite de usos): 'esgotado'; com vaga, A resgata ('ok') e o total de resgates é 2;
--   (h) o cliente (authenticated) NÃO lê campanhas nem resgates; anon não executa as funções;
--   (i) o cupom NÃO conta no teto da indicação (a tabela de indicações não muda).
-- Esperado: "(a) OK" … "(i) OK", sem "FALHA".
DO $$
DECLARE
  v_ids UUID[];
  v_a UUID;
  v_b UUID;
  v_camp UUID;
  v_r JSONB;
  v_fim TIMESTAMPTZ;
  v_bonus TIMESTAMPTZ;
  v_n INT;
  v_ind_antes INT;
  v_ok BOOLEAN;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT array_agg(id) INTO v_ids FROM (
    SELECT p.id FROM treino.professionals p JOIN treino.assinaturas a ON a.professional_id = p.id WHERE p.is_admin = FALSE ORDER BY p.id LIMIT 2
  ) x;
  IF coalesce(array_length(v_ids, 1), 0) < 2 THEN RAISE EXCEPTION 'RESULTADO: AVISO - preciso de 2 personais com assinatura; teste não executado'; END IF;
  v_a := v_ids[1];
  v_b := v_ids[2];

  DELETE FROM treino.alunos WHERE professional_id IN (v_a, v_b);
  DELETE FROM treino.resgates_cupom WHERE professional_id IN (v_a, v_b);
  DELETE FROM treino.cupom_tentativas WHERE professional_id IN (v_a, v_b);
  SELECT count(*) INTO v_ind_antes FROM treino.indicacoes;
  UPDATE treino.professionals SET created_at = now() - INTERVAL '1 day' WHERE id IN (v_a, v_b);
  v_fim := now() + INTERVAL '10 days';
  UPDATE treino.assinaturas SET status = 'trial', trial_fim = v_fim, bonus_ate = NULL, assinatura_fim = NULL WHERE professional_id IN (v_a, v_b);
  INSERT INTO treino.campanhas_cupom (codigo, parceiro, dias_bonus, valido_de, valido_ate, max_usos)
    VALUES ('TESTE90', '[E2E] Parceiro', 90, now() - INTERVAL '1 hour', now() + INTERVAL '30 days', 2) RETURNING id INTO v_camp;

  -- (a) B resgata
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom(' teste90 ');
  RESET ROLE;
  SELECT bonus_ate INTO v_bonus FROM treino.assinaturas WHERE professional_id = v_b;
  v_log := array_append(v_log, CASE WHEN v_r->>'resultado' = 'ok' AND (v_r->>'dias')::INT = 90
    AND abs(extract(epoch FROM (v_bonus - (v_fim + INTERVAL '90 days')))) < 1
    AND (SELECT count(*) FROM treino.resgates_cupom WHERE professional_id = v_b AND campanha_id = v_camp) = 1
    THEN '(a) OK: B resgatou; bonus_ate = fim do trial + 90 dias (somou)' ELSE '(a) FALHA: ' || v_r::TEXT || ' bonus=' || coalesce(v_bonus::TEXT, 'null') END);

  -- (b) segundo uso e meu_cupom
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('TESTE90');
  v_ok := (treino.meu_cupom()->>'usou')::BOOLEAN AND (treino.meu_cupom()->>'dias')::INT = 90;
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r->>'resultado' = 'ja_usou' AND v_ok THEN '(b) OK: segundo uso recusado; meu_cupom mostra 90 dias' ELSE '(b) FALHA: ' || v_r::TEXT END);

  -- (c) código inexistente e formato errado (com A) -> contam como tentativas erradas (2 de 8)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('NAOEXISTE');
  v_ok := v_r->>'resultado' = 'invalido' AND treino.resgatar_cupom('a b!')->>'resultado' = 'invalido';
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_ok THEN '(c) OK: código inexistente e formato errado dão "invalido"' ELSE '(c) FALHA: ' || v_r::TEXT END);

  -- (d) freio: mais 6 erros (total 8) e o certo também é barrado
  SET LOCAL ROLE authenticated;
  FOR i IN 1..6 LOOP PERFORM treino.resgatar_cupom('ERRADO' || i); END LOOP;
  v_r := treino.resgatar_cupom('TESTE90');
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_r->>'resultado' = 'muitas_tentativas' THEN '(d) OK: depois de 8 erros, até o código certo é barrado' ELSE '(d) FALHA: ' || v_r::TEXT END);
  DELETE FROM treino.cupom_tentativas WHERE professional_id = v_a;

  -- (e) conta antiga e conta com aluno
  UPDATE treino.professionals SET created_at = now() - INTERVAL '10 days' WHERE id = v_a;
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('TESTE90');
  RESET ROLE;
  v_ok := v_r->>'resultado' = 'nao_novo';
  UPDATE treino.professionals SET created_at = now() - INTERVAL '1 day' WHERE id = v_a;
  INSERT INTO treino.alunos (professional_id, name) VALUES (v_a, '[E2E] Aluno cupom');
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('TESTE90');
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_ok AND v_r->>'resultado' = 'nao_novo' THEN '(e) OK: conta com 10 dias e conta nova com aluno: "nao_novo"' ELSE '(e) FALHA: ' || v_r::TEXT END);
  DELETE FROM treino.alunos WHERE professional_id = v_a;

  -- (f) fora do período e pausada
  UPDATE treino.campanhas_cupom SET valido_ate = now() - INTERVAL '1 minute' WHERE id = v_camp;
  SET LOCAL ROLE authenticated;
  v_ok := treino.resgatar_cupom('TESTE90')->>'resultado' = 'fora_do_periodo';
  RESET ROLE;
  UPDATE treino.campanhas_cupom SET valido_ate = now() + INTERVAL '30 days', ativa = FALSE WHERE id = v_camp;
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('TESTE90');
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_ok AND v_r->>'resultado' = 'invalido' THEN '(f) OK: fora do período e pausada são recusadas' ELSE '(f) FALHA: ' || v_r::TEXT END);
  UPDATE treino.campanhas_cupom SET ativa = TRUE WHERE id = v_camp;
  DELETE FROM treino.cupom_tentativas WHERE professional_id = v_a;

  -- (g) esgotada e depois com vaga
  UPDATE treino.campanhas_cupom SET max_usos = 1 WHERE id = v_camp;
  SET LOCAL ROLE authenticated;
  v_ok := treino.resgatar_cupom('TESTE90')->>'resultado' = 'esgotado';
  RESET ROLE;
  UPDATE treino.campanhas_cupom SET max_usos = 2 WHERE id = v_camp;
  SET LOCAL ROLE authenticated;
  v_r := treino.resgatar_cupom('TESTE90');
  RESET ROLE;
  SELECT count(*) INTO v_n FROM treino.resgates_cupom WHERE campanha_id = v_camp;
  v_log := array_append(v_log, CASE WHEN v_ok AND v_r->>'resultado' = 'ok' AND v_n = 2 THEN '(g) OK: com limite 1 está esgotada; com vaga A resgata (2 usos)' ELSE '(g) FALHA: ' || v_r::TEXT || ' usos=' || v_n END);

  -- (h) permissões
  SET LOCAL ROLE authenticated;
  v_ok := TRUE;
  BEGIN PERFORM 1 FROM treino.campanhas_cupom LIMIT 1; v_ok := FALSE; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM treino.resgates_cupom LIMIT 1; v_ok := FALSE; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  v_log := array_append(v_log, CASE WHEN v_ok
    AND NOT has_function_privilege('anon', 'treino.resgatar_cupom(text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'treino.meu_cupom()', 'EXECUTE')
    AND has_function_privilege('authenticated', 'treino.resgatar_cupom(text)', 'EXECUTE')
    THEN '(h) OK: o cliente não lê as tabelas; anon não executa; authenticated executa' ELSE '(h) FALHA: permissões erradas' END);

  -- (i) o cupom não mexe na indicação
  v_log := array_append(v_log, CASE WHEN (SELECT count(*) FROM treino.indicacoes) = v_ind_antes THEN '(i) OK: nenhuma indicação criada pelo cupom' ELSE '(i) FALHA: indicações mudaram' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
