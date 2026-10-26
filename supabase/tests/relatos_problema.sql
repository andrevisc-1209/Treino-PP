-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo; o RESULTADO aparece
-- na mensagem desse erro. Rode DEPOIS da migration 20261060. Como personal logado (o primeiro da tabela):
--   (a) envia um relato e ele nasce com status "novo", mesmo que o cliente mande "resolvido";
--   (b) não consegue editar nem apagar o relato;
--   (c) não consegue enviar em nome de outro personal;
--   (d) mensagem curta demais (< 10 caracteres) é recusada;
--   (e) o 6º relato na mesma hora é recusado (limite de 5/hora);
--   (f) não chama as funções de admin (admin_relatos).
-- Esperado: "(a) OK" … "(f) OK", sem "FALHA". Precisa de pelo menos dois personais cadastrados para o caso (c).

DO $$
DECLARE
  v_prof UUID;
  v_outro UUID;
  v_id UUID;
  v_status TEXT;
  v_n INT;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT id INTO v_prof FROM treino.professionals WHERE is_admin = FALSE ORDER BY id LIMIT 1;
  SELECT id INTO v_outro FROM treino.professionals WHERE id <> v_prof AND is_admin = FALSE LIMIT 1;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - precisa de um personal cadastrado; teste não executado'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::TEXT, TRUE);
  SET LOCAL ROLE authenticated;

  -- (a)
  INSERT INTO treino.relatos (professional_id, tipo, mensagem, status) VALUES (v_prof, 'problema', 'A tela de alunos não carrega', 'resolvido') RETURNING id INTO v_id;
  SELECT status INTO v_status FROM treino.relatos WHERE id = v_id;
  v_log := array_append(v_log, CASE WHEN v_status = 'novo' THEN '(a) OK: nasce como novo' ELSE '(a) FALHA: status = ' || v_status END);

  -- (b)
  BEGIN
    UPDATE treino.relatos SET mensagem = 'editado pelo cliente' WHERE id = v_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_log := array_append(v_log, '(b) FALHA: editou o relato');
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      DELETE FROM treino.relatos WHERE id = v_id;
      v_log := array_append(v_log, '(b) FALHA: apagou o relato');
    EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(b) OK: não edita nem apaga'); END;
  END;

  -- (c)
  IF v_outro IS NULL THEN
    v_log := array_append(v_log, '(c) AVISO: só há um personal; caso não testado');
  ELSE
    BEGIN
      INSERT INTO treino.relatos (professional_id, tipo, mensagem) VALUES (v_outro, 'duvida', 'Relato em nome de outra pessoa');
      v_log := array_append(v_log, '(c) FALHA: enviou como outro personal');
    EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(c) OK: não envia como outro personal'); END;
  END IF;

  -- (d)
  BEGIN
    INSERT INTO treino.relatos (professional_id, tipo, mensagem) VALUES (v_prof, 'duvida', 'curto');
    v_log := array_append(v_log, '(d) FALHA: aceitou mensagem curta');
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, '(d) OK: recusa mensagem curta'); END;

  -- (e) já há 1 relato; mais 4 entram (total 5) e o 6º é barrado
  FOR i IN 1..4 LOOP
    INSERT INTO treino.relatos (professional_id, tipo, mensagem) VALUES (v_prof, 'sugestao', 'Sugestão número ' || i || ' de teste');
  END LOOP;
  BEGIN
    INSERT INTO treino.relatos (professional_id, tipo, mensagem) VALUES (v_prof, 'sugestao', 'Sexto relato na mesma hora');
    v_log := array_append(v_log, '(e) FALHA: passou do limite de 5/hora');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Você já enviou vários relatos%' THEN '(e) OK: limite de 5 por hora' ELSE '(e) FALHA: ' || SQLERRM END);
  END;

  -- (f)
  BEGIN
    PERFORM * FROM treino.admin_relatos();
    v_log := array_append(v_log, '(f) FALHA: personal comum chamou admin_relatos');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, CASE WHEN SQLERRM LIKE 'Acesso restrito ao admin%' THEN '(f) OK: admin_relatos exige admin' ELSE '(f) FALHA: ' || SQLERRM END);
  END;

  RAISE EXCEPTION 'RESULTADO: % | (nada foi gravado)', array_to_string(v_log, ' | ');
END $$;
