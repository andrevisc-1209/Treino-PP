-- ============================================================
-- Migration: 20261048000000_cpf_validacao_e_rpc.sql
--
-- Auditoria de segurança (2ª revisão como invasor, item "enumeração de CPF"):
--   * o banco não validava o CPF: pela API o cliente gravava qualquer texto (e o cadastro aceitava qualquer coisa nos
--     metadados), contornando a validação do front;
--   * o UPDATE de cpf era direto pelo cliente e a colisão de unicidade devolvia "CPF já cadastrado" (confirma quem é personal
--     da plataforma), sem nenhum limite de tentativas.
--
-- Aqui:
--   1. treino.cpf_valido(text): dígitos verificadores (módulo 11), igual a src/lib/cpf.ts; rejeita sequências repetidas.
--   2. CHECK NOT VALID em professionals.cpf: vale para INSERT/UPDATE novos por QUALQUER caminho (API, metadados do cadastro,
--      RPC, admin) sem varrer o que já existe. Uma linha antiga com CPF inválido só bloqueia a PRÓXIMA edição dela.
--      Antes de aplicar, rode: SELECT id FROM treino.professionals WHERE cpf IS NOT NULL AND NOT treino.cpf_valido(cpf);
--   3. RPC treino.atualizar_cpf(text): único caminho do cliente para gravar o CPF. Usa auth.uid(), exige CPF atual nulo,
--      limita a 5 tentativas/dia por personal e, em colisão, responde com mensagem GENÉRICA (não diz que o CPF já existe).
--   4. REVOKE UPDATE (cpf) do cliente (a migration 20261044 não é editada; este REVOKE vem depois dela).
--
-- Limite que continua: enquanto o CPF for único, qualquer cadastro/gravação é um "oráculo" (dá erro se já existe). Isto o
-- encarece (limite por conta, sem confirmação explícita) mas não o elimina; e não há prova de posse do CPF (quem o cadastra
-- primeiro o reserva) — a correção hoje é admin_alterar_cpf.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.cpf_valido(p_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  soma  INT;
  resto INT;
  i     INT;
BEGIN
  IF p_cpf IS NULL OR p_cpf !~ '^[0-9]{11}$' THEN RETURN FALSE; END IF;
  IF p_cpf ~ '^([0-9])\1{10}$' THEN RETURN FALSE; END IF;

  soma := 0;
  FOR i IN 1..9 LOOP soma := soma + substr(p_cpf, i, 1)::INT * (11 - i); END LOOP;
  resto := (soma * 10) % 11;
  IF resto = 10 THEN resto := 0; END IF;
  IF resto <> substr(p_cpf, 10, 1)::INT THEN RETURN FALSE; END IF;

  soma := 0;
  FOR i IN 1..10 LOOP soma := soma + substr(p_cpf, i, 1)::INT * (12 - i); END LOOP;
  resto := (soma * 10) % 11;
  IF resto = 10 THEN resto := 0; END IF;
  RETURN resto = substr(p_cpf, 11, 1)::INT;
END;
$$;

REVOKE ALL ON FUNCTION treino.cpf_valido(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.cpf_valido(TEXT) TO authenticated, service_role;

ALTER TABLE treino.professionals
  ADD CONSTRAINT professionals_cpf_valido_chk CHECK (cpf IS NULL OR treino.cpf_valido(cpf)) NOT VALID;

CREATE OR REPLACE FUNCTION treino.atualizar_cpf(p_cpf TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_cpf   TEXT := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');
  v_atual TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT treino.cpf_valido(v_cpf) THEN
    RAISE EXCEPTION 'CPF inválido.' USING ERRCODE = 'P0001';
  END IF;
  -- 5 tentativas por dia por personal (conta a tentativa, deu certo ou não): encarece "testar" CPFs.
  IF NOT treino.upsert_rate_limit('cpf:' || v_uid::TEXT, 5, 86400) THEN
    RAISE EXCEPTION 'Muitas tentativas de salvar o CPF. Tente novamente amanhã.' USING ERRCODE = 'P0001';
  END IF;

  SELECT cpf INTO v_atual FROM treino.professionals WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.' USING ERRCODE = 'P0001';
  END IF;
  IF v_atual IS NOT NULL THEN
    IF v_atual = v_cpf THEN RETURN; END IF; -- repetir o próprio CPF é inofensivo
    RAISE EXCEPTION 'CPF não pode ser alterado após o cadastro' USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    UPDATE treino.professionals SET cpf = v_cpf WHERE id = v_uid;
  EXCEPTION WHEN unique_violation THEN
    -- mensagem genérica: não confirma que o CPF já está cadastrado em outra conta
    RAISE EXCEPTION 'Não foi possível salvar o CPF. Confira os dados ou fale com o suporte.' USING ERRCODE = 'P0001';
  END;
END;
$$;

REVOKE ALL ON FUNCTION treino.atualizar_cpf(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.atualizar_cpf(TEXT) TO authenticated;

-- O cliente deixa de gravar cpf direto: só pela RPC acima (validação + limite + mensagem genérica).
REVOKE UPDATE (cpf) ON treino.professionals FROM authenticated;

COMMIT;
