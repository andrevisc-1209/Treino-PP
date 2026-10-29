-- ============================================================
-- Migration: 20261092000000_agenda_aprovacao_atomica.sql
--
-- Agenda, fase 2 (parte 2):
--   treino.aprovar_pedido_agenda()           : aprova um pedido NUMA transação só (confere conflito, cria o aluno se preciso, cria a aula e o
--                                              participante, guarda o telefone e fecha os outros pedidos do mesmo horário). Antes o app fazia
--                                              isso em etapas e duas aprovações ao mesmo tempo podiam duplicar o horário. SECURITY INVOKER: a RLS vale.
--   treino.pedidos_agenda.aula_id            : a aula criada pelo pedido (permite contar "aulas realizadas pelo link");
--   treino.professional_config.apresentacao  : texto curto (até 160 caracteres) que o personal escolhe mostrar na página pública.
-- Reversão: DROP FUNCTION treino.aprovar_pedido_agenda(UUID, UUID, TEXT, BOOLEAN);
--           ALTER TABLE treino.pedidos_agenda DROP COLUMN aula_id;
--           ALTER TABLE treino.professional_config DROP COLUMN apresentacao;
-- ============================================================

BEGIN;

ALTER TABLE treino.pedidos_agenda
  ADD COLUMN aula_id UUID NULL REFERENCES treino.aulas(id) ON DELETE SET NULL;

CREATE INDEX idx_pedidos_agenda_aula ON treino.pedidos_agenda(aula_id) WHERE aula_id IS NOT NULL;

ALTER TABLE treino.professional_config
  ADD COLUMN apresentacao TEXT NULL CHECK (apresentacao IS NULL OR char_length(apresentacao) <= 160);

-- Telefone no formato do cadastro de alunos: "(21) 99999-0000" a partir de 55 + DDD + número.
CREATE OR REPLACE FUNCTION treino.aprovar_pedido_agenda(
  p_pedido_id UUID,
  p_aluno_id UUID DEFAULT NULL,
  p_local TEXT DEFAULT NULL,
  p_guardar_telefone BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_pedido treino.pedidos_agenda%ROWTYPE;
  v_fim TIMESTAMPTZ;
  v_nacional TEXT;
  v_telefone TEXT;
  v_aluno UUID := p_aluno_id;
  v_novo BOOLEAN := p_aluno_id IS NULL;
  v_aula UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '42501';
  END IF;

  -- uma aprovação por vez para este personal: a segunda espera a primeira terminar e já enxerga a aula criada
  PERFORM pg_advisory_xact_lock(hashtextextended('aprovar_pedido_agenda:' || v_uid::TEXT, 0));

  SELECT * INTO v_pedido FROM treino.pedidos_agenda WHERE id = p_pedido_id AND professional_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_pedido.status <> 'pendente' THEN
    RAISE EXCEPTION 'Esse pedido já foi respondido.' USING ERRCODE = 'P0001';
  END IF;

  v_fim := v_pedido.inicio + make_interval(mins => v_pedido.duracao_min);
  IF EXISTS (
    SELECT 1 FROM treino.aulas a
    WHERE a.professional_id = v_uid AND a.status <> 'cancelada'
      AND a.starts_at < v_fim AND a.starts_at + make_interval(mins => a.duration_min) > v_pedido.inicio
  ) THEN
    RAISE EXCEPTION 'Esse horário já foi ocupado por outra aula. Recuse o pedido ou combine outro horário.' USING ERRCODE = 'P0001';
  END IF;

  v_nacional := CASE WHEN length(v_pedido.visitante_telefone) IN (12, 13) AND v_pedido.visitante_telefone LIKE '55%' THEN substr(v_pedido.visitante_telefone, 3) ELSE v_pedido.visitante_telefone END;
  v_telefone := CASE
    WHEN length(v_nacional) = 11 THEN format('(%s) %s-%s', substr(v_nacional, 1, 2), substr(v_nacional, 3, 5), substr(v_nacional, 8))
    WHEN length(v_nacional) = 10 THEN format('(%s) %s-%s', substr(v_nacional, 1, 2), substr(v_nacional, 3, 4), substr(v_nacional, 7))
    ELSE v_nacional
  END;

  IF v_aluno IS NULL THEN
    INSERT INTO treino.alunos (professional_id, name, phone) VALUES (v_uid, v_pedido.visitante_nome, v_telefone) RETURNING id INTO v_aluno;
  ELSIF NOT EXISTS (SELECT 1 FROM treino.alunos WHERE id = v_aluno AND professional_id = v_uid) THEN
    RAISE EXCEPTION 'Aluno não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO treino.aulas (professional_id, horario_id, starts_at, original_starts_at, duration_min, local)
  VALUES (v_uid, NULL, v_pedido.inicio, NULL, v_pedido.duracao_min, NULLIF(trim(p_local), ''))
  RETURNING id INTO v_aula;
  INSERT INTO treino.aula_participantes (aula_id, aluno_id) VALUES (v_aula, v_aluno);

  -- aluno existente sem telefone: guarda o do pedido (nunca troca um telefone que já existe)
  IF NOT v_novo AND COALESCE(p_guardar_telefone, FALSE) THEN
    UPDATE treino.alunos SET phone = v_telefone WHERE id = v_aluno AND phone IS NULL;
  END IF;

  UPDATE treino.pedidos_agenda SET status = 'aprovado', aluno_id = v_aluno, aula_id = v_aula, respondido_em = now() WHERE id = v_pedido.id;
  UPDATE treino.pedidos_agenda SET status = 'indisponivel', respondido_em = now()
  WHERE professional_id = v_uid AND status = 'pendente' AND id <> v_pedido.id
    AND inicio < v_fim AND inicio + make_interval(mins => duracao_min) > v_pedido.inicio;

  RETURN jsonb_build_object('aluno_id', v_aluno, 'aula_id', v_aula, 'novo_aluno', v_novo);
END;
$$;

REVOKE ALL ON FUNCTION treino.aprovar_pedido_agenda(UUID, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.aprovar_pedido_agenda(UUID, UUID, TEXT, BOOLEAN) TO authenticated;

COMMIT;
