-- ============================================================
-- Migration: 20260926000000_agenda_financeiro.sql
-- Módulo Treino-PP — Agenda (horários fixos, aulas, presença)
--                    + Financeiro (cobrança por aluno, faturas, Pix)
--
-- Conceito central: a AULA. Horários fixos geram aulas; cada aula
-- tem 1+ participantes (aula em grupo). A presença do participante
-- é o check-in; o valor fica gravado nele (snapshot). O fechamento
-- do período vira uma fatura que "trava" os participantes cobrados.
--
-- Fuso: horários de parede em America/Sao_Paulo, gravados em
-- timestamptz. Conversão feita no banco (gerar_aulas) para evitar
-- bug de fuso no front.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CONFIGURAÇÃO DO PERSONAL (Pix e padrões)
-- ============================================================

CREATE TABLE treino.professional_config (
  professional_id        UUID PRIMARY KEY REFERENCES treino.professionals(id) ON DELETE CASCADE,
  pix_chave              TEXT NULL,
  pix_tipo               TEXT NULL CHECK (pix_tipo IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  pix_nome               TEXT NULL,             -- nome do recebedor (até 25 caracteres no BR Code)
  pix_cidade             TEXT NULL,             -- cidade do recebedor (até 15 caracteres)
  cobrar_falta_padrao    BOOLEAN NOT NULL DEFAULT TRUE,   -- sugestão pré-marcada; personal decide caso a caso
  cobrar_cancel_padrao   BOOLEAN NOT NULL DEFAULT FALSE,
  duracao_padrao_min     INTEGER NOT NULL DEFAULT 60 CHECK (duracao_padrao_min > 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. COBRANÇA POR ALUNO
-- modelo 'por_aula': total = soma das presenças cobráveis do período
-- modelo 'mensal'  : total = valor_mensal fixo por ciclo de 1 mês
-- dia_ciclo: dia em que o ciclo começa (1–28). Ex.: 10 → ciclo de
-- 10/mês até 09/mês seguinte. Vale para os dois modelos.
-- ============================================================

CREATE TABLE treino.aluno_cobranca (
  aluno_id          UUID PRIMARY KEY REFERENCES treino.alunos(id) ON DELETE CASCADE,
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  modelo            TEXT NOT NULL DEFAULT 'por_aula' CHECK (modelo IN ('por_aula', 'mensal')),
  valor_aula        NUMERIC(10,2) NULL CHECK (valor_aula >= 0),
  valor_mensal      NUMERIC(10,2) NULL CHECK (valor_mensal >= 0),
  dia_ciclo         SMALLINT NOT NULL DEFAULT 1 CHECK (dia_ciclo BETWEEN 1 AND 28),
  dias_vencimento   SMALLINT NOT NULL DEFAULT 5 CHECK (dias_vencimento BETWEEN 0 AND 30), -- vence X dias após o fechamento
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (modelo = 'por_aula' AND valor_aula IS NOT NULL) OR
    (modelo = 'mensal'   AND valor_mensal IS NOT NULL)
  )
);

-- ============================================================
-- 3. HORÁRIOS FIXOS (recorrência semanal) + participantes
-- Um horário pode ter mais de um aluno (dupla/grupo fixo).
-- weekday: 0 = domingo … 6 = sábado (igual a EXTRACT(DOW))
-- ============================================================

CREATE TABLE treino.horarios_fixos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  weekday           SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time        TIME NOT NULL,
  duration_min      INTEGER NOT NULL DEFAULT 60 CHECK (duration_min > 0),
  local             TEXT NULL,
  valid_from        DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until       DATE NULL,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

CREATE TABLE treino.horario_alunos (
  horario_id        UUID NOT NULL REFERENCES treino.horarios_fixos(id) ON DELETE CASCADE,
  aluno_id          UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (horario_id, aluno_id)
);

-- ============================================================
-- 4. AULAS (ocorrências reais na agenda)
-- original_starts_at: data/hora que o horário fixo gerou. Remarcar
-- muda starts_at mas mantém original_starts_at → o gerador não
-- recria a aula. Aula avulsa: horario_id NULL.
-- ============================================================

CREATE TABLE treino.aulas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id     UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  horario_id          UUID NULL REFERENCES treino.horarios_fixos(id) ON DELETE SET NULL,
  starts_at           TIMESTAMPTZ NOT NULL,
  original_starts_at  TIMESTAMPTZ NULL,
  duration_min        INTEGER NOT NULL DEFAULT 60 CHECK (duration_min > 0),
  local               TEXT NULL,
  status              TEXT NOT NULL DEFAULT 'agendada'
                      CHECK (status IN ('agendada', 'realizada', 'cancelada')),
  cancelada_por       TEXT NULL CHECK (cancelada_por IN ('aluno', 'personal')),
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. FATURAS (fechamento do ciclo por aluno)
-- ============================================================

CREATE TABLE treino.faturas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  aluno_id          UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  periodo_inicio    DATE NOT NULL,
  periodo_fim       DATE NOT NULL,
  modelo            TEXT NOT NULL CHECK (modelo IN ('por_aula', 'mensal')),
  qtd_aulas         INTEGER NOT NULL DEFAULT 0,
  valor_aulas       NUMERIC(10,2) NOT NULL DEFAULT 0,   -- soma das presenças (por_aula) ou valor_mensal (mensal)
  ajuste            NUMERIC(10,2) NOT NULL DEFAULT 0,   -- desconto (negativo) ou acréscimo
  ajuste_descricao  TEXT NULL,
  total             NUMERIC(10,2) NOT NULL DEFAULT 0,
  vencimento        DATE NULL,
  status            TEXT NOT NULL DEFAULT 'aberta'
                    CHECK (status IN ('aberta', 'enviada', 'paga', 'cancelada')),
  enviada_em        TIMESTAMPTZ NULL,
  paga_em           DATE NULL,
  forma_pagamento   TEXT NULL CHECK (forma_pagamento IN ('pix', 'dinheiro', 'cartao', 'transferencia', 'outro')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (periodo_fim >= periodo_inicio),
  UNIQUE (aluno_id, periodo_inicio)
);

-- ============================================================
-- 6. PARTICIPANTES DA AULA (presença = check-in + valor)
-- status: previsto → presente | falta | cancelou
-- cobrar: o personal decide em falta/cancelou (sugestão vem da config)
-- valor : snapshot no check-in (em grupo, pode ser o cheio de cada
--         aluno ou um valor dividido — decisão da tela)
-- fatura_id: preenchido no fechamento → não entra em outra fatura
-- ============================================================

CREATE TABLE treino.aula_participantes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id           UUID NOT NULL REFERENCES treino.aulas(id) ON DELETE CASCADE,
  aluno_id          UUID NOT NULL REFERENCES treino.alunos(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'previsto'
                    CHECK (status IN ('previsto', 'presente', 'falta', 'cancelou')),
  cobrar            BOOLEAN NULL,        -- NULL enquanto previsto; presente = true
  valor             NUMERIC(10,2) NULL CHECK (valor >= 0),
  cancelado_em      TIMESTAMPTZ NULL,
  sessao_id         UUID NULL REFERENCES treino.sessoes(id) ON DELETE SET NULL,
  fatura_id         UUID NULL REFERENCES treino.faturas(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aula_id, aluno_id)
);

-- Ligação sessão → aula (treino iniciado a partir da agenda)
ALTER TABLE treino.sessoes ADD COLUMN aula_id UUID NULL REFERENCES treino.aulas(id) ON DELETE SET NULL;

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_aluno_cobranca_prof      ON treino.aluno_cobranca(professional_id);
CREATE INDEX idx_horarios_prof            ON treino.horarios_fixos(professional_id) WHERE active;
CREATE INDEX idx_horario_alunos_aluno     ON treino.horario_alunos(aluno_id);
CREATE INDEX idx_aulas_prof_starts        ON treino.aulas(professional_id, starts_at);
CREATE UNIQUE INDEX uq_aulas_horario_orig ON treino.aulas(horario_id, original_starts_at);
CREATE INDEX idx_part_aula                ON treino.aula_participantes(aula_id);
CREATE INDEX idx_part_aluno               ON treino.aula_participantes(aluno_id);
CREATE INDEX idx_part_aberto              ON treino.aula_participantes(aluno_id) WHERE fatura_id IS NULL;
CREATE INDEX idx_part_sessao              ON treino.aula_participantes(sessao_id) WHERE sessao_id IS NOT NULL;
CREATE INDEX idx_faturas_prof_status      ON treino.faturas(professional_id, status);
CREATE INDEX idx_faturas_aluno            ON treino.faturas(aluno_id, periodo_inicio DESC);
CREATE INDEX idx_sessoes_aula             ON treino.sessoes(aula_id) WHERE aula_id IS NOT NULL;

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================

CREATE TRIGGER trg_prof_config_updated_at BEFORE UPDATE ON treino.professional_config FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();
CREATE TRIGGER trg_aluno_cobr_updated_at  BEFORE UPDATE ON treino.aluno_cobranca      FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();
CREATE TRIGGER trg_horarios_updated_at    BEFORE UPDATE ON treino.horarios_fixos      FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();
CREATE TRIGGER trg_aulas_updated_at       BEFORE UPDATE ON treino.aulas               FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();
CREATE TRIGGER trg_part_updated_at        BEFORE UPDATE ON treino.aula_participantes  FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();
CREATE TRIGGER trg_faturas_updated_at     BEFORE UPDATE ON treino.faturas             FOR EACH ROW EXECUTE FUNCTION treino.set_updated_at();

-- ============================================================
-- GRANTS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON
  treino.professional_config, treino.aluno_cobranca, treino.horarios_fixos,
  treino.horario_alunos, treino.aulas, treino.aula_participantes, treino.faturas
TO authenticated;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE treino.professional_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.aluno_cobranca      ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.horarios_fixos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.horario_alunos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.aulas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.aula_participantes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino.faturas             ENABLE ROW LEVEL SECURITY;

CREATE POLICY prof_config_own ON treino.professional_config
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE POLICY aluno_cobranca_own ON treino.aluno_cobranca
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND aluno_id IN (SELECT a.id FROM treino.alunos a));

CREATE POLICY horarios_own ON treino.horarios_fixos
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE POLICY horario_alunos_own ON treino.horario_alunos
  FOR ALL TO authenticated
  USING      (horario_id IN (SELECT h.id FROM treino.horarios_fixos h))
  WITH CHECK (horario_id IN (SELECT h.id FROM treino.horarios_fixos h)
              AND aluno_id IN (SELECT a.id FROM treino.alunos a));

CREATE POLICY aulas_own ON treino.aulas
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND (horario_id IS NULL OR horario_id IN (SELECT h.id FROM treino.horarios_fixos h)));

