-- ============================================================
-- Migration: 20261088000000_agenda_bloqueios.sql
--
-- Agenda, fase 1 (parte 2): bloqueios pontuais. O personal marca dias em que não atende (férias, feriado, viagem, consulta) e o app
-- não mostra nem oferece vagas nesses dias. Um bloqueio vale de data_inicio a data_fim (inclusive, data de calendário em São Paulo);
-- o motivo é opcional e só o personal vê. Não mexe nas aulas já marcadas.
-- Segue o padrão das tabelas: RLS com (SELECT auth.uid()), USING e WITH CHECK, GRANT só para authenticated e, sem assinatura ativa,
-- nada é gravado (ler continua liberado).
-- Reversão: DROP TABLE treino.agenda_bloqueios;
-- ============================================================

BEGIN;

CREATE TABLE treino.agenda_bloqueios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id  UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  data_inicio      DATE NOT NULL,
  data_fim         DATE NOT NULL,
  motivo           TEXT NULL CHECK (motivo IS NULL OR char_length(motivo) <= 60),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (data_fim >= data_inicio)
);

CREATE INDEX idx_agenda_bloqueios_prof ON treino.agenda_bloqueios(professional_id, data_fim);

GRANT SELECT, INSERT, UPDATE, DELETE ON treino.agenda_bloqueios TO authenticated;

ALTER TABLE treino.agenda_bloqueios ENABLE ROW LEVEL SECURITY;

CREATE POLICY agenda_bloqueios_own ON treino.agenda_bloqueios
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE POLICY assinatura_ativa_insert ON treino.agenda_bloqueios
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT treino.assinatura_ativa()));
CREATE POLICY assinatura_ativa_update ON treino.agenda_bloqueios
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true) WITH CHECK ((SELECT treino.assinatura_ativa()));

COMMIT;
