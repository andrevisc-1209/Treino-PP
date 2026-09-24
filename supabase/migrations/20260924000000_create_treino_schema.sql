-- ============================================================
-- SCHEMA: treino  (v3 — Supabase próprio, segregado do PP)
-- Módulo Assistente do Personal — PersonalPerto
-- Migration: 20260924_create_treino_schema.sql
--
-- v3: projeto Supabase PRÓPRIO. Não existe public.professionals
-- nem public.profiles aqui. A tabela treino.professionals espelha
-- o padrão do PP (professionals.id = auth.uid()), então no merge
-- futuro basta repontar as FKs para public.professionals.
--
-- Mudanças vs v1:
--  1. GRANTs no schema/tabelas (sem isso o PostgREST devolve 42501)
--  2. treino.professionals própria (id = auth.uid(), igual ao PP)
--     + criação automática no signup
--  3. Policies com TO authenticated + WITH CHECK que impede
--     referenciar aluno/plano/exercício de outro professor
--  4. Execução por SÉRIE (treino.sessao_series): carga por série,
--     reps numéricas — base do gráfico de evolução de carga
--  5. Índices em FKs que faltavam + índice para evolução por exercício
--  6. Seed idempotente (índice único + ON CONFLICT)
--  7. Consentimento com método e revogação
--  8. Tudo numa transação: ou aplica inteiro, ou não aplica nada
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS treino;

-- ============================================================
-- 0. PROFESSIONALS — espelho do padrão do PP
-- id = auth.users.id (mesmo contrato do PP: professionals.id = auth.uid())
-- Colunas mínimas; alinhar nomes com public.professionals do PP.
-- ============================================================

