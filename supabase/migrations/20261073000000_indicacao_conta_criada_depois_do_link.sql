-- ============================================================
-- Migration: 20261073000000_indicacao_conta_criada_depois_do_link.sql
--
-- A indicação vale para CONTA NOVA: criada DEPOIS de o link de indicação ser aberto. Antes (migrations 20261069 e 20261072) bastava a conta
-- ter até 7 dias e nenhum aluno: uma conta já existente, criada há 3 dias e sem alunos, ainda era aceita (por exemplo, quem abria o link e
-- entrava na própria conta). Agora o app guarda o MOMENTO em que o link foi aberto (sem sessão) e manda ao servidor QUANTOS SEGUNDOS se
-- passaram desde então (a diferença usa só o relógio do aparelho: não depende de o relógio estar certo). O servidor calcula
-- "link aberto em" = agora - segundos e exige: professionals.created_at >= link aberto em (tolerância de 1 minuto).
--   * a conta existia antes do link  -> 'nao_novo';
--   * link aberto há mais de 48 horas, ou segundos fora do intervalo/ausentes -> 'expirado';
--   * a conta tem algum aluno (migration 20261072) -> 'nao_novo'.
-- O parâmetro novo substitui a função antiga de 1 parâmetro (que é REMOVIDA: sem ela, um app antigo não consegue pular a regra).
-- Limite conhecido: o aparelho informa os segundos; quem forja isso burla a regra, mas então já está criando conta nova de qualquer forma
-- (custo do abuso: 30 dias, com teto de 6 por indicador; o admin vê os sinais e pode revogar). A regra dos 3 alunos criados depois continua.
-- Rollback: recriar registrar_indicacao(TEXT) da migration 20261072 e DROP da de 2 parâmetros.
-- ============================================================

BEGIN;

DROP FUNCTION IF EXISTS treino.registrar_indicacao(TEXT);

CREATE OR REPLACE FUNCTION treino.registrar_indicacao(p_codigo TEXT, p_segundos_desde_abertura INT)
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
  v_aberto TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = 'P0001'; END IF;
  IF v_cod !~ '^[A-HJ-NP-Z2-9]{8}$' THEN RETURN 'invalido'; END IF;
  SELECT id INTO v_indicador FROM treino.professionals WHERE codigo_indicacao = v_cod;
  IF v_indicador IS NULL THEN RETURN 'invalido'; END IF;
  IF v_indicador = v_uid THEN RETURN 'proprio'; END IF;
  IF EXISTS (SELECT 1 FROM treino.indicacoes WHERE indicado_id = v_uid) THEN RETURN 'ja_registrado'; END IF;

  -- o link precisa ter sido aberto há no máximo 48 horas (e não "no futuro")
  IF p_segundos_desde_abertura IS NULL OR p_segundos_desde_abertura < 0 OR p_segundos_desde_abertura > 172800 THEN RETURN 'expirado'; END IF;
  v_aberto := now() - make_interval(secs => p_segundos_desde_abertura);

  SELECT created_at INTO v_criado FROM treino.professionals WHERE id = v_uid;
  IF v_criado IS NULL THEN RETURN 'expirado'; END IF;
  IF v_criado < v_aberto - INTERVAL '1 minute' THEN RETURN 'nao_novo'; END IF; -- a conta já existia antes do link
  IF EXISTS (SELECT 1 FROM treino.alunos WHERE professional_id = v_uid) THEN RETURN 'nao_novo'; END IF;

  INSERT INTO treino.indicacoes (indicador_id, indicado_id) VALUES (v_indicador, v_uid);
  RETURN 'registrado';
END;
$$;
REVOKE ALL ON FUNCTION treino.registrar_indicacao(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.registrar_indicacao(TEXT, INT) TO authenticated;

COMMIT;
