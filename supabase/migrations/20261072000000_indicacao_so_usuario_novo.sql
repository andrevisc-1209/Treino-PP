-- ============================================================
-- Migration: 20261072000000_indicacao_so_usuario_novo.sql
--
-- Correção do programa de indicação (migration 20261069): um personal que JÁ tinha conta e já tinha alunos conseguiu registrar um código
-- e, ao cadastrar mais um aluno, a regra "3 alunos" já estava cumprida e o mês grátis saiu. A indicação vale só para USUÁRIO NOVO:
--   1. registrar_indicacao: além de "conta criada há até 7 dias", a conta NÃO pode ter nenhum aluno (nem arquivado nem na lixeira)
--      no momento do registro; senão devolve 'nao_novo';
--   2. tg_conceder_indicacao: só contam os alunos criados DEPOIS do registro da indicação (created_at >= indicação). Alunos de antes
--      não somam, mesmo que alguém consiga registrar com a conta já usada.
-- O resto (teto, avisos no sino, bônus) fica como está. Para desfazer uma concessão indevida já feita: aba Indicações do /admin → Revogar.
-- Rollback: restaurar as funções das migrations 20261069 (registrar_indicacao) e 20261070 (tg_conceder_indicacao).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.registrar_indicacao(p_codigo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_cod TEXT := upper(btrim(coalesce(p_codigo, '')));
  v_indicador UUID;
  v_criado TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = 'P0001'; END IF;
  IF v_cod !~ '^[A-HJ-NP-Z2-9]{8}$' THEN RETURN 'invalido'; END IF;
  SELECT id INTO v_indicador FROM treino.professionals WHERE codigo_indicacao = v_cod;
  IF v_indicador IS NULL THEN RETURN 'invalido'; END IF;
  IF v_indicador = v_uid THEN RETURN 'proprio'; END IF;
  IF EXISTS (SELECT 1 FROM treino.indicacoes WHERE indicado_id = v_uid) THEN RETURN 'ja_registrado'; END IF;
  SELECT created_at INTO v_criado FROM treino.professionals WHERE id = v_uid;
  IF v_criado IS NULL OR v_criado < now() - INTERVAL '7 days' THEN RETURN 'expirado'; END IF; -- só vale para conta nova
  IF EXISTS (SELECT 1 FROM treino.alunos WHERE professional_id = v_uid) THEN RETURN 'nao_novo'; END IF; -- quem já usa o app não é usuário novo
  INSERT INTO treino.indicacoes (indicador_id, indicado_id) VALUES (v_indicador, v_uid);
  RETURN 'registrado';
END;
$$;
REVOKE ALL ON FUNCTION treino.registrar_indicacao(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.registrar_indicacao(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION treino.tg_conceder_indicacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ind treino.indicacoes%ROWTYPE;
  v_ganhos INT;
  v_ganha BOOLEAN;
BEGIN
  SELECT * INTO v_ind FROM treino.indicacoes WHERE indicado_id = NEW.professional_id AND status = 'pendente' FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  -- só contam alunos criados depois do registro da indicação, com nomes diferentes e fora da lixeira
  IF (SELECT count(DISTINCT lower(btrim(name))) FROM treino.alunos
      WHERE professional_id = NEW.professional_id AND apagado_em IS NULL AND created_at >= v_ind.created_at) < 3 THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_ganhos FROM treino.indicacoes WHERE indicador_id = v_ind.indicador_id AND indicador_ganhou;
  v_ganha := v_ganhos < treino.indicacao_teto();
  UPDATE treino.indicacoes SET status = 'concedida', concedida_em = now(), indicador_ganhou = v_ganha WHERE id = v_ind.id;
  PERFORM treino.estender_bonus(v_ind.indicado_id, 30);
  IF v_ganha THEN PERFORM treino.estender_bonus(v_ind.indicador_id, 30); END IF;

  INSERT INTO treino.notificacoes_professor (professional_id, aluno_id, tipo, payload) VALUES
    (v_ind.indicado_id, NULL, 'indicacao_concedida', jsonb_build_object('indicacao_id', v_ind.id, 'papel', 'indicado', 'ganhou', TRUE)),
    (v_ind.indicador_id, NULL, 'indicacao_concedida', jsonb_build_object('indicacao_id', v_ind.id, 'papel', 'indicador', 'ganhou', v_ganha))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION treino.tg_conceder_indicacao() FROM PUBLIC, anon, authenticated;

COMMIT;
