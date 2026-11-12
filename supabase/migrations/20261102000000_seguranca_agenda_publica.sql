-- ============================================================
-- Segurança da agenda pública (revisão manual de 12/11/2026, lote 2) — docs/SECURITY-AUDIT.md
--
--   1. Links novos com sufixo de 8 caracteres hex (eram 4: só 65 mil combinações, fácil de varrer). Os links já existentes continuam
--      valendo; "Trocar o link" gera um novo no formato longo.
--   2. treino.limite_atingido(chave, máx, janela): LEITURA do contador de limite, sem somar. A Edge Function "agenda-publica" usa para
--      barrar de vez o IP que errou muitos links (varredura), sem punir quem só acessa links certos.
--   3. treino.criar_pedido_agenda(...): grava o pedido do visitante com o teto de pendentes conferido DENTRO da mesma transação
--      (trava por personal), no lugar de "contar e depois inserir" no Edge Function (duas chamadas juntas furavam o teto).
--   4. treino.expirar_pedidos_agenda(): pedido pendente há mais de 7 dias, ou cujo horário já passou, vira "indisponivel" (aparece em
--      "Recusados"). Libera a fila que um concorrente poderia encher. Agendar com supabase/cron/expirar_pedidos_agenda.sql.
-- As três funções novas são SÓ do service_role. Sem dado novo coletado.
-- Reversão: DROP FUNCTION treino.limite_atingido(TEXT, INT, INT); DROP FUNCTION treino.criar_pedido_agenda(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, INT);
--           DROP FUNCTION treino.expirar_pedidos_agenda(); e recriar configurar_agenda_publica pela migration 20261089000000.
-- ============================================================

BEGIN;

-- 1. slug de 8 caracteres (mesma função, só o sufixo muda; as permissões continuam)
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
      v_slug := v_base || '-' || substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 8);
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

-- 2. lê o contador sem somar: true = o limite da janela já foi atingido
CREATE OR REPLACE FUNCTION treino.limite_atingido(p_key TEXT, p_max INT, p_window_seconds INT DEFAULT 3600)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT r.count >= p_max FROM treino.rate_limit r
                   WHERE r.key = p_key AND r.window_start >= now() - make_interval(secs => p_window_seconds)), FALSE);
$$;

REVOKE ALL ON FUNCTION treino.limite_atingido(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION treino.limite_atingido(TEXT, INT, INT) TO service_role;

-- 3. pedido com teto de pendentes atômico. Devolve {"estado":"ok","id":…} | {"estado":"cheio"} | {"estado":"duplicado"}
CREATE OR REPLACE FUNCTION treino.criar_pedido_agenda(
  p_professional_id UUID, p_nome TEXT, p_telefone TEXT, p_mensagem TEXT, p_local TEXT, p_modalidade TEXT,
  p_inicio TIMESTAMPTZ, p_duracao INT, p_max_pendentes INT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_n INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('criar_pedido_agenda:' || p_professional_id::TEXT, 0));

  SELECT count(*) INTO v_n FROM treino.pedidos_agenda WHERE professional_id = p_professional_id AND status = 'pendente';
  IF v_n >= p_max_pendentes THEN
    RETURN jsonb_build_object('estado', 'cheio');
  END IF;

  BEGIN
    INSERT INTO treino.pedidos_agenda (professional_id, visitante_nome, visitante_telefone, mensagem, local_escolhido, modalidade, inicio, duracao_min)
    VALUES (p_professional_id, p_nome, p_telefone, p_mensagem, p_local, p_modalidade, p_inicio, p_duracao)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('estado', 'duplicado');
  END;

  RETURN jsonb_build_object('estado', 'ok', 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION treino.criar_pedido_agenda(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION treino.criar_pedido_agenda(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, INT) TO service_role;

-- 4. expiração dos pedidos sem resposta. Devolve quantos expiraram.
CREATE OR REPLACE FUNCTION treino.expirar_pedidos_agenda()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_n INT;
BEGIN
  UPDATE treino.pedidos_agenda SET status = 'indisponivel', respondido_em = now()
  WHERE status = 'pendente' AND (created_at < now() - interval '7 days' OR inicio < now());
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION treino.expirar_pedidos_agenda() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION treino.expirar_pedidos_agenda() TO service_role;

COMMIT;
