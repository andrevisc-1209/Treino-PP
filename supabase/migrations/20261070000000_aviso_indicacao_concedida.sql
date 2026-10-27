-- ============================================================
-- Migration: 20261070000000_aviso_indicacao_concedida.sql
--
-- Aviso no sino (e toast em tempo real) quando o mês grátis da indicação é concedido: para o INDICADO ("você ganhou") e para o
-- INDICADOR ("sua indicação concluiu: ganhou", ou "concluiu, mas você já chegou ao limite de meses"). Antes só se descobria olhando o card
-- de Configurações.
--
-- notificacoes_professor exigia aluno_id (as outras notificações são de aluno). Esta migration:
--   1. deixa aluno_id opcional SÓ para o tipo novo 'indicacao_concedida' (CHECK: os outros tipos continuam exigindo aluno);
--   2. aceita o tipo novo; payload = { papel: 'indicador'|'indicado', ganhou: boolean } (nunca nome, e-mail ou CPF de ninguém);
--   3. um aviso por pessoa por indicação (índice único);
--   4. tg_conceder_indicacao (migration 20261069) passa a criar os avisos junto com a concessão, na mesma transação.
-- Rollback: apagar as linhas do tipo novo, voltar o CHECK de tipo, SET NOT NULL em aluno_id e restaurar tg_conceder_indicacao da 20261069.
-- ============================================================

BEGIN;

ALTER TABLE treino.notificacoes_professor ALTER COLUMN aluno_id DROP NOT NULL;

ALTER TABLE treino.notificacoes_professor DROP CONSTRAINT IF EXISTS notificacoes_professor_tipo_check;
ALTER TABLE treino.notificacoes_professor
  ADD CONSTRAINT notificacoes_professor_tipo_check CHECK (tipo IN ('treino_concluido', 'ciclo_encerrado', 'indicacao_concedida'));

ALTER TABLE treino.notificacoes_professor DROP CONSTRAINT IF EXISTS notificacoes_professor_aluno_conforme_tipo;
ALTER TABLE treino.notificacoes_professor
  ADD CONSTRAINT notificacoes_professor_aluno_conforme_tipo CHECK (tipo = 'indicacao_concedida' OR aluno_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacoes_indicacao_concedida
  ON treino.notificacoes_professor (professional_id, ((payload->>'indicacao_id')))
  WHERE tipo = 'indicacao_concedida';

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
  IF (SELECT count(DISTINCT lower(btrim(name))) FROM treino.alunos WHERE professional_id = NEW.professional_id AND apagado_em IS NULL) < 3 THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_ganhos FROM treino.indicacoes WHERE indicador_id = v_ind.indicador_id AND indicador_ganhou;
  v_ganha := v_ganhos < treino.indicacao_teto();
  UPDATE treino.indicacoes SET status = 'concedida', concedida_em = now(), indicador_ganhou = v_ganha WHERE id = v_ind.id;
  PERFORM treino.estender_bonus(v_ind.indicado_id, 30);
  IF v_ganha THEN PERFORM treino.estender_bonus(v_ind.indicador_id, 30); END IF;

  -- avisos (sem dado pessoal no payload)
  INSERT INTO treino.notificacoes_professor (professional_id, aluno_id, tipo, payload) VALUES
    (v_ind.indicado_id, NULL, 'indicacao_concedida', jsonb_build_object('indicacao_id', v_ind.id, 'papel', 'indicado', 'ganhou', TRUE)),
    (v_ind.indicador_id, NULL, 'indicacao_concedida', jsonb_build_object('indicacao_id', v_ind.id, 'papel', 'indicador', 'ganhou', v_ganha))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION treino.tg_conceder_indicacao() FROM PUBLIC, anon, authenticated;

COMMIT;
