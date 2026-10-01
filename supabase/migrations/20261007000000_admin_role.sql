-- ============================================================
-- Migration: 20261007000000_admin_role.sql
--
-- Painel administrativo: marca de admin em treino.professionals +
-- todas as leituras/escritas do painel passando por funções
-- SECURITY DEFINER (nunca por RLS "admin vê tudo" direto nas tabelas).
--
-- Por quê: alunos tem dados de saúde (lesão, cirurgia, medicação) que
-- o admin NUNCA deve ver (regra do projeto). Em vez de dar ao admin
-- uma policy de SELECT ampla em treino.alunos (fácil de errar o
-- escopo depois), as funções abaixo só expõem exatamente as colunas
-- agregadas/administrativas que o painel precisa — nenhuma delas
-- faz SELECT * em alunos, e nenhuma retorna linha de aluno nenhuma.
--
-- Pré-requisito: a conta do admin (contato@personalperto.com.br)
-- precisa já existir em auth.users (criada por convite, fora desta
-- migration) antes de rodar isto — ver docs/ADMIN.md.
-- ============================================================

BEGIN;

-- ----- Marca de admin -----
ALTER TABLE treino.professionals
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Marca o admin, se a conta já existir (não falha se ainda não existir
-- — rode de novo depois de criar a conta via convite).
UPDATE treino.professionals
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'contato@personalperto.com.br');

-- ----- Helper: o usuário autenticado atual é admin? -----
-- Não é SECURITY DEFINER: a própria professionals_self_read já deixa
-- cada um ler a própria linha, então isso funciona tanto chamado solto
-- quanto dentro de uma function SECURITY DEFINER (que já roda com o
-- papel do dono, então o RLS nem entra no caminho nesse segundo caso).
CREATE OR REPLACE FUNCTION treino.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT is_admin FROM treino.professionals WHERE id = (SELECT auth.uid())), false)
$$;

REVOKE ALL ON FUNCTION treino.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.is_admin() TO authenticated;

-- ----- Log de ações administrativas -----
CREATE TABLE IF NOT EXISTS treino.admin_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id                UUID REFERENCES auth.users(id),
  acao                    TEXT NOT NULL CHECK (acao IN ('reset_senha', 'alterar_trial', 'alterar_plano')),
  target_professional_id  UUID REFERENCES treino.professionals(id) ON DELETE SET NULL,
  detalhes                JSONB,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE treino.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_logs_select_admin ON treino.admin_logs
  FOR SELECT TO authenticated
  USING (treino.is_admin());

-- O schema treino dá INSERT/UPDATE/DELETE pra authenticated por padrão
-- (ALTER DEFAULT PRIVILEGES lá na migration inicial) — revoga aqui pra
-- ninguém conseguir escrever log direto pela REST API. As únicas
-- escritas são as functions SECURITY DEFINER abaixo e a Edge Function
-- (que usa a service_role, que ignora grants/RLS).
REVOKE INSERT, UPDATE, DELETE ON treino.admin_logs FROM authenticated;

-- ============================================================
-- Funções do painel (todas SECURITY DEFINER + checam is_admin() antes
-- de fazer qualquer coisa — nunca confiar só no frontend escondendo
-- o botão).
-- ============================================================

-- Resumo pro topo do dashboard.
CREATE OR REPLACE FUNCTION treino.admin_resumo()
RETURNS TABLE (total_personais BIGINT, total_alunos BIGINT, regioes_ativas BIGINT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM treino.professionals WHERE is_admin = false),
    (SELECT COUNT(*) FROM treino.alunos),
    (SELECT COUNT(DISTINCT pc.pix_cidade) FROM treino.professional_config pc WHERE pc.pix_cidade IS NOT NULL AND pc.pix_cidade <> '');
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_resumo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.admin_resumo() TO authenticated;

-- Tabela de personais (sem nenhum dado de aluno — só a contagem).
-- "cidade" vem de professional_config.pix_cidade: é a cidade do
-- recebedor do Pix (opcional, só quem configurou cobrança tem), não um
-- campo de "onde o personal atua" — não existe esse campo hoje. É uma
-- aproximação, deixada clara na UI.
CREATE OR REPLACE FUNCTION treino.admin_listar_personais()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  cidade TEXT,
  status TEXT,
  trial_fim TIMESTAMPTZ,
  assinatura_fim TIMESTAMPTZ,
  plano TEXT,
  qtd_alunos BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    pc.pix_cidade,
    a.status,
    a.trial_fim,
    a.assinatura_fim,
    a.plano,
    (SELECT COUNT(*) FROM treino.alunos al WHERE al.professional_id = p.id)
  FROM treino.professionals p
  LEFT JOIN treino.assinaturas a ON a.professional_id = p.id
  LEFT JOIN treino.professional_config pc ON pc.professional_id = p.id
  WHERE p.is_admin = false
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_listar_personais() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.admin_listar_personais() TO authenticated;

-- Agrupamento por cidade (mesma ressalva do pix_cidade acima).
CREATE OR REPLACE FUNCTION treino.admin_regioes()
RETURNS TABLE (cidade TEXT, qtd BIGINT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT pc.pix_cidade, COUNT(*)
  FROM treino.professional_config pc
  JOIN treino.professionals p ON p.id = pc.professional_id AND p.is_admin = false
  WHERE pc.pix_cidade IS NOT NULL AND pc.pix_cidade <> ''
  GROUP BY pc.pix_cidade
  ORDER BY COUNT(*) DESC;
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_regioes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.admin_regioes() TO authenticated;

-- Estender/alterar o trial (volta pro status 'trial' mesmo se já tinha expirado).
CREATE OR REPLACE FUNCTION treino.admin_alterar_trial(p_professional_id UUID, p_novo_fim TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_antes treino.assinaturas;
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_antes FROM treino.assinaturas WHERE professional_id = p_professional_id;

  UPDATE treino.assinaturas
  SET trial_fim = p_novo_fim, status = 'trial'
  WHERE professional_id = p_professional_id;

  INSERT INTO treino.admin_logs (admin_id, acao, target_professional_id, detalhes)
  VALUES (
    (SELECT auth.uid()),
    'alterar_trial',
    p_professional_id,
    jsonb_build_object('antes', to_jsonb(v_antes), 'depois', jsonb_build_object('trial_fim', p_novo_fim, 'status', 'trial'))
  );
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_alterar_trial(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.admin_alterar_trial(UUID, TIMESTAMPTZ) TO authenticated;

-- Alterar prazo/plano da assinatura paga.
CREATE OR REPLACE FUNCTION treino.admin_alterar_plano(p_professional_id UUID, p_assinatura_fim TIMESTAMPTZ, p_plano TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_antes treino.assinaturas;
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  IF p_plano NOT IN ('mensal', 'trimestral', 'semestral') THEN
    RAISE EXCEPTION 'Plano inválido.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_antes FROM treino.assinaturas WHERE professional_id = p_professional_id;

  UPDATE treino.assinaturas
  SET assinatura_fim = p_assinatura_fim, plano = p_plano, status = 'ativa'
  WHERE professional_id = p_professional_id;

  INSERT INTO treino.admin_logs (admin_id, acao, target_professional_id, detalhes)
  VALUES (
    (SELECT auth.uid()),
    'alterar_plano',
    p_professional_id,
    jsonb_build_object('antes', to_jsonb(v_antes), 'depois', jsonb_build_object('assinatura_fim', p_assinatura_fim, 'plano', p_plano, 'status', 'ativa'))
  );
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_alterar_plano(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.admin_alterar_plano(UUID, TIMESTAMPTZ, TEXT) TO authenticated;

COMMIT;
