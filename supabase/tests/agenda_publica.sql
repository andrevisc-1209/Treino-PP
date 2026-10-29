-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261089.
-- Como personal logado com assinatura ativa, prova:
--   (a) configurar_agenda_publica liga a página e gera um link no formato certo; chamar de novo MANTÉM o link; "trocar" gera outro;
--   (b) desligar mantém o link guardado mas a página fica desligada; o padrão de quem nunca ligou é DESLIGADO;
--   (c) o personal não consegue INSERIR pedido direto (só a Edge Function com service_role insere) mas lê e responde os dele;
--   (d) outro personal não enxerga nem altera os pedidos do dono;
--   (e) pedido duplicado pendente (mesmo telefone e horário) é recusado pelo índice único.
-- Esperado: "(a) OK" … "(e) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_outro UUID;
  v_slug1 TEXT;
  v_slug2 TEXT;
  v_slug3 TEXT;
  v_ativa BOOLEAN;
  v_n INT;
  v_alt INT;
  v_ped UUID;
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

  DELETE FROM treino.professional_config WHERE professional_id = v_dono;
  INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min)
  VALUES (v_dono, 'Visitante Teste', '5521999990000', now() + interval '2 days', 60) RETURNING id INTO v_ped;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  v_slug1 := treino.configurar_agenda_publica(TRUE, FALSE);
  SELECT agenda_publica_ativa INTO v_ativa FROM treino.professional_config WHERE professional_id = v_dono;
  v_slug2 := treino.configurar_agenda_publica(TRUE, FALSE);
  v_slug3 := treino.configurar_agenda_publica(TRUE, TRUE);
  v_log := array_append(v_log, CASE
    WHEN v_slug1 ~ '^[a-z0-9]+(-[a-z0-9]+)*-[0-9a-f]{4}$' AND v_ativa AND v_slug2 = v_slug1 AND v_slug3 <> v_slug1
    THEN '(a) OK: link ' || v_slug1 || ' gerado, mantido ao religar e trocado ao pedir novo (' || v_slug3 || ')'
    ELSE '(a) FALHA: ' || COALESCE(v_slug1, 'null') || ' / ' || COALESCE(v_slug2, 'null') || ' / ' || COALESCE(v_slug3, 'null') END);

  -- (b)
  PERFORM treino.configurar_agenda_publica(FALSE, FALSE);
  SELECT agenda_publica_ativa INTO v_ativa FROM treino.professional_config WHERE professional_id = v_dono;
  SELECT count(*) INTO v_n FROM treino.professional_config WHERE professional_id = v_dono AND agenda_publica_slug = v_slug3;
  v_log := array_append(v_log, CASE WHEN NOT v_ativa AND v_n = 1 THEN '(b) OK: desligada, link guardado' ELSE '(b) FALHA: ativa=' || v_ativa || ' n=' || v_n END);

  -- (c)
  BEGIN
    INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min) VALUES (v_dono, 'Eu mesmo', '5521988880000', now() + interval '3 days', 60);
    v_log := array_append(v_log, '(c) FALHA: personal inseriu pedido direto');
  EXCEPTION WHEN insufficient_privilege THEN
    SELECT count(*) INTO v_n FROM treino.pedidos_agenda WHERE id = v_ped;
    UPDATE treino.pedidos_agenda SET status = 'recusado', respondido_em = now() WHERE id = v_ped;
    GET DIAGNOSTICS v_alt = ROW_COUNT;
    v_log := array_append(v_log, CASE WHEN v_n = 1 AND v_alt = 1 THEN '(c) OK: INSERT direto negado; lê e responde o próprio pedido' ELSE '(c) FALHA: n=' || v_n || ' alt=' || v_alt END);
  END;

  -- (d)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(d) AVISO: só há um personal, isolamento não testado');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::TEXT, TRUE);
    SELECT count(*) INTO v_n FROM treino.pedidos_agenda WHERE id = v_ped;
    UPDATE treino.pedidos_agenda SET status = 'aprovado' WHERE id = v_ped;
    GET DIAGNOSTICS v_alt = ROW_COUNT;
    v_log := array_append(v_log, CASE WHEN v_n = 0 AND v_alt = 0 THEN '(d) OK: outro personal não enxerga nem altera' ELSE '(d) FALHA: enxerga=' || v_n || ' alterou=' || v_alt END);
  END IF;

  RESET ROLE;

  -- (e) como dono do banco (a Edge Function usa service_role): o índice único recusa o pedido pendente repetido
  INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min) VALUES (v_dono, 'Repetido', '5521977770000', '2030-01-01 10:00+00', 60);
  BEGIN
    INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min) VALUES (v_dono, 'Repetido', '5521977770000', '2030-01-01 10:00+00', 60);
    v_log := array_append(v_log, '(e) FALHA: aceitou pedido pendente repetido');
  EXCEPTION WHEN unique_violation THEN
    v_log := array_append(v_log, '(e) OK: pedido pendente repetido recusado');
  END;

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
