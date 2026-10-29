-- Confere (só leitura, não grava nada) se o service_role, usado pela Edge Function agenda-publica, consegue ler e gravar as tabelas da agenda.
-- Rode DEPOIS da migration 20261091. Esperado: tudo "true".
SELECT t.tabela,
       has_table_privilege('service_role', 'treino.' || t.tabela, 'SELECT') AS le,
       has_table_privilege('service_role', 'treino.' || t.tabela, 'INSERT') AS grava
FROM (VALUES ('disponibilidade_semanal'), ('agenda_bloqueios'), ('pedidos_agenda')) AS t(tabela);
