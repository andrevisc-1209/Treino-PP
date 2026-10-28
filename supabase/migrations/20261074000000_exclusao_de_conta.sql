-- ============================================================
-- Migration: 20261074000000_exclusao_de_conta.sql
--
-- Exclusão de conta pelo próprio personal, dentro do app (LGPD, art. 18, VI), com carência de 30 dias:
--   no ato:  a conta é bloqueada (modo leitura no banco + o app só mostra a tela de "conta em exclusão"), os avisos por WhatsApp são
--            desligados e as sessões são invalidadas (Edge Function `excluir-conta`); sai um protocolo.
--   30 dias: job diário (pg_cron) apaga DE VERDADE tudo do personal: dados pessoais, alunos, treinos, fichas, avaliações, agenda,
--            faturas dos alunos e o usuário do login. Até lá o personal pode CANCELAR entrando no app.
--   retido:  só o livro dos pagamentos do plano que o personal fez ao Treino PP (valor, data, plano, id do pagamento), por 5 anos
--            (obrigação fiscal/contábil), SEM vínculo com nome, CPF ou e-mail: fica só um identificador anônimo (titular_anonimo).
--            Logs de auditoria do admin perdem o vínculo com a conta e o campo `detalhes` (que guarda e-mail/CPF) é apagado.
--            A solicitação (protocolo, datas, status) fica registrada, sem dado pessoal, como prova do atendimento.
-- Diferenças em relação ao rascunho do pedido: a tabela de personais é treino.professionals (não "personais"); os alunos são APAGADOS
-- (não anonimizados): o personal é o controlador deles e o app é operador, então não há por que guardar; o prazo é de carência com
-- cancelamento (status 'cancelled' tem uso real); o job é SQL (pg_cron), no padrão da lixeira de alunos, sem Edge Function agendada.
--
-- Também: indicacoes.indicado_id e pagamentos_assinatura.professional_id passam a ser opcionais (ON DELETE SET NULL) para a linha
-- sobreviver sem identificar ninguém (o teto de meses grátis do indicador não "volta" se o indicado apagar a conta).
-- Rollback: DROP das funções novas; DROP TABLE treino.deletion_requests; restaurar assinatura_ativa() da migration 20261069.
-- ============================================================

BEGIN;

-- ----- 1. solicitações -----
CREATE OR REPLACE FUNCTION treino.novo_protocolo_exclusao()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  alfabeto CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v TEXT;
  i INT;
BEGIN
  LOOP
    v := 'EXC-' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY') || '-';
    FOR i IN 1..8 LOOP
      v := v || substr(alfabeto, 1 + floor(random() * 32)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM treino.deletion_requests WHERE protocol = v);
  END LOOP;
  RETURN v;
END;
$$;

CREATE TABLE IF NOT EXISTS treino.deletion_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id           UUID NULL REFERENCES treino.professionals(id) ON DELETE SET NULL, -- NULL depois de concluída
  protocol              TEXT NOT NULL UNIQUE CHECK (protocol ~ '^EXC-[0-9]{4}-[A-HJ-NP-Z2-9]{8}$'),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for         TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  completed_at          TIMESTAMPTZ NULL,
  cancelled_at          TIMESTAMPTZ NULL,
  whatsapp_opt_in_antes BOOLEAN NOT NULL DEFAULT FALSE, -- para restaurar se o personal cancelar
  id_anonimo            UUID NOT NULL DEFAULT gen_random_uuid(), -- identificador que liga os pagamentos retidos, sem identificar ninguém
  erro                  TEXT NULL CHECK (char_length(erro) <= 200)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_deletion_requests_pendente ON treino.deletion_requests (personal_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_deletion_requests_vencimento ON treino.deletion_requests (scheduled_for) WHERE status = 'pending';
ALTER TABLE treino.deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treino.deletion_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON treino.deletion_requests TO service_role;
-- sem policy: o cliente só usa as RPCs abaixo

-- ----- 2. o que sobrevive sem identificar ninguém -----
ALTER TABLE treino.pagamentos_assinatura DROP CONSTRAINT IF EXISTS pagamentos_assinatura_professional_id_fkey;
ALTER TABLE treino.pagamentos_assinatura ALTER COLUMN professional_id DROP NOT NULL;
ALTER TABLE treino.pagamentos_assinatura
  ADD CONSTRAINT pagamentos_assinatura_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES treino.professionals(id) ON DELETE SET NULL;
ALTER TABLE treino.pagamentos_assinatura ADD COLUMN IF NOT EXISTS titular_anonimo UUID NULL;

ALTER TABLE treino.indicacoes DROP CONSTRAINT IF EXISTS indicacoes_indicado_id_fkey;
ALTER TABLE treino.indicacoes ALTER COLUMN indicado_id DROP NOT NULL;
ALTER TABLE treino.indicacoes
  ADD CONSTRAINT indicacoes_indicado_id_fkey FOREIGN KEY (indicado_id) REFERENCES treino.professionals(id) ON DELETE SET NULL;

-- ----- 3. conta em exclusão = modo leitura no banco (mesma trava da assinatura vencida) -----
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
      AND NOT EXISTS (SELECT 1 FROM treino.deletion_requests d WHERE d.personal_id = a.professional_id AND d.status = 'pending')
  );
