-- ============================================================
-- Migration: 20261089000000_agenda_publica.sql
--
-- Agenda, fase 2 (parte 1): página pública de pedido de aula, por link aberto, com aprovação do personal.
--   professional_config.agenda_publica_ativa : chave "aceitar pedidos pelo link" (DESLIGADA por padrão);
--   professional_config.agenda_publica_slug  : parte final do link, gerada do nome com um sufixo aleatório (único); "trocar link" gera outro;
--   treino.configurar_agenda_publica()       : liga/desliga e gera ou troca o link (SECURITY INVOKER: a RLS vale);
--   treino.pedidos_agenda                    : o pedido do visitante (nome, telefone, mensagem curta e o horário pedido). Só a Edge Function
--                                              "agenda-publica" insere (service_role); o personal lê e responde (status) pela RLS.
-- Dados de VISITANTES (ainda não alunos): o personal é o controlador; a administração nunca os vê (as funções admin_* não os leem).
-- Pedido que não virou aula é apagado depois de 30 dias (job: supabase/cron/pedidos_agenda.sql, rodar UMA vez no SQL Editor).
-- Também registra a Política de Privacidade 1.12 em treino.documentos_versoes (o servidor só aceita versões listadas ali).
-- Reversão: DROP FUNCTION treino.configurar_agenda_publica(BOOLEAN, BOOLEAN); DROP TABLE treino.pedidos_agenda;
--           ALTER TABLE treino.professional_config DROP COLUMN agenda_publica_ativa, DROP COLUMN agenda_publica_slug;
-- ============================================================

BEGIN;

ALTER TABLE treino.professional_config
  ADD COLUMN agenda_publica_ativa BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN agenda_publica_slug  TEXT NULL CHECK (agenda_publica_slug IS NULL OR agenda_publica_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

CREATE UNIQUE INDEX uq_agenda_publica_slug ON treino.professional_config(agenda_publica_slug) WHERE agenda_publica_slug IS NOT NULL;

-- Liga ou desliga a página pública e, se ainda não há link (ou se p_trocar_link), gera um novo: "andre-scherer-4f2k".
CREATE OR REPLACE FUNCTION treino.configurar_agenda_publica(p_ativa BOOLEAN, p_trocar_link BOOLEAN DEFAULT FALSE)
RETURNS TEXT
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_slug TEXT;
  v_base TEXT;
  v_tentativas INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO treino.professional_config (professional_id) VALUES (v_uid) ON CONFLICT (professional_id) DO NOTHING;
  SELECT agenda_publica_slug INTO v_slug FROM treino.professional_config WHERE professional_id = v_uid;

  IF p_ativa AND (v_slug IS NULL OR COALESCE(p_trocar_link, FALSE)) THEN
    SELECT COALESCE(NULLIF(left(trim(both '-' FROM regexp_replace(
             lower(translate(COALESCE(name, ''), 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
             '[^a-z0-9]+', '-', 'g')), 24), ''), 'agenda')
    INTO v_base FROM treino.professionals WHERE id = v_uid;
    v_base := trim(both '-' FROM v_base);
    LOOP
      v_slug := v_base || '-' || substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 4);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM treino.professional_config WHERE agenda_publica_slug = v_slug);
      v_tentativas := v_tentativas + 1;
      IF v_tentativas > 20 THEN
        RAISE EXCEPTION 'Não foi possível gerar o link. Tente de novo.' USING ERRCODE = '55000';
      END IF;
    END LOOP;
  END IF;

  UPDATE treino.professional_config SET agenda_publica_ativa = p_ativa, agenda_publica_slug = v_slug WHERE professional_id = v_uid;
  RETURN v_slug;
END;
$$;

REVOKE ALL ON FUNCTION treino.configurar_agenda_publica(BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.configurar_agenda_publica(BOOLEAN, BOOLEAN) TO authenticated;

CREATE TABLE treino.pedidos_agenda (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id     UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  visitante_nome      TEXT NOT NULL CHECK (char_length(visitante_nome) BETWEEN 2 AND 80),
  visitante_telefone  TEXT NOT NULL CHECK (visitante_telefone ~ '^[0-9]{10,13}$'),
  mensagem            TEXT NULL CHECK (mensagem IS NULL OR char_length(mensagem) <= 140),
  inicio              TIMESTAMPTZ NOT NULL,
  duracao_min         INTEGER NOT NULL CHECK (duracao_min > 0),
  status              TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'indisponivel')),
  aluno_id            UUID NULL REFERENCES treino.alunos(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondido_em       TIMESTAMPTZ NULL
);

-- o mesmo visitante não pede o mesmo horário duas vezes enquanto o pedido está pendente
CREATE UNIQUE INDEX uq_pedido_agenda_pendente ON treino.pedidos_agenda(professional_id, visitante_telefone, inicio) WHERE status = 'pendente';
CREATE INDEX idx_pedidos_agenda_prof ON treino.pedidos_agenda(professional_id, status, created_at DESC);

ALTER TABLE treino.pedidos_agenda ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE, DELETE ON treino.pedidos_agenda TO authenticated;

CREATE POLICY pedidos_agenda_own ON treino.pedidos_agenda
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid())
              AND (aluno_id IS NULL OR aluno_id IN (SELECT a.id FROM treino.alunos a)));

-- responder (UPDATE) sem assinatura ativa não vale; ler e apagar continuam liberados
CREATE POLICY assinatura_ativa_update ON treino.pedidos_agenda
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true) WITH CHECK ((SELECT treino.assinatura_ativa()));

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.12')
ON CONFLICT DO NOTHING;

COMMIT;
