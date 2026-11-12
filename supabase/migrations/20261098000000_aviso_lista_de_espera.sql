-- ============================================================
-- Aviso ao personal quando alguém entra na lista de espera (plano pós-auditoria de UX, PR 2)
--
--   * notificacoes_professor aceita o tipo 'espera_agenda' (o sino do app), sem aluno;
--   * treino.avisar_espera_agenda(p_professional_id): AGRUPA. Se já há um aviso de espera NÃO LIDO desse personal, soma 1 ao contador
--     e sobe o aviso para o topo; senão cria um novo com contador 1. Assim 5 pessoas na espera viram "5 pessoas", não 5 avisos.
--   * O payload guarda só { qtd }. Nome, telefone, dia e turno do visitante NÃO vão no aviso (ficam só em lista_espera_agenda).
--   * Só a Edge Function "agenda-publica" (service_role) executa a função. Não há WhatsApp para este aviso: é só o sino.
-- Reversão: DROP FUNCTION treino.avisar_espera_agenda(UUID); DELETE FROM treino.notificacoes_professor WHERE tipo = 'espera_agenda';
--           e restaurar as constraints de 20261090 sem 'espera_agenda'.
-- ============================================================

BEGIN;

ALTER TABLE treino.notificacoes_professor DROP CONSTRAINT IF EXISTS notificacoes_professor_tipo_check;
ALTER TABLE treino.notificacoes_professor
  ADD CONSTRAINT notificacoes_professor_tipo_check CHECK (tipo IN ('treino_concluido', 'ciclo_encerrado', 'indicacao_concedida', 'pedido_aula', 'espera_agenda'));

ALTER TABLE treino.notificacoes_professor DROP CONSTRAINT IF EXISTS notificacoes_professor_aluno_conforme_tipo;
ALTER TABLE treino.notificacoes_professor
  ADD CONSTRAINT notificacoes_professor_aluno_conforme_tipo CHECK (tipo IN ('indicacao_concedida', 'pedido_aula', 'espera_agenda') OR aluno_id IS NOT NULL);

CREATE OR REPLACE FUNCTION treino.avisar_espera_agenda(p_professional_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- serializa por personal: duas entradas ao mesmo tempo não criam dois avisos
  PERFORM pg_advisory_xact_lock(hashtextextended('espera_agenda:' || p_professional_id::text, 0));

  SELECT n.id INTO v_id
  FROM treino.notificacoes_professor n
  WHERE n.professional_id = p_professional_id AND n.tipo = 'espera_agenda' AND n.lida = FALSE
  ORDER BY n.criada_em DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO treino.notificacoes_professor (professional_id, tipo, payload)
    VALUES (p_professional_id, 'espera_agenda', jsonb_build_object('qtd', 1));
  ELSE
    UPDATE treino.notificacoes_professor
    SET payload = jsonb_build_object('qtd', COALESCE((payload->>'qtd')::int, 1) + 1),
        criada_em = now()
    WHERE id = v_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION treino.avisar_espera_agenda(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION treino.avisar_espera_agenda(UUID) TO service_role;

COMMIT;
