-- Teste de isolamento entre personais (SÓ LEITURA: termina em ROLLBACK). Rode no SQL Editor ANTES e DEPOIS de migrations de RLS/grants.
--
-- Escolhe um personal (não admin) com dados, personifica-o como o papel `authenticated` e, para cada tabela do schema
-- treino, compara quantas linhas ele ENXERGA com quantas são DELE. Se enxergar mais, há vazamento.
-- Só é conclusivo se existir mais de um personal com dados; o resultado mostra quantos outros personais existem.
-- Resultado esperado: coluna `situacao` = 'ok' em todas as linhas.

BEGIN;

CREATE TEMP TABLE resultado (tabela TEXT, esperadas BIGINT, visiveis BIGINT, situacao TEXT) ON COMMIT DROP;
GRANT ALL ON resultado TO PUBLIC;

DO $$
DECLARE
  u UUID;
  alvo RECORD;
  esp BIGINT;
  vis BIGINT;
BEGIN
  SELECT p.id INTO u
  FROM treino.professionals p
  WHERE NOT p.is_admin
  ORDER BY (SELECT count(*) FROM treino.alunos a WHERE a.professional_id = p.id) DESC, p.created_at
  LIMIT 1;
  IF u IS NULL THEN RAISE EXCEPTION 'nenhum personal encontrado'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', u::text, true);

  -- (tabela, SQL com as linhas que PERTENCEM ao personal; $1 = id do personal)
  FOR alvo IN
    SELECT t.table_name::text AS tabela,
           CASE t.table_name
             WHEN 'exercicios' THEN 'professional_id = $1 OR professional_id IS NULL' -- biblioteca global é de todos
             ELSE 'professional_id = $1'
           END AS onde
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name AND c.column_name = 'professional_id'
    WHERE t.table_schema = 'treino' AND t.table_type = 'BASE TABLE' AND t.table_name NOT IN ('admin_logs')
    UNION ALL SELECT 'professionals', 'id = $1'
    UNION ALL SELECT 'consentimento_reenvios', 'personal_id = $1'
    UNION ALL SELECT 'aula_participantes', 'aula_id IN (SELECT id FROM treino.aulas WHERE professional_id = $1)'
    UNION ALL SELECT 'plano_exercicios', 'plano_id IN (SELECT id FROM treino.planos WHERE professional_id = $1)'
    UNION ALL SELECT 'modelo_exercicios', 'modelo_id IN (SELECT id FROM treino.modelos WHERE professional_id = $1)'
    UNION ALL SELECT 'horario_alunos', 'horario_id IN (SELECT id FROM treino.horarios_fixos WHERE professional_id = $1)'
    UNION ALL SELECT 'sessao_exercicios', 'sessao_id IN (SELECT id FROM treino.sessoes WHERE professional_id = $1)'
    UNION ALL SELECT 'pesos', 'aluno_id IN (SELECT id FROM treino.alunos WHERE professional_id = $1)'
    UNION ALL SELECT 'sessao_series', 'sessao_exercicio_id IN (SELECT se.id FROM treino.sessao_exercicios se JOIN treino.sessoes s ON s.id = se.sessao_id WHERE s.professional_id = $1)'
    UNION ALL SELECT 'admin_logs', 'false' -- não-admin não enxerga nada
  LOOP
    -- esperado: contado com o papel privilegiado (do SQL Editor)
    EXECUTE format('SELECT count(*) FROM treino.%I WHERE %s', alvo.tabela, alvo.onde) INTO esp USING u;
    -- visível: contado como o personal (RLS + privilégios valendo)
    SET LOCAL ROLE authenticated;
    BEGIN
      EXECUTE format('SELECT count(*) FROM treino.%I', alvo.tabela) INTO vis;
    EXCEPTION WHEN insufficient_privilege THEN
      vis := 0; -- sem privilégio de leitura: nada visível (ok)
    END;
    RESET ROLE;
    INSERT INTO resultado VALUES (alvo.tabela, esp, vis, CASE WHEN vis > esp THEN 'VAZAMENTO' ELSE 'ok' END);
  END LOOP;

  INSERT INTO resultado VALUES ('(outros personais com alunos)', (SELECT count(DISTINCT professional_id) FROM treino.alunos WHERE professional_id <> u), 0, 'info');
END $$;

SELECT * FROM resultado ORDER BY (situacao = 'VAZAMENTO') DESC, tabela;

ROLLBACK;
