-- ============================================================
-- Migration: 20261069000000_indicacao.sql
--
-- Programa de indicação: personal indica personal. Quando o INDICADO se cadastra (com o código do indicador) e cadastra mais de 2 alunos
-- (3 ou mais, nomes diferentes), os dois ganham 1 mês grátis. O indicador tem teto de meses ganhos (treino.indicacao_teto(), hoje 6);
-- o indicado sempre ganha.
--
--   1. professionals.codigo_indicacao: código curto (8 caracteres, sem I/O/0/1) gerado no cadastro; os atuais ganham um código.
--   2. assinaturas.bonus_ate: o mês grátis é um acréscimo APÓS o fim do acesso atual (trial ou assinatura). treino.assinatura_ativa()
--      passa a valer também enquanto now() < bonus_ate. Não mexe em status/plano/assinatura_fim (o webhook do Mercado Pago segue igual).
--   3. treino.indicacoes: quem indicou quem, estado (pendente/concedida) e se o indicador ganhou (teto). Só por RPC (sem acesso direto).
--   4. registrar_indicacao(codigo): chamada pelo INDICADO logo depois de entrar (conta criada há no máximo 7 dias, uma vez só, nunca o
--      próprio código). Resposta curta, sem revelar quem é o dono do código.
--   5. Trigger em alunos: ao inserir, se o dono é indicado pendente e já tem 3+ alunos com nomes diferentes (fora da lixeira), concede.
--   6. minhas_indicacoes(): números para a tela (nunca nome, e-mail ou CPF de ninguém).
--   7. documentos_versoes: Termos 1.3 e Política 1.8 (o texto passa a descrever o programa). Sem a linha, o cadastro novo é recusado.
-- Rollback (se precisar): DROP TRIGGER tg_conceder_indicacao ON treino.alunos; DROP TABLE treino.indicacoes; ALTER TABLE treino.assinaturas
--   DROP COLUMN bonus_ate; ALTER TABLE treino.professionals DROP COLUMN codigo_indicacao; e restaurar assinatura_ativa() da migration 20261052.
-- ============================================================

BEGIN;

-- ----- 1. código de indicação -----
ALTER TABLE treino.professionals ADD COLUMN IF NOT EXISTS codigo_indicacao TEXT;

CREATE OR REPLACE FUNCTION treino.novo_codigo_indicacao()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  alfabeto CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 símbolos, sem I, O, 0 e 1 (confundem no WhatsApp)
  v_cod TEXT;
  i INT;
BEGIN
  LOOP
    v_cod := '';
    FOR i IN 1..8 LOOP
      v_cod := v_cod || substr(alfabeto, 1 + floor(random() * 32)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM treino.professionals WHERE codigo_indicacao = v_cod);
  END LOOP;
  RETURN v_cod;
END;
$$;
REVOKE ALL ON FUNCTION treino.novo_codigo_indicacao() FROM PUBLIC, anon, authenticated;

UPDATE treino.professionals SET codigo_indicacao = treino.novo_codigo_indicacao() WHERE codigo_indicacao IS NULL;

ALTER TABLE treino.professionals
  ADD CONSTRAINT professionals_codigo_indicacao_formato CHECK (codigo_indicacao IS NULL OR codigo_indicacao ~ '^[A-HJ-NP-Z2-9]{8}$');
CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_codigo_indicacao ON treino.professionals (codigo_indicacao);

CREATE OR REPLACE FUNCTION treino.tg_professionals_codigo_indicacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.codigo_indicacao IS NULL THEN
    NEW.codigo_indicacao := treino.novo_codigo_indicacao();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tg_professionals_codigo_indicacao ON treino.professionals;
CREATE TRIGGER tg_professionals_codigo_indicacao BEFORE INSERT ON treino.professionals
  FOR EACH ROW EXECUTE FUNCTION treino.tg_professionals_codigo_indicacao();
-- (o cliente só tem UPDATE em colunas específicas, que não incluem codigo_indicacao: migration 20261044)

-- ----- 2. mês grátis como acréscimo -----
ALTER TABLE treino.assinaturas ADD COLUMN IF NOT EXISTS bonus_ate TIMESTAMPTZ NULL;

CREATE OR REPLACE FUNCTION treino.assinatura_ativa()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM treino.assinaturas a
    WHERE a.professional_id = (SELECT auth.uid())
      AND (
        (a.status = 'trial' AND a.trial_fim > now())
        OR (a.status = 'ativa' AND (a.assinatura_fim IS NULL OR a.assinatura_fim > now()))
        OR (a.bonus_ate IS NOT NULL AND a.bonus_ate > now())
      )
  );
$$;
REVOKE ALL ON FUNCTION treino.assinatura_ativa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.assinatura_ativa() TO authenticated;