CREATE TABLE treino.professionals (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT '',
  email             TEXT NULL,
  phone             TEXT NULL,
  cref              TEXT NULL,
  personal_perto_id UUID NULL,          -- ponte futura (id no PP), sem FK
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cria o registro do professor automaticamente no cadastro (signup)
CREATE OR REPLACE FUNCTION treino.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO treino.professionals (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION treino.handle_new_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created_treino
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION treino.handle_new_user();

-- ============================================================
-- 1. ALUNOS — cadastro próprio do professor
-- profile_id NULL até o link futuro com conta do PP.
-- ============================================================

CREATE TABLE treino.alunos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  profile_id        UUID NULL,   -- link futuro com profiles do PP (sem FK)

  name              TEXT NOT NULL,
  birth_date        DATE NULL,
  sex               TEXT NULL CHECK (sex IN ('M', 'F', 'outro')),
  height_cm         INTEGER NULL CHECK (height_cm BETWEEN 50 AND 250),
  phone             TEXT NULL,
  email             TEXT NULL,
  active            BOOLEAN NOT NULL DEFAULT TRUE,

  -- Dados de saúde (LGPD)
  injury            BOOLEAN NOT NULL DEFAULT FALSE,
  injury_notes      TEXT NULL,
  practices_sport   BOOLEAN NOT NULL DEFAULT FALSE,
  sport_name        TEXT NULL,
  medications       TEXT NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. CONSENTIMENTOS (LGPD)
-- ============================================================

CREATE TABLE treino.consentimentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id          UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  consent_version   TEXT NOT NULL DEFAULT '1.0',
  method            TEXT NOT NULL DEFAULT 'app' CHECK (method IN ('app', 'papel', 'link')),
  consented_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at        TIMESTAMPTZ NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. HISTÓRICO DE PESO
-- ============================================================

CREATE TABLE treino.pesos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id          UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  weight_kg         NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0),
  measured_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. BIBLIOTECA DE EXERCÍCIOS
-- professional_id NULL = global; preenchido = do professor.
-- ============================================================

CREATE TABLE treino.exercicios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  muscle_group      TEXT NULL,
  equipment         TEXT NULL,
  description       TEXT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. PLANOS DE TREINO (prescrição)
-- ============================================================

CREATE TABLE treino.planos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id          UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  notes             TEXT NULL,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. EXERCÍCIOS DO PLANO (prescrição por exercício)
-- ============================================================

CREATE TABLE treino.plano_exercicios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id          UUID NOT NULL REFERENCES treino.planos(id) ON DELETE CASCADE,
  exercicio_id      UUID NOT NULL REFERENCES treino.exercicios(id),
  sets              INTEGER NOT NULL CHECK (sets > 0),
  reps              TEXT NOT NULL,              -- '10', '8-12', 'até a falha'
  target_load_kg    NUMERIC(6,2) NULL,
  rest_seconds      INTEGER NULL,
  notes             TEXT NULL,
  order_index       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. SESSÕES DE TREINO
-- ============================================================

CREATE TABLE treino.sessoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id          UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  plano_id          UUID NULL REFERENCES treino.planos(id) ON DELETE SET NULL,

  status            TEXT NOT NULL DEFAULT 'em_andamento'
                    CHECK (status IN ('em_andamento', 'concluida', 'cancelada')),
  session_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes  INTEGER NULL CHECK (duration_minutes > 0),  -- Foster: PSE × duração

  -- Pré-treino (0–10)
  pre_sleep         SMALLINT NULL CHECK (pre_sleep BETWEEN 0 AND 10),
  pre_stress        SMALLINT NULL CHECK (pre_stress BETWEEN 0 AND 10),
  pre_fatigue       SMALLINT NULL CHECK (pre_fatigue BETWEEN 0 AND 10),
  pre_muscle_pain   SMALLINT NULL CHECK (pre_muscle_pain BETWEEN 0 AND 10),

  -- Pós-treino
  post_pse          SMALLINT NULL CHECK (post_pse BETWEEN 0 AND 10),

  -- Avaliação do professor
  prof_rating       SMALLINT NULL CHECK (prof_rating BETWEEN 0 AND 10),
  prof_notes        TEXT NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. EXERCÍCIOS EXECUTADOS NA SESSÃO (bloco por exercício)
-- ============================================================

CREATE TABLE treino.sessao_exercicios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id           UUID NOT NULL REFERENCES treino.sessoes(id) ON DELETE CASCADE,
  exercicio_id        UUID NOT NULL REFERENCES treino.exercicios(id),
  plano_exercicio_id  UUID NULL REFERENCES treino.plano_exercicios(id) ON DELETE SET NULL,
  notes               TEXT NULL,
  order_index         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. SÉRIES EXECUTADAS — uma linha por série
-- Permite 12kg / 14kg / 16kg na mesma sessão e reps numéricas.
-- ============================================================

CREATE TABLE treino.sessao_series (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_exercicio_id UUID NOT NULL REFERENCES treino.sessao_exercicios(id) ON DELETE CASCADE,
  set_number          SMALLINT NOT NULL CHECK (set_number > 0),
  reps                SMALLINT NULL CHECK (reps >= 0),
  load_kg             NUMERIC(6,2) NULL CHECK (load_kg >= 0),
  duration_seconds    INTEGER NULL,           -- prancha, isometria
  completed           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sessao_exercicio_id, set_number)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_alunos_professional     ON treino.alunos(professional_id);
CREATE INDEX idx_alunos_profile          ON treino.alunos(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_consent_aluno           ON treino.consentimentos(aluno_id);
CREATE INDEX idx_pesos_aluno_date        ON treino.pesos(aluno_id, measured_at DESC);
CREATE INDEX idx_exercicios_professional ON treino.exercicios(professional_id);
CREATE UNIQUE INDEX uq_exercicios_global_name ON treino.exercicios (lower(name)) WHERE professional_id IS NULL;
CREATE UNIQUE INDEX uq_exercicios_prof_name   ON treino.exercicios (professional_id, lower(name)) WHERE professional_id IS NOT NULL;
CREATE INDEX idx_planos_aluno            ON treino.planos(aluno_id);
CREATE INDEX idx_planos_professional     ON treino.planos(professional_id);
CREATE INDEX idx_plano_ex_plano          ON treino.plano_exercicios(plano_id, order_index);
CREATE INDEX idx_sessoes_aluno_date      ON treino.sessoes(aluno_id, session_date DESC);
CREATE INDEX idx_sessoes_professional    ON treino.sessoes(professional_id, session_date DESC);
CREATE INDEX idx_sessao_ex_sessao        ON treino.sessao_exercicios(sessao_id, order_index);
CREATE INDEX idx_sessao_ex_exercicio     ON treino.sessao_exercicios(exercicio_id);   -- evolução de carga
CREATE INDEX idx_series_sessao_ex        ON treino.sessao_series(sessao_exercicio_id);

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION treino.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_prof_updated_at    BEFORE UPDATE ON treino.professionals FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();
CREATE TRIGGER trg_alunos_updated_at  BEFORE UPDATE ON treino.alunos  FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();
CREATE TRIGGER trg_planos_updated_at  BEFORE UPDATE ON treino.planos  FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();
CREATE TRIGGER trg_sessoes_updated_at BEFORE UPDATE ON treino.sessoes FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();

-- ============================================================
-- GRANTS — sem isso o PostgREST não enxerga o schema
-- anon não recebe nada: todo o módulo exige login.
-- ============================================================

GRANT USAGE ON SCHEMA treino TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA treino TO authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA treino FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA treino
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- ============================================================
-- RLS
-- (SELECT auth.uid()) entre parênteses
-- faz o Postgres calcular uma vez por query, não por linha.
-- WITH CHECK garante que não dá pra gravar apontando para
-- aluno/plano/exercício de outro professor.
-- ============================================================

ALTER TABLE treino.professionals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.alunos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.consentimentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.pesos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.exercicios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.planos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.plano_exercicios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.sessoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.sessao_exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.sessao_series     ENABLE ROW LEVEL SECURITY;

-- Professionals: cada um lê e edita só o próprio registro
-- (insert é feito pelo trigger de signup; delete via auth.users)
CREATE POLICY professionals_self_read ON treino.professionals
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY professionals_self_update ON treino.professionals
  FOR UPDATE TO authenticated
  USING      (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Alunos
CREATE POLICY alunos_own ON treino.alunos
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

-- Consentimentos (aluno precisa ser do professor)
CREATE POLICY consentimentos_own ON treino.consentimentos
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND aluno_id IN (SELECT a.id FROM treino.alunos a));

-- Pesos (via aluno; o subselect já passa pelo RLS de alunos)
CREATE POLICY pesos_own ON treino.pesos
  FOR ALL TO authenticated
  USING      (aluno_id IN (SELECT a.id FROM treino.alunos a))
  WITH CHECK (aluno_id IN (SELECT a.id FROM treino.alunos a));

-- Exercícios: globais só leitura; próprios, CRUD
CREATE POLICY exercicios_global_read ON treino.exercicios
  FOR SELECT TO authenticated
  USING (professional_id IS NULL);

CREATE POLICY exercicios_own ON treino.exercicios
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

-- Planos (aluno precisa ser do professor)
CREATE POLICY planos_own ON treino.planos
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND aluno_id IN (SELECT a.id FROM treino.alunos a));

-- Plano_exercicios (plano do professor + exercício global ou próprio)
CREATE POLICY plano_exercicios_own ON treino.plano_exercicios
  FOR ALL TO authenticated
  USING      (plano_id IN (SELECT p.id FROM treino.planos p))
  WITH CHECK (plano_id IN (SELECT p.id FROM treino.planos p)
              AND exercicio_id IN (SELECT e.id FROM treino.exercicios e));

-- Sessões (aluno e plano precisam ser do professor)
CREATE POLICY sessoes_own ON treino.sessoes
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND aluno_id IN (SELECT a.id FROM treino.alunos a)
              AND (plano_id IS NULL OR plano_id IN (SELECT p.id FROM treino.planos p)));

