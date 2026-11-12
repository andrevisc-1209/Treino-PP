-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261100.
-- Prova: (a) aceita lista vazia e 2 locais; (b) aceita 5; (c) recusa 6; (d) recusa algo que não é lista; (e) recusa lista enorme.
-- Esperado: "(a) OK" … "(e) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_item JSONB := '{"nome":"Academia X","endereco":"Rua A, 1","mapsLink":"https://maps.google.com/x"}';
BEGIN
  SELECT c.professional_id INTO v_dono FROM treino.professional_config c ORDER BY c.professional_id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal com configuração; teste não executado'; END IF;

  BEGIN
    UPDATE treino.professional_config SET locais_atendimento = '[]' WHERE professional_id = v_dono;
    UPDATE treino.professional_config SET locais_atendimento = jsonb_build_array(v_item, v_item) WHERE professional_id = v_dono;
    v_log := array_append(v_log, '(a) OK: aceita vazio e 2 locais'::TEXT);
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, 'FALHA (a)'::TEXT); END;

  BEGIN
    UPDATE treino.professional_config SET locais_atendimento = jsonb_build_array(v_item, v_item, v_item, v_item, v_item) WHERE professional_id = v_dono;
    v_log := array_append(v_log, '(b) OK: aceita 5'::TEXT);
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, 'FALHA (b): recusou 5'::TEXT); END;

  BEGIN
    UPDATE treino.professional_config SET locais_atendimento = jsonb_build_array(v_item, v_item, v_item, v_item, v_item, v_item) WHERE professional_id = v_dono;
    v_log := array_append(v_log, 'FALHA (c): aceitou 6'::TEXT);
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(c) OK: recusa 6'::TEXT); END;

  BEGIN
    UPDATE treino.professional_config SET locais_atendimento = '{"nome":"x"}' WHERE professional_id = v_dono;
    v_log := array_append(v_log, 'FALHA (d): aceitou objeto'::TEXT);
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(d) OK: recusa o que não é lista'::TEXT); END;

  BEGIN
    UPDATE treino.professional_config SET locais_atendimento = jsonb_build_array(jsonb_build_object('nome', repeat('A', 3500))) WHERE professional_id = v_dono;
    v_log := array_append(v_log, 'FALHA (e): aceitou lista enorme'::TEXT);
  EXCEPTION WHEN check_violation THEN v_log := array_append(v_log, '(e) OK: recusa lista enorme'::TEXT); END;

  RAISE EXCEPTION 'RESULTADO (nada foi gravado): %', array_to_string(v_log, E'\n');
END $$;
