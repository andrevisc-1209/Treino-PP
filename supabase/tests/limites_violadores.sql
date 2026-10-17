-- Linhas que HOJE passam dos limites da migration 20261045 (só leitura). Esperado: nenhuma linha.
-- Se vier alguma, me avise: ou subimos o limite daquela coluna ou o texto é encurtado antes de validar a constraint.

SELECT * FROM (
  SELECT 'alunos.name' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(name)) AS maior FROM treino.alunos WHERE char_length(name) > 120
  UNION ALL SELECT 'alunos.email' AS coluna, 254 AS limite, count(*) AS violacoes, max(char_length(email)) AS maior FROM treino.alunos WHERE char_length(email) > 254
  UNION ALL SELECT 'alunos.phone' AS coluna, 30 AS limite, count(*) AS violacoes, max(char_length(phone)) AS maior FROM treino.alunos WHERE char_length(phone) > 30
  UNION ALL SELECT 'alunos.sport_name' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(sport_name)) AS maior FROM treino.alunos WHERE char_length(sport_name) > 120
  UNION ALL SELECT 'alunos.objetivo_notes' AS coluna, 2000 AS limite, count(*) AS violacoes, max(char_length(objetivo_notes)) AS maior FROM treino.alunos WHERE char_length(objetivo_notes) > 2000
  UNION ALL SELECT 'alunos.injury_notes' AS coluna, 2000 AS limite, count(*) AS violacoes, max(char_length(injury_notes)) AS maior FROM treino.alunos WHERE char_length(injury_notes) > 2000
  UNION ALL SELECT 'alunos.surgery_notes' AS coluna, 2000 AS limite, count(*) AS violacoes, max(char_length(surgery_notes)) AS maior FROM treino.alunos WHERE char_length(surgery_notes) > 2000
  UNION ALL SELECT 'alunos.medications' AS coluna, 2000 AS limite, count(*) AS violacoes, max(char_length(medications)) AS maior FROM treino.alunos WHERE char_length(medications) > 2000
  UNION ALL SELECT 'professionals.name' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(name)) AS maior FROM treino.professionals WHERE char_length(name) > 120
  UNION ALL SELECT 'professionals.email' AS coluna, 254 AS limite, count(*) AS violacoes, max(char_length(email)) AS maior FROM treino.professionals WHERE char_length(email) > 254
  UNION ALL SELECT 'professionals.phone' AS coluna, 30 AS limite, count(*) AS violacoes, max(char_length(phone)) AS maior FROM treino.professionals WHERE char_length(phone) > 30
  UNION ALL SELECT 'professionals.cref' AS coluna, 30 AS limite, count(*) AS violacoes, max(char_length(cref)) AS maior FROM treino.professionals WHERE char_length(cref) > 30
  UNION ALL SELECT 'aluno_locais_treino.nome' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(nome)) AS maior FROM treino.aluno_locais_treino WHERE char_length(nome) > 120
  UNION ALL SELECT 'aluno_locais_treino.endereco' AS coluna, 300 AS limite, count(*) AS violacoes, max(char_length(endereco)) AS maior FROM treino.aluno_locais_treino WHERE char_length(endereco) > 300
  UNION ALL SELECT 'aluno_locais_treino.maps_link' AS coluna, 500 AS limite, count(*) AS violacoes, max(char_length(maps_link)) AS maior FROM treino.aluno_locais_treino WHERE char_length(maps_link) > 500
  UNION ALL SELECT 'aulas.notes' AS coluna, 1000 AS limite, count(*) AS violacoes, max(char_length(notes)) AS maior FROM treino.aulas WHERE char_length(notes) > 1000
  UNION ALL SELECT 'aulas.local' AS coluna, 200 AS limite, count(*) AS violacoes, max(char_length(local)) AS maior FROM treino.aulas WHERE char_length(local) > 200
  UNION ALL SELECT 'horarios_fixos.local' AS coluna, 200 AS limite, count(*) AS violacoes, max(char_length(local)) AS maior FROM treino.horarios_fixos WHERE char_length(local) > 200
  UNION ALL SELECT 'exercicios.name' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(name)) AS maior FROM treino.exercicios WHERE char_length(name) > 120
  UNION ALL SELECT 'exercicios.equipment' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(equipment)) AS maior FROM treino.exercicios WHERE char_length(equipment) > 120
  UNION ALL SELECT 'exercicios.description' AS coluna, 2000 AS limite, count(*) AS violacoes, max(char_length(description)) AS maior FROM treino.exercicios WHERE char_length(description) > 2000
  UNION ALL SELECT 'exercicios_natacao_custom.nome' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(nome)) AS maior FROM treino.exercicios_natacao_custom WHERE char_length(nome) > 120
  UNION ALL SELECT 'exercicios_natacao_custom.descricao' AS coluna, 1000 AS limite, count(*) AS violacoes, max(char_length(descricao)) AS maior FROM treino.exercicios_natacao_custom WHERE char_length(descricao) > 1000
  UNION ALL SELECT 'modelos.name' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(name)) AS maior FROM treino.modelos WHERE char_length(name) > 120
  UNION ALL SELECT 'modelos.notes' AS coluna, 2000 AS limite, count(*) AS violacoes, max(char_length(notes)) AS maior FROM treino.modelos WHERE char_length(notes) > 2000
  UNION ALL SELECT 'planos.name' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(name)) AS maior FROM treino.planos WHERE char_length(name) > 120
  UNION ALL SELECT 'planos.notes' AS coluna, 2000 AS limite, count(*) AS violacoes, max(char_length(notes)) AS maior FROM treino.planos WHERE char_length(notes) > 2000
  UNION ALL SELECT 'plano_exercicios.notes' AS coluna, 500 AS limite, count(*) AS violacoes, max(char_length(notes)) AS maior FROM treino.plano_exercicios WHERE char_length(notes) > 500
  UNION ALL SELECT 'plano_exercicios.reps' AS coluna, 40 AS limite, count(*) AS violacoes, max(char_length(reps)) AS maior FROM treino.plano_exercicios WHERE char_length(reps) > 40
  UNION ALL SELECT 'modelo_exercicios.notes' AS coluna, 500 AS limite, count(*) AS violacoes, max(char_length(notes)) AS maior FROM treino.modelo_exercicios WHERE char_length(notes) > 500
  UNION ALL SELECT 'modelo_exercicios.reps' AS coluna, 40 AS limite, count(*) AS violacoes, max(char_length(reps)) AS maior FROM treino.modelo_exercicios WHERE char_length(reps) > 40
  UNION ALL SELECT 'sessao_exercicios.notes' AS coluna, 500 AS limite, count(*) AS violacoes, max(char_length(notes)) AS maior FROM treino.sessao_exercicios WHERE char_length(notes) > 500
  UNION ALL SELECT 'sessoes.prof_notes' AS coluna, 2000 AS limite, count(*) AS violacoes, max(char_length(prof_notes)) AS maior FROM treino.sessoes WHERE char_length(prof_notes) > 2000
  UNION ALL SELECT 'sessoes.plano_nome' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(plano_nome)) AS maior FROM treino.sessoes WHERE char_length(plano_nome) > 120
  UNION ALL SELECT 'execucoes_assincrono.notas_aluno' AS coluna, 1000 AS limite, count(*) AS violacoes, max(char_length(notas_aluno)) AS maior FROM treino.execucoes_assincrono WHERE char_length(notas_aluno) > 1000
  UNION ALL SELECT 'execucoes_assincrono.plano_nome' AS coluna, 120 AS limite, count(*) AS violacoes, max(char_length(plano_nome)) AS maior FROM treino.execucoes_assincrono WHERE char_length(plano_nome) > 120
  UNION ALL SELECT 'faturas.ajuste_descricao' AS coluna, 200 AS limite, count(*) AS violacoes, max(char_length(ajuste_descricao)) AS maior FROM treino.faturas WHERE char_length(ajuste_descricao) > 200
  UNION ALL SELECT 'professional_config.pix_chave' AS coluna, 140 AS limite, count(*) AS violacoes, max(char_length(pix_chave)) AS maior FROM treino.professional_config WHERE char_length(pix_chave) > 140
  UNION ALL SELECT 'professional_config.pix_nome' AS coluna, 60 AS limite, count(*) AS violacoes, max(char_length(pix_nome)) AS maior FROM treino.professional_config WHERE char_length(pix_nome) > 60
  UNION ALL SELECT 'modelos.modalidade_detalhes', 65536, count(*), max(octet_length(modalidade_detalhes::text)) FROM treino.modelos WHERE octet_length(modalidade_detalhes::text) > 65536
  UNION ALL SELECT 'planos.modalidade_detalhes', 65536, count(*), max(octet_length(modalidade_detalhes::text)) FROM treino.planos WHERE octet_length(modalidade_detalhes::text) > 65536
  UNION ALL SELECT 'execucoes_assincrono.detalhes_execucao', 65536, count(*), max(octet_length(detalhes_execucao::text)) FROM treino.execucoes_assincrono WHERE octet_length(detalhes_execucao::text) > 65536
) v WHERE violacoes > 0
ORDER BY coluna;
