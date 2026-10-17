-- ============================================================
-- Migration: 20261045000000_limites_de_tamanho.sql
--
-- Auditoria de segurança (docs/SECURITY-AUDIT.md): o app grava direto pela API (PostgREST) e o Zod do front é contornável;
-- as colunas de texto livre não tinham limite de tamanho no banco. Uma conta gratuita podia gravar textos/JSON enormes
-- (custo de armazenamento, telas e PDFs quebrados). Aqui entram limites de tamanho (em caracteres; JSONB em 64 KB).
--
-- As constraints são NOT VALID: valem para INSERT e UPDATE novos, sem varrer o que já existe (a migration não falha por
-- dado antigo). Uma linha antiga acima do limite só impede a PRÓXIMA edição dela, até o texto ser encurtado.
-- Antes: rode supabase/tests/limites_violadores.sql para ver se algum dado atual passa dos limites.
-- Depois de limpar (quando a consulta vier vazia), pode-se rodar ALTER TABLE ... VALIDATE CONSTRAINT em cada uma.
-- NULL sempre passa (char_length(NULL) é NULL). Não mexe em RLS nem em GRANT.
-- ============================================================

BEGIN;

ALTER TABLE treino.alunos ADD CONSTRAINT alunos_name_tamanho_chk CHECK (char_length(name) <= 120) NOT VALID;
ALTER TABLE treino.alunos ADD CONSTRAINT alunos_email_tamanho_chk CHECK (char_length(email) <= 254) NOT VALID;
ALTER TABLE treino.alunos ADD CONSTRAINT alunos_phone_tamanho_chk CHECK (char_length(phone) <= 30) NOT VALID;
ALTER TABLE treino.alunos ADD CONSTRAINT alunos_sport_name_tamanho_chk CHECK (char_length(sport_name) <= 120) NOT VALID;
ALTER TABLE treino.alunos ADD CONSTRAINT alunos_objetivo_notes_tamanho_chk CHECK (char_length(objetivo_notes) <= 2000) NOT VALID;
ALTER TABLE treino.alunos ADD CONSTRAINT alunos_injury_notes_tamanho_chk CHECK (char_length(injury_notes) <= 2000) NOT VALID;
ALTER TABLE treino.alunos ADD CONSTRAINT alunos_surgery_notes_tamanho_chk CHECK (char_length(surgery_notes) <= 2000) NOT VALID;
ALTER TABLE treino.alunos ADD CONSTRAINT alunos_medications_tamanho_chk CHECK (char_length(medications) <= 2000) NOT VALID;
ALTER TABLE treino.professionals ADD CONSTRAINT professionals_name_tamanho_chk CHECK (char_length(name) <= 120) NOT VALID;
ALTER TABLE treino.professionals ADD CONSTRAINT professionals_email_tamanho_chk CHECK (char_length(email) <= 254) NOT VALID;
ALTER TABLE treino.professionals ADD CONSTRAINT professionals_phone_tamanho_chk CHECK (char_length(phone) <= 30) NOT VALID;
ALTER TABLE treino.professionals ADD CONSTRAINT professionals_cref_tamanho_chk CHECK (char_length(cref) <= 30) NOT VALID;
ALTER TABLE treino.aluno_locais_treino ADD CONSTRAINT aluno_locais_treino_nome_tamanho_chk CHECK (char_length(nome) <= 120) NOT VALID;
ALTER TABLE treino.aluno_locais_treino ADD CONSTRAINT aluno_locais_treino_endereco_tamanho_chk CHECK (char_length(endereco) <= 300) NOT VALID;
ALTER TABLE treino.aluno_locais_treino ADD CONSTRAINT aluno_locais_treino_maps_link_tamanho_chk CHECK (char_length(maps_link) <= 500) NOT VALID;
ALTER TABLE treino.aulas ADD CONSTRAINT aulas_notes_tamanho_chk CHECK (char_length(notes) <= 1000) NOT VALID;
ALTER TABLE treino.aulas ADD CONSTRAINT aulas_local_tamanho_chk CHECK (char_length(local) <= 200) NOT VALID;
ALTER TABLE treino.horarios_fixos ADD CONSTRAINT horarios_fixos_local_tamanho_chk CHECK (char_length(local) <= 200) NOT VALID;
ALTER TABLE treino.exercicios ADD CONSTRAINT exercicios_name_tamanho_chk CHECK (char_length(name) <= 120) NOT VALID;
ALTER TABLE treino.exercicios ADD CONSTRAINT exercicios_equipment_tamanho_chk CHECK (char_length(equipment) <= 120) NOT VALID;
ALTER TABLE treino.exercicios ADD CONSTRAINT exercicios_description_tamanho_chk CHECK (char_length(description) <= 2000) NOT VALID;
ALTER TABLE treino.exercicios_natacao_custom ADD CONSTRAINT exercicios_natacao_custom_nome_tamanho_chk CHECK (char_length(nome) <= 120) NOT VALID;
ALTER TABLE treino.exercicios_natacao_custom ADD CONSTRAINT exercicios_natacao_custom_descricao_tamanho_chk CHECK (char_length(descricao) <= 1000) NOT VALID;
ALTER TABLE treino.modelos ADD CONSTRAINT modelos_name_tamanho_chk CHECK (char_length(name) <= 120) NOT VALID;
ALTER TABLE treino.modelos ADD CONSTRAINT modelos_notes_tamanho_chk CHECK (char_length(notes) <= 2000) NOT VALID;
ALTER TABLE treino.planos ADD CONSTRAINT planos_name_tamanho_chk CHECK (char_length(name) <= 120) NOT VALID;
ALTER TABLE treino.planos ADD CONSTRAINT planos_notes_tamanho_chk CHECK (char_length(notes) <= 2000) NOT VALID;
ALTER TABLE treino.plano_exercicios ADD CONSTRAINT plano_exercicios_notes_tamanho_chk CHECK (char_length(notes) <= 500) NOT VALID;
ALTER TABLE treino.plano_exercicios ADD CONSTRAINT plano_exercicios_reps_tamanho_chk CHECK (char_length(reps) <= 40) NOT VALID;
ALTER TABLE treino.modelo_exercicios ADD CONSTRAINT modelo_exercicios_notes_tamanho_chk CHECK (char_length(notes) <= 500) NOT VALID;
ALTER TABLE treino.modelo_exercicios ADD CONSTRAINT modelo_exercicios_reps_tamanho_chk CHECK (char_length(reps) <= 40) NOT VALID;
ALTER TABLE treino.sessao_exercicios ADD CONSTRAINT sessao_exercicios_notes_tamanho_chk CHECK (char_length(notes) <= 500) NOT VALID;
ALTER TABLE treino.sessoes ADD CONSTRAINT sessoes_prof_notes_tamanho_chk CHECK (char_length(prof_notes) <= 2000) NOT VALID;
ALTER TABLE treino.sessoes ADD CONSTRAINT sessoes_plano_nome_tamanho_chk CHECK (char_length(plano_nome) <= 120) NOT VALID;
ALTER TABLE treino.execucoes_assincrono ADD CONSTRAINT execucoes_assincrono_notas_aluno_tamanho_chk CHECK (char_length(notas_aluno) <= 1000) NOT VALID;
ALTER TABLE treino.execucoes_assincrono ADD CONSTRAINT execucoes_assincrono_plano_nome_tamanho_chk CHECK (char_length(plano_nome) <= 120) NOT VALID;
ALTER TABLE treino.faturas ADD CONSTRAINT faturas_ajuste_descricao_tamanho_chk CHECK (char_length(ajuste_descricao) <= 200) NOT VALID;
ALTER TABLE treino.professional_config ADD CONSTRAINT professional_config_pix_chave_tamanho_chk CHECK (char_length(pix_chave) <= 140) NOT VALID;
ALTER TABLE treino.professional_config ADD CONSTRAINT professional_config_pix_nome_tamanho_chk CHECK (char_length(pix_nome) <= 60) NOT VALID;
ALTER TABLE treino.modelos ADD CONSTRAINT modelos_modalidade_detalhes_tamanho_chk CHECK (octet_length(modalidade_detalhes::text) <= 65536) NOT VALID;
ALTER TABLE treino.planos ADD CONSTRAINT planos_modalidade_detalhes_tamanho_chk CHECK (octet_length(modalidade_detalhes::text) <= 65536) NOT VALID;
ALTER TABLE treino.execucoes_assincrono ADD CONSTRAINT execucoes_assincrono_detalhes_execucao_tamanho_chk CHECK (octet_length(detalhes_execucao::text) <= 65536) NOT VALID;

COMMIT;
