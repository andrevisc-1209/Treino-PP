-- ============================================================
-- Migration: 20261093000000_agenda_publica_resumo.sql
--
-- Agenda, fase 2 (parte 3): números da página pública.
--   treino.resumo_agenda_publica()        : para o PERSONAL (SECURITY INVOKER, a RLS vale): pedidos dos últimos 7 dias, pedidos aguardando
--                                           resposta, aprovados em 30 dias, tempo mediano de resposta e aulas já realizadas que vieram do link.
--   treino.admin_agenda_publica_resumo()  : para o ADMIN (SECURITY DEFINER, exige is_admin() com MFA): só TOTAIS (quantos personais usam a
--                                           página, quantos pedidos, aprovados, aulas realizadas, tempo mediano). Nenhum nome, telefone, mensagem
--                                           nem id de visitante ou de aluno sai desta função.
-- Também registra a Política de Privacidade 1.13 (deixa claro que a administração vê só totais dos pedidos).
-- Os pedidos que não viraram aula são apagados em 30 dias (supabase/cron/pedidos_agenda.sql); por isso as janelas são de 7 e 30 dias.
-- Reversão: DROP FUNCTION treino.resumo_agenda_publica(); DROP FUNCTION treino.admin_agenda_publica_resumo();
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION treino.resumo_agenda_publica()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'pedidos_7d',   count(*) FILTER (WHERE p.created_at >= now() - interval '7 days'),
    'pendentes',    count(*) FILTER (WHERE p.status = 'pendente'),
    'aprovados_30d', count(*) FILTER (WHERE p.status = 'aprovado' AND p.created_at >= now() - interval '30 days'),
    'mediana_resposta_min', (
      percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (p.respondido_em - p.created_at)) / 60)
        FILTER (WHERE p.status IN ('aprovado', 'recusado') AND p.respondido_em IS NOT NULL AND p.created_at >= now() - interval '30 days')
    ),
    'aulas_realizadas', count(*) FILTER (WHERE p.aula_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM treino.aulas a WHERE a.id = p.aula_id AND a.status = 'realizada'
    ))
  )
  FROM treino.pedidos_agenda p
  WHERE p.professional_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION treino.resumo_agenda_publica() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.resumo_agenda_publica() TO authenticated;

CREATE OR REPLACE FUNCTION treino.admin_agenda_publica_resumo()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT treino.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao admin.' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'personais_com_pagina', (
      SELECT count(*) FROM treino.professional_config c
      JOIN treino.professionals pr ON pr.id = c.professional_id
      WHERE c.agenda_publica_ativa AND pr.is_admin = FALSE
    ),
    'personais_com_pedidos_30d', (SELECT count(DISTINCT p.professional_id) FROM treino.pedidos_agenda p WHERE p.created_at >= now() - interval '30 days'),
    'pedidos_7d',      (SELECT count(*) FROM treino.pedidos_agenda p WHERE p.created_at >= now() - interval '7 days'),
    'pedidos_30d',     (SELECT count(*) FROM treino.pedidos_agenda p WHERE p.created_at >= now() - interval '30 days'),
    'aprovados_30d',   (SELECT count(*) FROM treino.pedidos_agenda p WHERE p.status = 'aprovado' AND p.created_at >= now() - interval '30 days'),
    'respondidos_30d', (SELECT count(*) FROM treino.pedidos_agenda p WHERE p.status <> 'pendente' AND p.created_at >= now() - interval '30 days'),
    'mediana_resposta_min', (
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (p.respondido_em - p.created_at)) / 60)
      FROM treino.pedidos_agenda p
      WHERE p.status IN ('aprovado', 'recusado') AND p.respondido_em IS NOT NULL AND p.created_at >= now() - interval '30 days'
    ),
    'aulas_realizadas', (
      SELECT count(*) FROM treino.pedidos_agenda p
      JOIN treino.aulas a ON a.id = p.aula_id
      WHERE a.status = 'realizada'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION treino.admin_agenda_publica_resumo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION treino.admin_agenda_publica_resumo() TO authenticated;

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.13')
ON CONFLICT DO NOTHING;

COMMIT;