-- Soma `p_dias` ao fim do acesso atual (o maior entre agora, bônus, fim do trial e fim da assinatura): o mês vem DEPOIS do que já tem.
CREATE OR REPLACE FUNCTION treino.estender_bonus(p_prof UUID, p_dias INT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE treino.assinaturas a
  SET bonus_ate = GREATEST(
        now(),
        a.bonus_ate,
        CASE WHEN a.status = 'trial' THEN a.trial_fim END,
        CASE WHEN a.status = 'ativa' THEN a.assinatura_fim END
      ) + make_interval(days => p_dias)
  WHERE a.professional_id = p_prof;
$$;
REVOKE ALL ON FUNCTION treino.estender_bonus(UUID, INT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION treino.indicacao_teto()
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 6 $$; -- meses grátis que um mesmo indicador pode ganhar; para mudar, CREATE OR REPLACE com outro número
REVOKE ALL ON FUNCTION treino.indicacao_teto() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.indicacao_teto() TO authenticated;

-- ----- 3. quem indicou quem -----
CREATE TABLE IF NOT EXISTS treino.indicacoes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id     UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  indicado_id      UUID NOT NULL UNIQUE REFERENCES treino.professionals(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concedida')),
  indicador_ganhou BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  concedida_em     TIMESTAMPTZ NULL,
  CHECK (indicador_id <> indicado_id)
);
CREATE INDEX IF NOT EXISTS idx_indicacoes_indicador ON treino.indicacoes (indicador_id);
ALTER TABLE treino.indicacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.indicacoes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON treino.indicacoes TO service_role;
-- sem policy: o cliente não lê nem escreve aqui; só as funções SECURITY DEFINER abaixo

-- ----- 4. registrar o código (chamado pelo indicado) -----
CREATE OR REPLACE FUNCTION treino.registrar_indicacao(p_codigo TEXT)
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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = 'P0001'; END IF;
  IF v_cod !~ '^[A-HJ-NP-Z2-9]{8}$' THEN RETURN 'invalido'; END IF;
  SELECT id INTO v_indicador FROM treino.professionals WHERE codigo_indicacao = v_cod;
  IF v_indicador IS NULL THEN RETURN 'invalido'; END IF;
  IF v_indicador = v_uid THEN RETURN 'proprio'; END IF;
  IF EXISTS (SELECT 1 FROM treino.indicacoes WHERE indicado_id = v_uid) THEN RETURN 'ja_registrado'; END IF;
  SELECT created_at INTO v_criado FROM treino.professionals WHERE id = v_uid;
  IF v_criado IS NULL OR v_criado < now() - INTERVAL '7 days' THEN RETURN 'expirado'; END IF; -- só vale para conta nova
  INSERT INTO treino.indicacoes (indicador_id, indicado_id) VALUES (v_indicador, v_uid);
  RETURN 'registrado';
END;
$$;
REVOKE ALL ON FUNCTION treino.registrar_indicacao(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.registrar_indicacao(TEXT) TO authenticated;

-- ----- 5. conceder quando o indicado cadastra o 3º aluno -----
CREATE OR REPLACE FUNCTION treino.tg_conceder_indicacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ind treino.indicacoes%ROWTYPE;
  v_ganhos INT;
  v_ganha BOOLEAN;
BEGIN
  SELECT * INTO v_ind FROM treino.indicacoes WHERE indicado_id = NEW.professional_id AND status = 'pendente' FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF (SELECT count(DISTINCT lower(btrim(name))) FROM treino.alunos WHERE professional_id = NEW.professional_id AND apagado_em IS NULL) < 3 THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_ganhos FROM treino.indicacoes WHERE indicador_id = v_ind.indicador_id AND indicador_ganhou;
  v_ganha := v_ganhos < treino.indicacao_teto();
  UPDATE treino.indicacoes SET status = 'concedida', concedida_em = now(), indicador_ganhou = v_ganha WHERE id = v_ind.id;
  PERFORM treino.estender_bonus(v_ind.indicado_id, 30);
  IF v_ganha THEN PERFORM treino.estender_bonus(v_ind.indicador_id, 30); END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION treino.tg_conceder_indicacao() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tg_conceder_indicacao ON treino.alunos;
CREATE TRIGGER tg_conceder_indicacao AFTER INSERT ON treino.alunos
  FOR EACH ROW EXECUTE FUNCTION treino.tg_conceder_indicacao();

-- ----- 6. números para a tela (nunca dado de outra pessoa) -----
CREATE OR REPLACE FUNCTION treino.minhas_indicacoes()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'codigo',        (SELECT p.codigo_indicacao FROM treino.professionals p WHERE p.id = (SELECT auth.uid())),
    'teto',          treino.indicacao_teto(),
    'indicados',     (SELECT count(*) FROM treino.indicacoes i WHERE i.indicador_id = (SELECT auth.uid())),
    'pendentes',     (SELECT count(*) FROM treino.indicacoes i WHERE i.indicador_id = (SELECT auth.uid()) AND i.status = 'pendente'),
    'concedidas',    (SELECT count(*) FROM treino.indicacoes i WHERE i.indicador_id = (SELECT auth.uid()) AND i.status = 'concedida'),
    'meses_ganhos',  (SELECT count(*) FROM treino.indicacoes i WHERE i.indicador_id = (SELECT auth.uid()) AND i.indicador_ganhou),
    'fui_indicado',  EXISTS (SELECT 1 FROM treino.indicacoes i WHERE i.indicado_id = (SELECT auth.uid())),
    'minha_situacao', (SELECT i.status FROM treino.indicacoes i WHERE i.indicado_id = (SELECT auth.uid())),
    'bonus_ate',     (SELECT a.bonus_ate FROM treino.assinaturas a WHERE a.professional_id = (SELECT auth.uid()))
  );
$$;
REVOKE ALL ON FUNCTION treino.minhas_indicacoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.minhas_indicacoes() TO authenticated;

-- ----- 7. versões dos documentos -----
INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('termos', '1.3'),
  ('privacidade', '1.8')
ON CONFLICT DO NOTHING;

COMMIT;
