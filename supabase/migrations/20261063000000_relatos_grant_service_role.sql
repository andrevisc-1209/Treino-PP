-- ============================================================
-- Migration: 20261063000000_relatos_grant_service_role.sql
--
-- A Edge Function `avisar-relato` (service_role) falhava com "permission denied for table relatos": a migration 20261060 tirou os
-- privilégios padrão e deu GRANT só ao `authenticated`. O service_role ignora RLS, mas precisa do GRANT de tabela. Só leitura:
-- a função apenas lê o relato (tipo e nome do personal) para montar o aviso.
-- Reversão: REVOKE SELECT ON treino.relatos FROM service_role;
-- ============================================================

GRANT SELECT ON treino.relatos TO service_role;
