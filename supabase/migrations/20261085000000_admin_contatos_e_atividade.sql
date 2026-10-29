-- ============================================================
-- Migration: 20261085000000_admin_contatos_e_atividade.sql
--
-- Painel admin (PR 4 da auditoria de UX):
--   1. treino.admin_contatos: registro dos contatos que o admin fez com um PERSONAL (canal, resultado, observação curta e, se quiser,
--      "adiar o alerta até"). Só dados do personal; a observação NÃO é lugar para dado de aluno nem de saúde (a tela avisa).
--   2. admin_registrar_contato / admin_contatos_resumo / admin_contatos_do_personal: únicas formas de escrever e ler a tabela.
--   3. admin_personais_atividade(): data do último uso do app por personal (a mesma ideia do "pagante sem uso" da lista de ação).
--      Só uma data por personal; nada de aluno.
-- Mesmo padrão das demais funções admin_*: SECURITY DEFINER, exigem is_admin() (que exige MFA) antes de tudo.
-- A tabela tem RLS e leitura só para o admin; escrita só pelas funções (INSERT/UPDATE/DELETE revogados de authenticated).
-- Reversão: DROP FUNCTION treino.admin_registrar_contato(UUID, TEXT, TEXT, TEXT, TEXT, INT);
--           DROP FUNCTION treino.admin_contatos_resumo(); DROP FUNCTION treino.admin_contatos_do_personal(UUID);
--           DROP FUNCTION treino.admin_personais_atividade(); DROP TABLE treino.admin_contatos;
-- ============================================================

BEGIN;

CREATE TABLE treino.admin_contatos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id  UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  admin_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  motivo           TEXT NOT NULL DEFAULT 'manual' CHECK (motivo IN ('manual', 'trial_sem_ativacao', 'pagante_sem_uso', 'vencendo')),
  canal            TEXT NOT NULL CHECK (canal IN ('whatsapp', 'telefone', 'email', 'outro')),
  resultado        TEXT NOT NULL CHECK (resultado IN ('sem_resposta', 'respondeu', 'combinou_retorno', 'resolvido', 'nao_quer')),
  observacao       TEXT CHECK (observacao IS NULL OR char_length(observacao) <= 300),
  adiar_ate        DATE,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_contatos_prof ON treino.admin_contatos(professional_id, criado_em DESC);

ALTER TABLE treino.admin_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_contatos_select_admin ON treino.admin_contatos
  FOR SELECT TO authenticated
  USING (treino.is_admin());

-- o schema dá INSERT/UPDATE/DELETE a authenticated por padrão: aqui só as funções escrevem
REVOKE INSERT, UPDATE, DELETE ON treino.admin_contatos FROM authenticated;

-- 1) registrar um contato (e, opcionalmente, adiar o alerta por N dias)
CREATE OR REPLACE FUNCTION treino.admin_registrar_contato(
  p_professional_id UUID, p_motivo TEXT, p_canal TEXT, p_resultado TEXT, p_observacao TEXT, p_adiar_dias INT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM treino.professionals WHERE id = p_professional_id AND is_admin = FALSE) THEN
    RAISE EXCEPTION 'Personal não encontrado.' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_adiar_dias, 0) < 0 OR COALESCE(p_adiar_dias, 0) > 90 THEN
    RAISE EXCEPTION 'Adiar de 0 a 90 dias.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO treino.admin_contatos (professional_id, admin_id, motivo, canal, resultado, observacao, adiar_ate)
  VALUES (
    p_professional_id, (SELECT auth.uid()), COALESCE(NULLIF(btrim(p_motivo), ''), 'manual'), p_canal, p_resultado,
    NULLIF(btrim(p_observacao), ''),
    CASE WHEN COALESCE(p_adiar_dias, 0) > 0 THEN v_hoje + p_adiar_dias END
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_registrar_contato(UUID, TEXT, TEXT, TEXT, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_registrar_contato(UUID, TEXT, TEXT, TEXT, TEXT, INT) TO authenticated;

-- 2) resumo por personal: último contato, quantos contatos e até quando o alerta está adiado (a maior data vale)
CREATE OR REPLACE FUNCTION treino.admin_contatos_resumo()
RETURNS TABLE (professional_id UUID, ultimo_em TIMESTAMPTZ, canal TEXT, resultado TEXT, adiar_ate DATE, total BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.professional_id, u.criado_em, u.canal, u.resultado,
         (SELECT MAX(c.adiar_ate) FROM treino.admin_contatos c WHERE c.professional_id = u.professional_id),
         (SELECT COUNT(*) FROM treino.admin_contatos c WHERE c.professional_id = u.professional_id)
  FROM (
    SELECT DISTINCT ON (c.professional_id) c.professional_id, c.criado_em, c.canal, c.resultado
    FROM treino.admin_contatos c
    ORDER BY c.professional_id, c.criado_em DESC
  ) u;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_contatos_resumo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_contatos_resumo() TO authenticated;

-- 3) histórico de contatos de um personal (os 30 mais recentes)
CREATE OR REPLACE FUNCTION treino.admin_contatos_do_personal(p_professional_id UUID)
RETURNS TABLE (id UUID, criado_em TIMESTAMPTZ, motivo TEXT, canal TEXT, resultado TEXT, observacao TEXT, adiar_ate DATE, admin_nome TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT c.id, c.criado_em, c.motivo, c.canal, c.resultado, c.observacao, c.adiar_ate, adm.name
  FROM treino.admin_contatos c
  LEFT JOIN treino.professionals adm ON adm.id = c.admin_id
  WHERE c.professional_id = p_professional_id
  ORDER BY c.criado_em DESC
  LIMIT 30;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_contatos_do_personal(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_contatos_do_personal(UUID) TO authenticated;

-- 4) último uso do app por personal (sem registro de uso = NULL; o cadastro em si não conta)
CREATE OR REPLACE FUNCTION treino.admin_personais_atividade()
RETURNS TABLE (professional_id UUID, ultima_atividade TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.id,
    GREATEST(
      (SELECT MAX(s.session_date)::timestamptz FROM treino.sessoes s WHERE s.professional_id = p.id AND s.status = 'concluida'),
      (SELECT MAX(e.concluido_em) FROM treino.execucoes_assincrono e WHERE e.professional_id = p.id AND e.status = 'concluido'),
      (SELECT MAX(au.starts_at) FROM treino.aulas au WHERE au.professional_id = p.id AND au.status = 'realizada' AND au.starts_at <= now()),
      (SELECT MAX(al.created_at) FROM treino.alunos al WHERE al.professional_id = p.id),
      (SELECT MAX(pl.created_at) FROM treino.planos pl WHERE pl.professional_id = p.id)
    )
  FROM treino.professionals p
  WHERE p.is_admin = FALSE;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_personais_atividade() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_personais_atividade() TO authenticated;

COMMIT;
