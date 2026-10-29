-- ============================================================
-- Migration: 20261087000000_agenda_disponibilidade.sql
--
-- Agenda, fase 1: o personal informa quando está disponível para dar aula (janelas por dia da semana) e os parâmetros que viram "vaga":
--   treino.disponibilidade_semanal : janelas "das 07:00 às 09:00" por dia da semana (0 = domingo … 6 = sábado, como em horarios_fixos);
--   professional_config            : intervalo entre aulas, antecedência mínima para reservar (padrão 3 h), quantas semanas à frente as vagas
--                                    aparecem (padrão 4) e quando a agenda foi ajustada pela primeira vez (passo do onboarding).
-- A duração da aula continua em professional_config.duracao_padrao_min. Vaga = janela menos aulas marcadas (calculada no app).
-- salvar_disponibilidade(): troca TODAS as janelas e os parâmetros numa transação só (SECURITY INVOKER: a RLS vale), recusa janelas
-- sobrepostas no mesmo dia e, sem assinatura ativa, nada é gravado (a política restritiva reprova o INSERT e a transação volta inteira).
-- Segue o padrão das tabelas: RLS com (SELECT auth.uid()), USING e WITH CHECK, GRANT só para authenticated.
-- Reversão: DROP FUNCTION treino.salvar_disponibilidade(JSONB, INT, INT, INT, INT); DROP TABLE treino.disponibilidade_semanal;
--           ALTER TABLE treino.professional_config DROP COLUMN intervalo_min, DROP COLUMN antecedencia_horas, DROP COLUMN horizonte_semanas, DROP COLUMN agenda_ajustada_em;
-- ============================================================

BEGIN;

CREATE TABLE treino.disponibilidade_semanal (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id  UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  weekday          SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_disponibilidade_prof ON treino.disponibilidade_semanal(professional_id, weekday, start_time);

GRANT SELECT, INSERT, UPDATE, DELETE ON treino.disponibilidade_semanal TO authenticated;

ALTER TABLE treino.disponibilidade_semanal ENABLE ROW LEVEL SECURITY;

CREATE POLICY disponibilidade_own ON treino.disponibilidade_semanal
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

-- sem assinatura ativa não grava (mesmo padrão das demais tabelas; ler continua liberado)
CREATE POLICY assinatura_ativa_insert ON treino.disponibilidade_semanal
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT treino.assinatura_ativa()));
CREATE POLICY assinatura_ativa_update ON treino.disponibilidade_semanal
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true) WITH CHECK ((SELECT treino.assinatura_ativa()));

ALTER TABLE treino.professional_config
  ADD COLUMN intervalo_min        INTEGER NOT NULL DEFAULT 0 CHECK (intervalo_min BETWEEN 0 AND 120),
  ADD COLUMN antecedencia_horas   INTEGER NOT NULL DEFAULT 3 CHECK (antecedencia_horas BETWEEN 0 AND 168),
  ADD COLUMN horizonte_semanas    INTEGER NOT NULL DEFAULT 4 CHECK (horizonte_semanas BETWEEN 1 AND 12),
  ADD COLUMN agenda_ajustada_em   TIMESTAMPTZ NULL;

CREATE OR REPLACE FUNCTION treino.salvar_disponibilidade(
  p_janelas JSONB, p_duracao_min INT, p_intervalo_min INT, p_antecedencia_horas INT, p_horizonte_semanas INT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '42501';
  END IF;
  IF p_janelas IS NULL OR jsonb_typeof(p_janelas) <> 'array' THEN
    RAISE EXCEPTION 'Janelas inválidas.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_janelas) > 28 THEN
    RAISE EXCEPTION 'No máximo 4 horários por dia.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM treino.disponibilidade_semanal WHERE professional_id = v_uid;

  INSERT INTO treino.disponibilidade_semanal (professional_id, weekday, start_time, end_time)
  SELECT v_uid, (j->>'weekday')::SMALLINT, (j->>'start_time')::TIME, (j->>'end_time')::TIME
  FROM jsonb_array_elements(p_janelas) AS j;

  IF EXISTS (
    SELECT 1
    FROM treino.disponibilidade_semanal a
    JOIN treino.disponibilidade_semanal b
      ON b.professional_id = a.professional_id AND b.weekday = a.weekday AND a.id < b.id
     AND a.start_time < b.end_time AND b.start_time < a.end_time
    WHERE a.professional_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Há horários que se sobrepõem no mesmo dia.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO treino.professional_config (professional_id, duracao_padrao_min, intervalo_min, antecedencia_horas, horizonte_semanas, agenda_ajustada_em)
  VALUES (v_uid, p_duracao_min, p_intervalo_min, p_antecedencia_horas, p_horizonte_semanas, now())
  ON CONFLICT (professional_id) DO UPDATE SET
    duracao_padrao_min = EXCLUDED.duracao_padrao_min,
    intervalo_min = EXCLUDED.intervalo_min,
    antecedencia_horas = EXCLUDED.antecedencia_horas,
    horizonte_semanas = EXCLUDED.horizonte_semanas,
    agenda_ajustada_em = COALESCE(treino.professional_config.agenda_ajustada_em, now());
END;
$$;

REVOKE ALL ON FUNCTION treino.salvar_disponibilidade(JSONB, INT, INT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.salvar_disponibilidade(JSONB, INT, INT, INT, INT) TO authenticated;

COMMIT;