CREATE POLICY aula_participantes_own ON treino.aula_participantes
  FOR ALL TO authenticated
  USING      (aula_id IN (SELECT au.id FROM treino.aulas au))
  WITH CHECK (aula_id IN (SELECT au.id FROM treino.aulas au)
              AND aluno_id IN (SELECT a.id FROM treino.alunos a)
              AND (sessao_id IS NULL OR sessao_id IN (SELECT s.id FROM treino.sessoes s))
              AND (fatura_id IS NULL OR fatura_id IN (SELECT f.id FROM treino.faturas f)));

CREATE POLICY faturas_own ON treino.faturas
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND aluno_id IN (SELECT a.id FROM treino.alunos a));

-- ============================================================
-- FUNÇÃO: gerar aulas a partir dos horários fixos
-- Idempotente (ON CONFLICT no índice horario_id + original_starts_at).
-- SECURITY INVOKER: roda com as permissões/RLS do personal logado.
-- Uso no front: supabase.schema('treino').rpc('gerar_aulas')
--   ao abrir a agenda / tela Hoje e após salvar um horário.
-- ============================================================

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
    -- avança até o primeiro dia da semana certo
    d := d + ((r.weekday - EXTRACT(DOW FROM d)::int + 7) % 7);

    WHILE d <= LEAST(v_ate, COALESCE(r.valid_until, v_ate)) LOOP
      v_start := (d + r.start_time) AT TIME ZONE 'America/Sao_Paulo';
      v_aula := NULL;

      INSERT INTO treino.aulas (professional_id, horario_id, starts_at, original_starts_at, duration_min, local)
      VALUES (v_uid, r.id, v_start, v_start, r.duration_min, r.local)
      ON CONFLICT (horario_id, original_starts_at) DO NOTHING
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

REVOKE ALL ON FUNCTION treino.gerar_aulas(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.gerar_aulas(DATE) TO authenticated;

-- ============================================================
-- FUNÇÃO: regerar as aulas futuras de um horário após edição
-- (mudou dia/hora/alunos). Apaga só aulas futuras ainda 'agendada',
-- não remarcadas e sem nenhum participante já marcado; depois gera
-- de novo.
-- ============================================================

CREATE OR REPLACE FUNCTION treino.regerar_horario(p_horario_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM treino.aulas au
  WHERE au.horario_id = p_horario_id
    AND au.status = 'agendada'
    AND au.starts_at > now()
    AND au.starts_at = au.original_starts_at
    AND NOT EXISTS (
      SELECT 1 FROM treino.aula_participantes p
      WHERE p.aula_id = au.id AND p.status <> 'previsto'
    );

  RETURN treino.gerar_aulas(NULL);
END;
$$;

REVOKE ALL ON FUNCTION treino.regerar_horario(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.regerar_horario(UUID) TO authenticated;

COMMIT;

-- ============================================================
-- PÓS-APLICAÇÃO: nada a expor (schema treino já está exposto).
-- ============================================================
