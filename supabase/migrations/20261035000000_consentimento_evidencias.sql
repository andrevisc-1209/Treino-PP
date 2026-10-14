-- ============================================================
-- Migration: 20261035000000_consentimento_evidencias.sql
--
-- Evidência de auditoria do aceite do aluno pelo link (LGPD, Art. 11, I): o IP do aparelho no momento
-- do clique. Data/hora e versão do termo JÁ são gravadas em treino.consentimentos (consented_at e
-- consent_version) a cada aceite — só faltava o IP.
--
-- Por que uma tabela à parte e não colunas em treino.alunos/consentimentos:
--  * o personal lê essas duas tabelas inteiras pelo app (RLS por professional_id) — o IP do aluno não
--    deve chegar a ele;
--  * esta tabela é só da plataforma: RLS ligado, SEM policy e SEM grant para anon/authenticated (mesmo
--    padrão de treino.consentimento_saude_tokens). Quem grava é a Edge Function confirmar-consentimento-saude
--    (service_role) e a leitura é pelo SQL Editor, para atender uma requisição de titular ou da ANPD.
--
-- Sem backfill: os aceites anteriores a esta migration ficam sem IP (não há como saber, e preencher com
-- valor aproximado seria fabricar prova). consented_at e consent_version deles continuam os reais.
-- Idempotente.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS treino.consentimento_evidencias (
  consentimento_id UUID PRIMARY KEY REFERENCES treino.consentimentos(id) ON DELETE CASCADE,
  ip               TEXT NULL CHECK (char_length(ip) <= 45),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE treino.consentimento_evidencias IS
  'Evidência do aceite do aluno pelo link: IP do aparelho. Só service_role (Edge Function); o personal não lê.';
COMMENT ON COLUMN treino.consentimento_evidencias.ip IS
  'IP do aparelho no clique em "Confirmar autorização" (cf-connecting-ip / x-forwarded-for); NULL se a requisição não trouxe IP válido.';

ALTER TABLE treino.consentimento_evidencias ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON treino.consentimento_evidencias FROM PUBLIC, anon, authenticated;
GRANT ALL ON treino.consentimento_evidencias TO service_role;

COMMIT;
