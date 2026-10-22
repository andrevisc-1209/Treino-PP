-- ============================================================
-- Migration: 20261052000000_assinatura_no_servidor.sql
--
-- Auditoria de segurança (3ª revisão, item "assinatura bloqueada só no browser"): o bloqueio do trial vencido era só do front
-- (AssinaturaGuard, com o relógio do aparelho): quem usasse a API direto, bloqueasse a requisição de `assinaturas` ou mudasse a data
-- do aparelho usava tudo de graça para sempre. Prova: a conta E2E está com o trial vencido desde 15/10/2026 e continuou gravando.
--
-- Agora o servidor impõe: depois do trial/assinatura o personal fica em MODO LEITURA — vê tudo e não grava mais nada
-- (alunos, treinos, agenda, financeiro, configurações).
--   1. treino.assinatura_ativa(): relógio do SERVIDOR, mesma regra do front (trial com trial_fim futuro, ou assinatura 'ativa' sem
--      fim ou com fim futuro; 'cancelada'/'expirada' = inativa).
--   2. Policies RESTRITIVAS (combinadas por "E" com as existentes, que NÃO são alteradas) de INSERT e UPDATE nas tabelas de dados do
--      personal. DELETE não é afetado (apagar dado continua possível: direito de eliminação).
--   3. Continuam livres: pagar o plano (Edge Function), perfil (name/telefone/etc. em professionals), marcar notificações como
--      lidas, REVOGAR consentimento (direito do titular) e apagar dados. O aluno que registra treino pelo link segue gravando
--      (service_role, não depende do plano do personal).
--   4. RPC revogar_consentimento: revoga e limpa os campos clínicos de forma atômica e SEM depender da assinatura (a revogação faz
--      UPDATE em alunos, que o modo leitura bloquearia).
-- Para conferir cobertura depois de migrations futuras: supabase/tests/assinatura_cobertura.sql.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.assinatura_ativa()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM treino.assinaturas a
    WHERE a.professional_id = (SELECT auth.uid())
      AND (
        (a.status = 'trial' AND a.trial_fim > now())
        OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now()))
      )
  );
$$;
REVOKE ALL ON FUNCTION treino.assinatura_ativa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.assinatura_ativa() TO authenticated;

DO $$
DECLARE
  -- INSERT e UPDATE bloqueados sem assinatura ativa
  v_insert_update TEXT[] := ARRAY[
    'alunos', 'aluno_cobranca', 'aluno_locais_treino',
    'aulas', 'aula_participantes', 'horarios_fixos', 'horario_alunos',
    'planos', 'plano_exercicios', 'modelos', 'modelo_exercicios', 'exercicios', 'exercicios_natacao_custom',
    'sessoes', 'sessao_exercicios', 'sessao_series',
    'faturas', 'pesos', 'professional_config'
  ];
  -- só INSERT (o UPDATE segue livre: revogar consentimento; execuções presenciais só têm INSERT)
  v_insert TEXT[] := ARRAY['execucoes_assincrono', 'consentimentos'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY v_insert_update || v_insert LOOP
    EXECUTE format('DROP POLICY IF EXISTS assinatura_ativa_insert ON treino.%I', t);
    EXECUTE format(
      'CREATE POLICY assinatura_ativa_insert ON treino.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT treino.assinatura_ativa()))',
      t
    );
  END LOOP;
  FOREACH t IN ARRAY v_insert_update LOOP
    EXECUTE format('DROP POLICY IF EXISTS assinatura_ativa_update ON treino.%I', t);
    EXECUTE format(
      'CREATE POLICY assinatura_ativa_update ON treino.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (true) WITH CHECK ((SELECT treino.assinatura_ativa()))',
      t
    );
  END LOOP;
END $$;

-- Revogação do consentimento do aluno: atômica, só do próprio personal, independente da assinatura (direito do titular).
CREATE OR REPLACE FUNCTION treino.revogar_consentimento(p_consentimento_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_aluno UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;

  SELECT c.aluno_id INTO v_aluno
  FROM treino.consentimentos c
  WHERE c.id = p_consentimento_id AND c.professional_id = v_uid AND c.revoked_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consentimento não encontrado.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE treino.consentimentos SET revoked_at = now() WHERE id = p_consentimento_id;

  -- limpa TODOS os campos clínicos e volta o status ao zero (para poder pedir de novo); o peso já registrado é mantido
  UPDATE treino.alunos SET
    injury = FALSE, injury_regions = '{}', injury_notes = NULL,
    surgery = FALSE, surgery_regions = '{}', surgery_notes = NULL,
    medications = NULL, height_cm = NULL,
    saude_consentimento_status = NULL, saude_consentimento_enviado_at = NULL, saude_consentimento_confirmado_at = NULL
  WHERE id = v_aluno AND professional_id = v_uid;
END;
$$;
REVOKE ALL ON FUNCTION treino.revogar_consentimento(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.revogar_consentimento(UUID) TO authenticated;

COMMIT;
