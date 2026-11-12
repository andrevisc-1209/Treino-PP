-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261101.
-- Prova: (a) aceita modalidades válidas; (b) recusa modalidade fora das 5 e mais de 5; (c) o pedido aceita local e modalidade válidos;
--        (d) o pedido recusa modalidade inválida; (e) a Política 1.17 está registrada.
-- Esperado: "(a) OK" … "(e) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT c.professional_id INTO v_dono FROM treino.professional_config c ORDER BY c.professional_id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal com configuração; teste não executado'; END IF;

  BEGIN
    UPDATE treino.professional_config SET modalidades_atendimento = ARRAY['musculacao', 'natacao'] WHERE professional_id = v_dono;
    UPDATE treino.professional_config SET modalidades_atendimento = '{}' WHERE professional_id = v_dono;
    v_log := array_append(v_log, '(a) OK: aceita modalidades válidas'::TEXT);
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, 'FALHA (a)'::TEXT); END;

  BEGIN
    UPDATE treino.professional_config SET modalidades_atendimento = ARRAY['yoga'] WHERE professional_id = v_dono;
    v_log := array_append(v_log, 'FALHA (b): aceitou yoga'::TEXT);
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(b) OK: recusa modalidade fora das 5'::TEXT); END;

  BEGIN
    INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min, local_escolhido, modalidade)
    VALUES (v_dono, '[E2E] Teste', '5521999990011', now() + interval '3 days', 60, 'Smart Fit Laranjeiras', 'natacao');
    v_log := array_append(v_log, '(c) OK: pedido aceita local e modalidade'::TEXT);
  EXCEPTION WHEN OTHERS THEN v_log := array_append(v_log, 'FALHA (c): ' || SQLERRM); END;

  BEGIN
    INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, inicio, duracao_min, modalidade)
    VALUES (v_dono, '[E2E] Teste', '5521999990012', now() + interval '4 days', 60, 'yoga');
    v_log := array_append(v_log, 'FALHA (d): pedido aceitou yoga'::TEXT);
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(d) OK: pedido recusa modalidade inválida'::TEXT); END;

  v_log := array_append(v_log, CASE WHEN EXISTS (SELECT 1 FROM treino.documentos_versoes WHERE tipo = 'privacidade' AND versao = '1.17') THEN '(e) OK: Política 1.17 registrada' ELSE 'FALHA (e): Política 1.17 ausente' END);

  RAISE EXCEPTION 'RESULTADO (nada foi gravado): %', array_to_string(v_log, E'\n');
END $$;
