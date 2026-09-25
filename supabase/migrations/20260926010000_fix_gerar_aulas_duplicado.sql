-- ============================================================
-- Migration: 20260926010000_fix_gerar_aulas_duplicado.sql
--
-- Bug: gerar_aulas() evita duplicar aulas usando
-- ON CONFLICT (horario_id, original_starts_at). Mas original_starts_at
-- é recalculado a partir do start_time ATUAL do horário fixo a cada
-- chamada. Ao editar um horário (regerar_horario), a aula que foi
-- remarcada manualmente é preservada (correto), mas o recálculo gera
-- um novo original_starts_at (agora com o horário novo) que não bate
-- mais com o da aula remarcada — o índice único não barra, e uma
-- segunda aula é criada na mesma data.
--
-- Correção: a idempotência passa a ser por dia-calendário (em SP) da
-- ocorrência, não pelo timestamp exato. Editar o horário não afeta a
-- identidade de uma ocorrência já gerada (remarcada ou não).
-- ============================================================

BEGIN;

ALTER TABLE treino.aulas
  ADD COLUMN occurrence_date DATE
  GENERATED ALWAYS AS ((original_starts_at AT TIME ZONE 'America/Sao_Paulo')::date) STORED;

-- ------------------------------------------------------------
-- Limpeza: quem já bateu no bug pode ter duplicatas de
-- (horario_id, occurrence_date). Mantém, por grupo, a aula que foi
-- remarcada manualmente (starts_at <> original_starts_at) ou que já
-- tem algum participante com status diferente de 'previsto'; entre
-- empates, a mais antiga. Apaga as demais (cascade limpa
-- aula_participantes; sessoes.aula_id vira NULL nas apagadas).
-- ------------------------------------------------------------

WITH ranqueadas AS (
  SELECT
    au.id,
    row_number() OVER (
      PARTITION BY au.horario_id, (au.original_starts_at AT TIME ZONE 'America/Sao_Paulo')::date
      ORDER BY
        (au.starts_at <> au.original_starts_at) DESC,
        EXISTS (
          SELECT 1 FROM treino.aula_participantes p
          WHERE p.aula_id = au.id AND p.status <> 'previsto'
        ) DESC,
        au.created_at ASC
    ) AS posicao
  FROM treino.aulas au
  WHERE au.horario_id IS NOT NULL
)
DELETE FROM treino.aulas
WHERE id IN (SELECT id FROM ranqueadas WHERE posicao > 1);

DROP INDEX treino.uq_aulas_horario_orig;

CREATE UNIQUE INDEX uq_aulas_horario_occurrence
  ON treino.aulas(horario_id, occurrence_date)
  WHERE horario_id IS NOT NULL;

CREATE OR REPLACE FUNCTION treino.gerar_aulas(p_ate DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_hoje   DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_ate    DATE := COALESCE(p_ate, v_hoje + 56);   -- 8 semanas
  v_n      INTEGER := 0;
  r        RECORD;
  d        DATE;
  v_start  TIMESTAMPTZ;
  v_aula   UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;

  FOR r IN
    SELECT h.* FROM treino.horarios_fixos h
    WHERE h.professional_id = v_uid AND h.active
  LOOP
    d := GREATEST(r.valid_from, v_hoje);
    d := d + ((r.weekday - EXTRACT(DOW FROM d)::int + 7) % 7);

    WHILE d <= LEAST(v_ate, COALESCE(r.valid_until, v_ate)) LOOP
      v_start := (d + r.start_time) AT TIME ZONE 'America/Sao_Paulo';
      v_aula := NULL;

      INSERT INTO treino.aulas (professional_id, horario_id, starts_at, original_starts_at, duration_min, local)
      VALUES (v_uid, r.id, v_start, v_start, r.duration_min, r.local)
      ON CONFLICT (horario_id, occurrence_date) WHERE horario_id IS NOT NULL DO NOTHING
      RETURNING id INTO v_aula;

      IF v_aula IS NOT NULL THEN
        INSERT INTO treino.aula_participantes (aula_id, aluno_id)
        SELECT v_aula, ha.aluno_id
        FROM treino.horario_alunos ha
        JOIN treino.alunos a ON a.id = ha.aluno_id AND a.active
        WHERE ha.horario_id = r.id;
        v_n := v_n + 1;
      END IF;

      d := d + 7;
    END LOOP;
  END LOOP;

  RETURN v_n;
END;
$$;

COMMIT;
