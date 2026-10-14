-- ============================================================
-- Migration: 20261033000000_notificacao_ciclo_encerrado.sql
--
-- Notificação "Ciclo encerrado" no sino do personal.
--
-- O fechamento de ciclo é MANUAL (o personal fecha em "Fechar ciclo" e isso cria a fatura): não existe
-- evento nem agendador que dispare no último dia do ciclo. Então a notificação é gerada de forma
-- preguiçosa: o app chama treino.gerar_notificacoes_ciclo() ao abrir e a função cria, para cada aluno com
-- cobrança ativa, UMA notificação do ciclo que acabou de terminar (último dia do ciclo = hoje, ou o ciclo
-- anterior) quando ainda não há fatura dele e há o que cobrar. Idempotente (índice único por aluno + ciclo).
--
-- A tabela continua sem INSERT direto para o personal (só SELECT e UPDATE de "lida"): a inserção passa
-- por esta função SECURITY DEFINER, que só age sobre os alunos do próprio auth.uid().
-- O payload leva só período, modelo e valor total — nenhum dado de saúde.
-- ============================================================

BEGIN;

ALTER TABLE treino.notificacoes_professor DROP CONSTRAINT IF EXISTS notificacoes_professor_tipo_check;
ALTER TABLE treino.notificacoes_professor
  ADD CONSTRAINT notificacoes_professor_tipo_check CHECK (tipo IN ('treino_concluido', 'ciclo_encerrado'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacoes_ciclo_encerrado
  ON treino.notificacoes_professor (aluno_id, ((payload->>'periodo_inicio')))
  WHERE tipo = 'ciclo_encerrado';

CREATE OR REPLACE FUNCTION treino.gerar_notificacoes_ciclo()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid     UUID := (SELECT auth.uid());
  v_hoje    DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  r         RECORD;
  v_ini     DATE;
  v_fim     DATE;
  v_total   NUMERIC(10,2);
  v_qtd     INTEGER;
  v_criadas INTEGER := 0;
  v_linhas  INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT c.aluno_id, c.modelo, c.valor_mensal, c.dia_ciclo
    FROM treino.aluno_cobranca c
    WHERE c.professional_id = v_uid AND c.ativo
  LOOP
    -- ciclo que contém hoje (começa no dia_ciclo)
    v_ini := make_date(EXTRACT(YEAR FROM v_hoje)::int, EXTRACT(MONTH FROM v_hoje)::int, r.dia_ciclo);
    IF EXTRACT(DAY FROM v_hoje) < r.dia_ciclo THEN
      v_ini := (v_ini - INTERVAL '1 month')::date;
    END IF;
    v_fim := ((v_ini + INTERVAL '1 month')::date) - 1;

    -- hoje é o último dia do ciclo: esse é o ciclo a fechar; senão, o ciclo anterior (que já terminou)
    IF v_hoje <> v_fim THEN
      v_fim := v_ini - 1;
      v_ini := (v_ini - INTERVAL '1 month')::date;
    END IF;

    -- já foi fechado (fatura não cancelada)? então não há o que avisar
    IF EXISTS (
      SELECT 1 FROM treino.faturas f
      WHERE f.aluno_id = r.aluno_id AND f.periodo_inicio = v_ini AND f.status <> 'cancelada'
    ) THEN
      CONTINUE;
    END IF;

    IF r.modelo = 'mensal' THEN
      v_total := COALESCE(r.valor_mensal, 0);
      v_qtd := 1;
    ELSE
      SELECT COALESCE(SUM(ap.valor), 0), COUNT(*)
        INTO v_total, v_qtd
      FROM treino.aula_participantes ap
      JOIN treino.aulas au ON au.id = ap.aula_id
      WHERE ap.aluno_id = r.aluno_id
        AND ap.fatura_id IS NULL
        AND ap.cobrar IS TRUE
        AND (au.starts_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN v_ini AND v_fim;
    END IF;

    IF v_qtd = 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO treino.notificacoes_professor (professional_id, aluno_id, tipo, payload)
    VALUES (
      v_uid, r.aluno_id, 'ciclo_encerrado',
      jsonb_build_object('periodo_inicio', v_ini, 'periodo_fim', v_fim, 'total', v_total, 'modelo', r.modelo)
    )
    ON CONFLICT (aluno_id, ((payload->>'periodo_inicio'))) WHERE tipo = 'ciclo_encerrado' DO NOTHING;

    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    v_criadas := v_criadas + v_linhas;
  END LOOP;

  RETURN v_criadas;
END;
$$;

REVOKE ALL ON FUNCTION treino.gerar_notificacoes_ciclo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.gerar_notificacoes_ciclo() TO authenticated;

COMMIT;
