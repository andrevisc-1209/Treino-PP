-- ============================================================
-- Migration: 20261091000000_agenda_grants_service_role.sql
--
-- Correção: a Edge Function "agenda-publica" (service_role) lê a disponibilidade e os bloqueios do personal e grava os pedidos de aula,
-- mas as migrations 20261087, 20261088 e 20261089 deram GRANT só ao authenticated. As tabelas novas do schema treino NÃO herdam acesso do
-- service_role (a 20261044 tirou os privilégios padrão), então a função levava "permission denied", ignorava o erro e mostrava
-- "não há horários livres" na página pública (e o envio de um pedido também falharia).
-- Padrão do projeto: GRANT ALL ao service_role em cada tabela que uma Edge Function usa (ver 20261021, 20261023, 20261037).
-- Reversão: REVOKE ALL ON treino.disponibilidade_semanal, treino.agenda_bloqueios, treino.pedidos_agenda FROM service_role;
-- ============================================================

BEGIN;

GRANT ALL ON treino.disponibilidade_semanal TO service_role;
GRANT ALL ON treino.agenda_bloqueios TO service_role;
GRANT ALL ON treino.pedidos_agenda TO service_role;

COMMIT;
