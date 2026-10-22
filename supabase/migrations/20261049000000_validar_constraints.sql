-- ============================================================
-- Migration: 20261049000000_validar_constraints.sql
--
-- Torna TOTAIS as constraints que entraram como NOT VALID (valiam só para gravações novas):
--   * 42 limites de tamanho (20261045000000_limites_de_tamanho.sql);
--   * professionals_cpf_valido_chk (20261048000000_cpf_validacao_e_rpc.sql).
-- VALIDATE CONSTRAINT varre a tabela, mas NÃO bloqueia leitura nem escrita durante a validação (lock SHARE UPDATE EXCLUSIVE).
-- Se existir alguma linha fora do limite, o comando falha com o nome da constraint e a transação inteira desfaz (nada fica pela metade):
-- nesse caso rode supabase/tests/limites_violadores.sql (e, para o CPF, SELECT id FROM treino.professionals WHERE cpf IS NOT NULL AND NOT treino.cpf_valido(cpf))
-- e corrija ou aumente o limite daquela coluna antes de repetir.
-- ============================================================

BEGIN;

ALTER TABLE treino.alunos VALIDATE CONSTRAINT alunos_name_tamanho_chk;
ALTER TABLE treino.alunos VALIDATE CONSTRAINT alunos_email_tamanho_chk;
ALTER TABLE treino.alunos VALIDATE CONSTRAINT alunos_phone_tamanho_chk;
ALTER TABLE treino.alunos VALIDATE CONSTRAINT alunos_sport_name_tamanho_chk;
ALTER TABLE treino.alunos VALIDATE CONSTRAINT alunos_objetivo_notes_tamanho_chk;
ALTER TABLE treino.alunos VALIDATE CONSTRAINT alunos_injury_notes_tamanho_chk;
ALTER TABLE treino.alunos VALIDATE CONSTRAINT alunos_surgery_notes_tamanho_chk;
ALTER TABLE treino.alunos VALIDATE CONSTRAINT alunos_medications_tamanho_chk;
ALTER TABLE treino.professionals VALIDATE CONSTRAINT professionals_name_tamanho_chk;
ALTER TABLE treino.professionals VALIDATE CONSTRAINT professionals_email_tamanho_chk;
ALTER TABLE treino.professionals VALIDATE CONSTRAINT professionals_phone_tamanho_chk;
ALTER TABLE treino.professionals VALIDATE CONSTRAINT professionals_cref_tamanho_chk;
ALTER TABLE treino.aluno_locais_treino VALIDATE CONSTRAINT aluno_locais_treino_nome_tamanho_chk;
ALTER TABLE treino.aluno_locais_treino VALIDATE CONSTRAINT aluno_locais_treino_endereco_tamanho_chk;
ALTER TABLE treino.aluno_locais_treino VALIDATE CONSTRAINT aluno_locais_treino_maps_link_tamanho_chk;
ALTER TABLE treino.aulas VALIDATE CONSTRAINT aulas_notes_tamanho_chk;
ALTER TABLE treino.aulas VALIDATE CONSTRAINT aulas_local_tamanho_chk;
ALTER TABLE treino.horarios_fixos VALIDATE CONSTRAINT horarios_fixos_local_tamanho_chk;
ALTER TABLE treino.exercicios VALIDATE CONSTRAINT exercicios_name_tamanho_chk;
ALTER TABLE treino.exercicios VALIDATE CONSTRAINT exercicios_equipment_tamanho_chk;
ALTER TABLE treino.exercicios VALIDATE CONSTRAINT exercicios_description_tamanho_chk;
ALTER TABLE treino.exercicios_natacao_custom VALIDATE CONSTRAINT exercicios_natacao_custom_nome_tamanho_chk;
ALTER TABLE treino.exercicios_natacao_custom VALIDATE CONSTRAINT exercicios_natacao_custom_descricao_tamanho_chk;
ALTER TABLE treino.modelos VALIDATE CONSTRAINT modelos_name_tamanho_chk;
ALTER TABLE treino.modelos VALIDATE CONSTRAINT modelos_notes_tamanho_chk;
ALTER TABLE treino.planos VALIDATE CONSTRAINT planos_name_tamanho_chk;
ALTER TABLE treino.planos VALIDATE CONSTRAINT planos_notes_tamanho_chk;
ALTER TABLE treino.plano_exercicios VALIDATE CONSTRAINT plano_exercicios_notes_tamanho_chk;
ALTER TABLE treino.plano_exercicios VALIDATE CONSTRAINT plano_exercicios_reps_tamanho_chk;
ALTER TABLE treino.modelo_exercicios VALIDATE CONSTRAINT modelo_exercicios_notes_tamanho_chk;
ALTER TABLE treino.modelo_exercicios VALIDATE CONSTRAINT modelo_exercicios_reps_tamanho_chk;
ALTER TABLE treino.sessao_exercicios VALIDATE CONSTRAINT sessao_exercicios_notes_tamanho_chk;
ALTER TABLE treino.sessoes VALIDATE CONSTRAINT sessoes_prof_notes_tamanho_chk;
ALTER TABLE treino.sessoes VALIDATE CONSTRAINT sessoes_plano_nome_tamanho_chk;
ALTER TABLE treino.execucoes_assincrono VALIDATE CONSTRAINT execucoes_assincrono_notas_aluno_tamanho_chk;
ALTER TABLE treino.execucoes_assincrono VALIDATE CONSTRAINT execucoes_assincrono_plano_nome_tamanho_chk;
ALTER TABLE treino.faturas VALIDATE CONSTRAINT faturas_ajuste_descricao_tamanho_chk;
ALTER TABLE treino.professional_config VALIDATE CONSTRAINT professional_config_pix_chave_tamanho_chk;
ALTER TABLE treino.professional_config VALIDATE CONSTRAINT professional_config_pix_nome_tamanho_chk;
ALTER TABLE treino.modelos VALIDATE CONSTRAINT modelos_modalidade_detalhes_tamanho_chk;
ALTER TABLE treino.planos VALIDATE CONSTRAINT planos_modalidade_detalhes_tamanho_chk;
ALTER TABLE treino.execucoes_assincrono VALIDATE CONSTRAINT execucoes_assincrono_detalhes_execucao_tamanho_chk;
ALTER TABLE treino.professionals VALIDATE CONSTRAINT professionals_cpf_valido_chk;

COMMIT;
