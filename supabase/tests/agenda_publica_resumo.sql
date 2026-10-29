-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261093.
-- Prova:
--   (a) o resumo do personal conta pedidos de 7 dias, pendentes, aprovados, mediana de resposta e aulas realizadas vindas do link;
--   (b) outro personal não vê nada disso (zeros);
--   (c) a função do admin recusa quem não é admin;
--   (d) a Política 1.13 está registrada.
-- Esperado: "(a) OK" … "(d) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_aula UUID;
  v_r JSONB;
  v_n INT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT p.id INTO v_dono
  FROM treino.professionals p
  JOIN treino.assinaturas a ON a.professional_id = p.id
  WHERE p.is_admin = FALSE
    AND ((a.status = 'trial' AND a.trial_fim > now()) OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now())))
  ORDER BY p.id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal com assinatura ativa; teste não executado'; END IF;
  SELECT p.id INTO v_outro FROM treino.professionals p WHERE p.id <> v_dono AND p.is_admin = FALSE ORDER BY p.id LIMIT 1;

  -- dados de teste (como dono do banco): 1 aula realizada vinda de pedido aprovado (respondido em 30 min) e 1 pedido pendente
  INSERT INTO treino.aulas (professional_id, starts_at, duration_min, status) VALUES (v_dono, '2020-01-10 13:00:00+00', 60, 'realizada') RETURNING id INTO v_aula;
  INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min, status, aula_id, created_at, respondido_em)
  VALUES (v_dono, '[E2E] Aprovado', '5521999990011', '2020-01-10 13:00:00+00', 60, 'aprovado', v_aula, now() - interval '2 days', now() - interval '2 days' + interval '30 minutes');
  INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min)
  VALUES (v_dono, '[E2E] Pendente', '5521999990012', '2030-01-15 13:00:00+00', 60);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  v_r := treino.resumo_agenda_publica();
  v_log := array_append(v_log, CASE
    WHEN (v_r->>'pedidos_7d')::INT = 2 AND (v_r->>'pendentes')::INT >= 1 AND (v_r->>'aprovados_30d')::INT = 1
      AND (v_r->>'aulas_realizadas')::INT = 1 AND round((v_r->>'mediana_resposta_min')::NUMERIC) = 30
    THEN '(a) OK: pedidos, pendentes, aprovados, mediana (30 min) e aula realizada contados'
    ELSE '(a) FALHA: ' || v_r::TEXT END);

  -- (b)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(b) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    v_r := treino.resumo_agenda_publica();
    v_log := array_append(v_log, CASE WHEN (v_r->>'pedidos_7d')::INT = 0 AND (v_r->>'aulas_realizadas')::INT = 0 THEN '(b) OK: outro personal não vê os números do dono' ELSE '(b) FALHA: ' || v_r::TEXT END);
  END IF;

  -- (c)
  BEGIN
    PERFORM treino.admin_agenda_publica_resumo();
    v_log := array_append(v_log, '(c) FALHA: personal comum leu o resumo do admin');
  EXCEPTION WHEN insufficient_privilege THEN v_log := array_append(v_log, '(c) OK: função do admin recusa quem não é admin'); END;

  RESET ROLE;

  -- (d)
  SELECT count(*) INTO v_n FROM treino.documentos_versoes WHERE tipo = 'privacidade' AND versao = '1.13';
  v_log := array_append(v_log, CASE WHEN v_n = 1 THEN '(d) OK: Política 1.13 registrada' ELSE '(d) FALHA: Política 1.13 não registrada' END);

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
