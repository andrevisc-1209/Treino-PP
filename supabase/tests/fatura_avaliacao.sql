-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece
-- na mensagem desse erro. Rode DEPOIS da migration 20261084. Como personal logado, prova:
--   (a) o dono grava e lê a avaliação numa fatura dele;
--   (b) texto com mais de 500 caracteres é recusado;
--   (c) outro personal não altera a avaliação (0 linhas afetadas).
-- Esperado: "(a) OK" … "(c) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_fat UUID;
  v_n INT;
  v_texto TEXT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT f.professional_id, f.id INTO v_dono, v_fat
  FROM treino.faturas f
  JOIN treino.assinaturas a ON a.professional_id = f.professional_id
  WHERE f.status <> 'cancelada'
    AND ((a.status = 'trial' AND a.trial_fim > now()) OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())))
  ORDER BY f.created_at DESC LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhuma fatura de personal com assinatura ativa; teste não executado'; END IF;
  SELECT p.id INTO v_outro FROM treino.professionals p WHERE p.id <> v_dono AND p.is_admin = FALSE ORDER BY p.id LIMIT 1;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  UPDATE treino.faturas SET avaliacao_conquistas = 'Ótima constância', avaliacao_atencao = 'Alongar mais', avaliacao_proximos = 'Correr 10 km' WHERE id = v_fat;
  SELECT avaliacao_conquistas INTO v_texto FROM treino.faturas WHERE id = v_fat;
  v_log := array_append(v_log, CASE WHEN v_texto = 'Ótima constância' THEN '(a) OK: dono gravou e leu a avaliação' ELSE '(a) FALHA: ' || coalesce(v_texto, 'NULL') END);

  -- (b)
  BEGIN
    UPDATE treino.faturas SET avaliacao_atencao = repeat('x', 501) WHERE id = v_fat;
    v_log := array_append(v_log, '(b) FALHA: aceitou 501 caracteres');
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(b) OK: 501 caracteres recusados'); END;

  -- (c)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(c) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    UPDATE treino.faturas SET avaliacao_conquistas = 'invasor' WHERE id = v_fat;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_log := array_append(v_log, CASE WHEN v_n = 0 THEN '(c) OK: outro personal não altera' ELSE '(c) FALHA: alterou ' || v_n END);
  END IF;

  RESET ROLE;
  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
