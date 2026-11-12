-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261099.
-- Prova:
--   (a) aceita foto WebP e JPEG pequenas em data URL e aceita vazio (NULL);
--   (b) recusa outro tipo de imagem (PNG/SVG), texto qualquer e foto grande demais (> 60.000 caracteres);
--   (c) a Política 1.16 está registrada.
-- Esperado: "(a) OK" … "(c) OK", sem "FALHA".

DO $$
DECLARE
  v_dono UUID;
  v_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT c.professional_id INTO v_dono FROM treino.professional_config c ORDER BY c.professional_id LIMIT 1;
  IF v_dono IS NULL THEN RAISE EXCEPTION 'RESULTADO: AVISO - nenhum personal com configuração; teste não executado'; END IF;

  BEGIN
    UPDATE treino.professional_config SET pagina_foto = 'data:image/webp;base64,AAAA' WHERE professional_id = v_dono;
    UPDATE treino.professional_config SET pagina_foto = 'data:image/jpeg;base64,AAAA' WHERE professional_id = v_dono;
    UPDATE treino.professional_config SET pagina_foto = NULL WHERE professional_id = v_dono;
    v_log := array_append(v_log, '(a) OK: aceita WebP, JPEG e vazio'::TEXT);
  EXCEPTION WHEN check_violation THEN
    v_log := array_append(v_log, 'FALHA (a): recusou foto válida'::TEXT);
  END;

  BEGIN
    UPDATE treino.professional_config SET pagina_foto = 'data:image/png;base64,AAAA' WHERE professional_id = v_dono;
    v_log := array_append(v_log, 'FALHA (b): aceitou PNG'::TEXT);
  EXCEPTION WHEN check_violation THEN
    BEGIN
      UPDATE treino.professional_config SET pagina_foto = 'data:image/webp;base64,' || repeat('A', 60000) WHERE professional_id = v_dono;
      v_log := array_append(v_log, 'FALHA (b): aceitou foto grande demais'::TEXT);
    EXCEPTION WHEN check_violation THEN
      v_log := array_append(v_log, '(b) OK: recusa PNG e foto grande demais'::TEXT);
    END;
  END;

  v_log := array_append(v_log, CASE WHEN EXISTS (SELECT 1 FROM treino.documentos_versoes WHERE tipo = 'privacidade' AND versao = '1.16') THEN '(c) OK: Política 1.16 registrada' ELSE 'FALHA (c): Política 1.16 ausente' END);

  RAISE EXCEPTION 'RESULTADO (nada foi gravado): %', array_to_string(v_log, E'\n');
END $$;
