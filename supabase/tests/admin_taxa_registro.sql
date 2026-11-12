-- Teste para o SQL Editor do Supabase. NÃO grava nada: termina de propósito com um erro que desfaz tudo. Rode DEPOIS da migration 20261096.
-- Prova:
--   (a) a função existe e recusa quem não é admin (42501);
--   (b) o anon não consegue executá-la;
--   (c) a conta usada aqui, sem sessão de admin, não recebe número nenhum.
-- Esperado: "(a) OK" … "(c) OK", sem "FALHA".

DO $$
DECLARE
  v_log TEXT[] := ARRAY[]::TEXT[];
  v_r JSONB;
BEGIN
  BEGIN
    v_r := treino.admin_taxa_registro();
    v_log := v_log || 'FALHA (a): a função respondeu sem ser admin';
  EXCEPTION WHEN insufficient_privilege THEN
    v_log := v_log || '(a) OK: recusa quem não é admin';
  END;

  IF has_function_privilege('anon', 'treino.admin_taxa_registro()', 'EXECUTE') THEN
    v_log := v_log || 'FALHA (b): anon pode executar';
  ELSE
    v_log := v_log || '(b) OK: anon não executa';
  END IF;

  IF v_r IS NULL THEN
    v_log := v_log || '(c) OK: nenhum número sem sessão de admin';
  ELSE
    v_log := v_log || 'FALHA (c): devolveu números sem ser admin';
  END IF;

  RAISE EXCEPTION 'RESULTADO (nada foi gravado): %', array_to_string(v_log, E'\n');
END $$;