-- Sessao_exercicios
CREATE POLICY sessao_exercicios_own ON treino.sessao_exercicios
  FOR ALL TO authenticated
  USING      (sessao_id IN (SELECT s.id FROM treino.sessoes s))
  WITH CHECK (sessao_id IN (SELECT s.id FROM treino.sessoes s)
              AND exercicio_id IN (SELECT e.id FROM treino.exercicios e));

-- Sessao_series
CREATE POLICY sessao_series_own ON treino.sessao_series
  FOR ALL TO authenticated
  USING      (sessao_exercicio_id IN (SELECT se.id FROM treino.sessao_exercicios se))
  WITH CHECK (sessao_exercicio_id IN (SELECT se.id FROM treino.sessao_exercicios se));

-- ============================================================
-- SEED: biblioteca global (idempotente)
-- ============================================================

INSERT INTO treino.exercicios (professional_id, name, muscle_group, equipment) VALUES
  (NULL, 'Supino Reto',        'Peito',   'Barra'),
  (NULL, 'Supino Inclinado',   'Peito',   'Barra'),
  (NULL, 'Crucifixo',          'Peito',   'Halter'),
  (NULL, 'Peck Deck',          'Peito',   'Máquina'),
  (NULL, 'Flexão de Braço',    'Peito',   'Peso Corporal'),
  (NULL, 'Puxada Frontal',     'Costas',  'Máquina'),
  (NULL, 'Remada Curvada',     'Costas',  'Barra'),
  (NULL, 'Remada Sentado',     'Costas',  'Máquina'),
  (NULL, 'Barra Fixa',         'Costas',  'Peso Corporal'),
  (NULL, 'Agachamento Livre',  'Pernas',  'Barra'),
  (NULL, 'Leg Press',          'Pernas',  'Máquina'),
  (NULL, 'Cadeira Extensora',  'Pernas',  'Máquina'),
  (NULL, 'Mesa Flexora',       'Pernas',  'Máquina'),
  (NULL, 'Stiff',              'Pernas',  'Barra'),
  (NULL, 'Afundo',             'Pernas',  'Halter'),
  (NULL, 'Panturrilha em Pé',  'Pernas',  'Máquina'),
  (NULL, 'Desenvolvimento',    'Ombros',  'Barra'),
  (NULL, 'Elevação Lateral',   'Ombros',  'Halter'),
  (NULL, 'Elevação Frontal',   'Ombros',  'Halter'),
  (NULL, 'Rosca Direta',       'Bíceps',  'Barra'),
  (NULL, 'Rosca Alternada',    'Bíceps',  'Halter'),
  (NULL, 'Rosca Concentrada',  'Bíceps',  'Halter'),
  (NULL, 'Tríceps Pulley',     'Tríceps', 'Máquina'),
  (NULL, 'Tríceps Testa',      'Tríceps', 'Barra'),
  (NULL, 'Mergulho',           'Tríceps', 'Peso Corporal'),
  (NULL, 'Prancha',            'Core',    'Peso Corporal'),
  (NULL, 'Abdominal Crunch',   'Core',    'Peso Corporal'),
  (NULL, 'Abdominal Remador',  'Core',    'Peso Corporal')
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- PÓS-APLICAÇÃO
-- 1. Supabase > Settings > API > Exposed Schemas → adicionar "treino"
-- 2. No front: supabase.schema('treino').from('alunos')...
-- ============================================================
