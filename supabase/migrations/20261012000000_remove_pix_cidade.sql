-- ============================================================
-- Migration: 20261012000000_remove_pix_cidade.sql
--
-- Remove professional_config.pix_cidade. A cidade do QR Pix e a do painel admin
-- passam a ser professionals.cidade / professionals.uf (cadastro do personal).
--
-- ORDEM: as funções do admin são reescritas ANTES do DROP (elas liam pix_cidade).
-- Rode esta migration DEPOIS de a PR estar mergeada e o deploy do front concluído:
-- o front antigo ainda grava pix_cidade ao salvar o Pix e quebraria ("Salvar Pix")
-- entre o DROP e o deploy.
--
-- IRREVERSÍVEL: as cidades de Pix já gravadas são descartadas (não trazem UF, então
-- não dá pra convertê-las em professionals.cidade/uf). O QR não depende delas desde
-- a PR #53.
-- ============================================================

BEGIN;

-- Cidades com cadastro: pares (UF, cidade) distintos de personais (exceto admin).
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
    (SELECT COUNT(DISTINCT COALESCE(p.uf, '') || '|' || p.cidade)
       FROM treino.professionals p
      WHERE p.is_admin = false AND p.cidade IS NOT NULL AND p.cidade <> '');
END;
$$;

-- Lista de personais; "cidade" = cidade do cadastro ("Niterói/RJ"), sem dado de aluno além da contagem.
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
    CASE WHEN p.cidade IS NULL OR p.cidade = '' THEN NULL ELSE p.cidade || COALESCE('/' || p.uf, '') END,
    a.status,
    a.trial_fim,
    a.assinatura_fim,
    a.plano,
    (SELECT COUNT(*) FROM treino.alunos al WHERE al.professional_id = p.id)
  FROM treino.professionals p
  LEFT JOIN treino.assinaturas a ON a.professional_id = p.id
  WHERE p.is_admin = false
  ORDER BY p.created_at DESC;
END;
$$;

-- Personais por cidade do cadastro (agrupa por UF + cidade: cidades homônimas de estados diferentes não se misturam).
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
  SELECT p.cidade || COALESCE('/' || p.uf, ''), COUNT(*)
  FROM treino.professionals p
  WHERE p.is_admin = false AND p.cidade IS NOT NULL AND p.cidade <> ''
  GROUP BY p.uf, p.cidade
  ORDER BY COUNT(*) DESC, p.cidade;
END;
$$;

ALTER TABLE treino.professional_config DROP COLUMN IF EXISTS pix_cidade;

COMMIT;