$$;
REVOKE ALL ON FUNCTION treino.assinatura_ativa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.assinatura_ativa() TO authenticated;

-- ----- 4. RPCs do personal -----
CREATE OR REPLACE FUNCTION treino.solicitar_exclusao_conta(p_confirmacao TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_req treino.deletion_requests%ROWTYPE;
  v_wpp BOOLEAN;
  v_existia BOOLEAN := TRUE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = 'P0001'; END IF;
  IF upper(btrim(coalesce(p_confirmacao, ''))) <> 'EXCLUIR' THEN
    RAISE EXCEPTION 'Digite EXCLUIR para confirmar.' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT is_admin FROM treino.professionals WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Contas de administrador não são excluídas por aqui.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_req FROM treino.deletion_requests WHERE personal_id = v_uid AND status = 'pending';
  IF NOT FOUND THEN
    v_existia := FALSE;
    SELECT whatsapp_opt_in INTO v_wpp FROM treino.professionals WHERE id = v_uid;
    INSERT INTO treino.deletion_requests (personal_id, protocol, whatsapp_opt_in_antes)
    VALUES (v_uid, treino.novo_protocolo_exclusao(), coalesce(v_wpp, FALSE))
    RETURNING * INTO v_req;
    UPDATE treino.professionals SET whatsapp_opt_in = FALSE WHERE id = v_uid; -- nenhum aviso automático durante a carência
  END IF;

  RETURN jsonb_build_object('protocolo', v_req.protocol, 'solicitada_em', v_req.requested_at, 'prevista_em', v_req.scheduled_for, 'ja_existia', v_existia);
END;
$$;
REVOKE ALL ON FUNCTION treino.solicitar_exclusao_conta(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.solicitar_exclusao_conta(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION treino.cancelar_exclusao_conta()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_req treino.deletion_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = 'P0001'; END IF;
  UPDATE treino.deletion_requests SET status = 'cancelled', cancelled_at = now()
  WHERE personal_id = v_uid AND status = 'pending' RETURNING * INTO v_req;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  UPDATE treino.professionals SET whatsapp_opt_in = v_req.whatsapp_opt_in_antes WHERE id = v_uid;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION treino.cancelar_exclusao_conta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.cancelar_exclusao_conta() TO authenticated;

CREATE OR REPLACE FUNCTION treino.minha_exclusao()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object('protocolo', d.protocol, 'solicitada_em', d.requested_at, 'prevista_em', d.scheduled_for)
  FROM treino.deletion_requests d
  WHERE d.personal_id = (SELECT auth.uid()) AND d.status = 'pending';
$$;
REVOKE ALL ON FUNCTION treino.minha_exclusao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.minha_exclusao() TO authenticated;

-- ----- 5. a execução (só o job; nunca o cliente) -----
CREATE OR REPLACE FUNCTION treino.executar_exclusao(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req treino.deletion_requests%ROWTYPE;
  v_p UUID;
  v_cpf TEXT;
BEGIN
  SELECT * INTO v_req FROM treino.deletion_requests WHERE id = p_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  v_p := v_req.personal_id;

  IF v_p IS NOT NULL THEN
    SELECT cpf INTO v_cpf FROM treino.professionals WHERE id = v_p;

    -- retido por obrigação legal, sem vínculo com a pessoa
    UPDATE treino.pagamentos_assinatura SET titular_anonimo = v_req.id_anonimo, professional_id = NULL WHERE professional_id = v_p;
    -- auditoria do admin: perde o vínculo (FK SET NULL) e o antes/depois (e-mail, CPF)
    UPDATE treino.admin_logs SET detalhes = NULL WHERE target_professional_id = v_p;
    -- chaves de controle de limite que contêm o CPF
    IF v_cpf IS NOT NULL THEN
      DELETE FROM treino.rate_limit WHERE key IN ('login-cpf:cpf:' || v_cpf, 'recuperar-senha:cpf:' || v_cpf);
    END IF;

    -- ligações para exercicios SEM cascata: saem antes (senão o delete do usuário trava)
    DELETE FROM treino.sessao_exercicios WHERE sessao_id IN (SELECT id FROM treino.sessoes WHERE professional_id = v_p);
    DELETE FROM treino.plano_exercicios WHERE plano_id IN (SELECT id FROM treino.planos WHERE professional_id = v_p);
    DELETE FROM treino.modelo_exercicios WHERE modelo_id IN (SELECT id FROM treino.modelos WHERE professional_id = v_p);

    -- apaga o login; a cascata leva professionals, alunos, treinos, fichas, avaliações, agenda, faturas, consentimentos e o resto
    DELETE FROM auth.users WHERE id = v_p;
  END IF;

  UPDATE treino.deletion_requests SET status = 'completed', completed_at = now(), erro = NULL WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION treino.executar_exclusao(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION treino.finalizar_exclusoes_vencidas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r RECORD;
  v_n INT := 0;
BEGIN
  FOR r IN SELECT id FROM treino.deletion_requests WHERE status = 'pending' AND scheduled_for <= now() ORDER BY scheduled_for LOOP
    BEGIN
      PERFORM treino.executar_exclusao(r.id);
      v_n := v_n + 1;
    EXCEPTION WHEN OTHERS THEN
      -- uma falha não trava a fila: fica registrada (sem dado pessoal) e o job tenta de novo no dia seguinte
      UPDATE treino.deletion_requests SET erro = left(SQLERRM, 200) WHERE id = r.id;
    END;
  END LOOP;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION treino.finalizar_exclusoes_vencidas() FROM PUBLIC, anon, authenticated;

-- ----- 6. painel de indicações: aceita indicado já excluído (linha anônima) -----
CREATE OR REPLACE FUNCTION treino.admin_indicacoes()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH base AS (
      SELECT
        i.id, i.indicador_id, i.indicado_id, i.status, i.indicador_ganhou, i.created_at, i.concedida_em,
        ind.name AS indicador_nome, coalesce(ido.name, 'Conta excluída') AS indicado_nome,
        (ido.id IS NOT NULL
          AND regexp_replace(coalesce(ind.phone, ''), '\D', '', 'g') <> ''
          AND regexp_replace(coalesce(ind.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(ido.phone, ''), '\D', '', 'g')) AS mesmo_telefone,
        (i.concedida_em IS NOT NULL AND ido.created_at IS NOT NULL AND i.concedida_em - ido.created_at < INTERVAL '1 hour') AS concedida_rapida,
        (SELECT count(DISTINCT lower(btrim(a.name))) FROM treino.alunos a WHERE a.professional_id = i.indicado_id AND a.apagado_em IS NULL) AS alunos_do_indicado
      FROM treino.indicacoes i
      JOIN treino.professionals ind ON ind.id = i.indicador_id
      LEFT JOIN treino.professionals ido ON ido.id = i.indicado_id
    ),
    por_indicador AS (
      SELECT
        b.indicador_id,
        max(b.indicador_nome) AS nome,
        count(*) AS indicados,
        count(*) FILTER (WHERE b.status = 'concedida') AS concedidas,
        count(*) FILTER (WHERE b.status = 'revogada') AS revogadas,
        count(*) FILTER (WHERE b.indicador_ganhou) AS meses_ganhos,
        (count(*) FILTER (WHERE b.concedida_em > now() - INTERVAL '24 hours') >= 3) AS varias_em_24h,
        bool_or(b.mesmo_telefone) AS mesmo_telefone,
        bool_or(b.concedida_rapida) AS concedida_rapida
      FROM base b
      GROUP BY b.indicador_id
    )
    SELECT jsonb_build_object(
      'totais', jsonb_build_object(
        'indicacoes', (SELECT count(*) FROM base),
        'pendentes',  (SELECT count(*) FROM base WHERE status = 'pendente'),
        'concedidas', (SELECT count(*) FROM base WHERE status = 'concedida'),
        'revogadas',  (SELECT count(*) FROM base WHERE status = 'revogada'),
        'meses_concedidos', (SELECT count(*) FILTER (WHERE status = 'concedida') + count(*) FILTER (WHERE status = 'concedida' AND indicador_ganhou) FROM base),
        'com_sinal',  (SELECT count(*) FROM base WHERE status = 'concedida' AND (mesmo_telefone OR concedida_rapida))
      ),
      'por_indicador', coalesce((
        SELECT jsonb_agg(to_jsonb(x) ORDER BY x.concedidas DESC, x.indicados DESC)
        FROM (SELECT * FROM por_indicador ORDER BY concedidas DESC, indicados DESC LIMIT 20) x
      ), '[]'::jsonb),
      'recentes', coalesce((
        SELECT jsonb_agg(to_jsonb(y) ORDER BY y.created_at DESC)
        FROM (
          SELECT id, indicador_nome, indicado_nome, status, indicador_ganhou, created_at, concedida_em,
                 alunos_do_indicado, mesmo_telefone, concedida_rapida
          FROM base ORDER BY created_at DESC LIMIT 50
        ) y
      ), '[]'::jsonb)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION treino.admin_indicacoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_indicacoes() TO authenticated;

-- ----- 7. versões dos documentos (Termos 2.8 e Política 5/6 passam a descrever a exclusão) -----
INSERT INTO treino.documentos_versoes (tipo, versao) VALUES ('termos', '1.4'), ('privacidade', '1.9') ON CONFLICT DO NOTHING;

COMMIT;
