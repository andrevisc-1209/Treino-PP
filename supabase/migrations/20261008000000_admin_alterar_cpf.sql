-- ============================================================
-- Migration: 20261008000000_admin_alterar_cpf.sql
--
-- O painel admin precisa poder corrigir o CPF de um personal (erro de
-- digitação, por exemplo), mas treino.professionals tem um trigger
-- (tg_bloquear_cpf, migration 20261005000001) que bloqueia QUALQUER
-- UPDATE de CPF depois do primeiro preenchimento — inclusive um UPDATE
-- feito por uma function SECURITY DEFINER, porque trigger roda sempre,
-- independente de RLS/permissão.
--
-- Em vez de enfraquecer o trigger (que é defesa em profundidade real,
-- pedida explicitamente numa PR anterior), ele passa a abrir uma
-- exceção controlada: só pula o bloqueio se uma configuração de sessão
-- específica estiver ligada, e só a function admin_alterar_cpf liga
-- essa configuração — e só depois de confirmar is_admin(). Ninguém
-- mais (nem outra function, nem um UPDATE direto pela REST API) tem
-- como ligar essa flag.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.bloquear_alteracao_cpf()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('treino.permitir_alterar_cpf', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF OLD.cpf IS NOT NULL AND NEW.cpf IS DISTINCT FROM OLD.cpf THEN
    RAISE EXCEPTION 'CPF não pode ser alterado após o cadastro';
  END IF;
  RETURN NEW;
END;
$$;

-- Permite 'alterar_cpf' como ação válida em admin_logs (constraint criada
-- sem nome explícito na migration anterior — nome default do Postgres pra
-- CHECK de coluna única).
ALTER TABLE treino.admin_logs DROP CONSTRAINT IF EXISTS admin_logs_acao_check;
ALTER TABLE treino.admin_logs
  ADD CONSTRAINT admin_logs_acao_check CHECK (acao IN ('reset_senha', 'alterar_trial', 'alterar_plano', 'alterar_cpf'));

CREATE OR REPLACE FUNCTION treino.admin_alterar_cpf(p_professional_id UUID, p_novo_cpf TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cpf_antes TEXT;
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  -- Validação de formato básica aqui (defesa em profundidade); a
  -- validação completa (dígito verificador) já roda no frontend, igual
  -- ao cadastro normal.
  IF p_novo_cpf !~ '^\d{11}$' THEN
    RAISE EXCEPTION 'CPF inválido.' USING ERRCODE = '23514';
  END IF;

  SELECT cpf INTO v_cpf_antes FROM treino.professionals WHERE id = p_professional_id;

  PERFORM set_config('treino.permitir_alterar_cpf', 'on', true); -- true = só nesta transação (SET LOCAL)

  UPDATE treino.professionals SET cpf = p_novo_cpf WHERE id = p_professional_id;

  INSERT INTO treino.admin_logs (admin_id, acao, target_professional_id, detalhes)
  VALUES (
    (SELECT auth.uid()),
    'alterar_cpf',
    p_professional_id,
    jsonb_build_object('antes', jsonb_build_object('cpf', v_cpf_antes), 'depois', jsonb_build_object('cpf', p_novo_cpf))
  );
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_alterar_cpf(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION treino.admin_alterar_cpf(UUID, TEXT) TO authenticated;

COMMIT;
