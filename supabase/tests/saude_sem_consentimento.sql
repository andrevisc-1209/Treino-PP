-- Quantos alunos têm dado clínico gravado SEM consentimento ativo (só leitura; devolve apenas uma CONTAGEM, nunca nomes nem dados:
-- o operador da plataforma não lê dado de aluno). Esses alunos continuam legíveis e editáveis nos outros campos (migration 20261051);
-- para alterar os campos clínicos o personal precisa registrar o consentimento. Útil para orientar os personais a pedi-lo.
SELECT count(*) AS alunos_com_dado_clinico_sem_consentimento
FROM treino.alunos a
WHERE (a.injury OR a.surgery OR a.medications IS NOT NULL OR a.height_cm IS NOT NULL
       OR cardinality(a.injury_regions) > 0 OR cardinality(a.surgery_regions) > 0
       OR a.injury_notes IS NOT NULL OR a.surgery_notes IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM treino.consentimentos c WHERE c.aluno_id = a.id AND c.revoked_at IS NULL);
