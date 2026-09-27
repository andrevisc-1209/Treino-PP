# Treino-PP · regras do projeto

## Contexto
- App do personal trainer (feature do Personal Perto): alunos, agenda, treinos,
  evolução e financeiro. Uso principal no celular, na academia, com pressa e sinal ruim.
- Stack: React + Vite + TS + Tailwind v4 + React Router + TanStack Query +
  React Hook Form/Zod + Supabase (schema "treino", RLS) + PWA. Publicado no GitHub
  Pages com base '/Treino-PP/'.
- Documentos de referência: docs/BACKLOG.md (backlog e decisões), docs/BRAND.md
  (identidade), docs/ux-audit/RELATORIO.md (auditoria de UX), docs/email-templates/
  (e-mails do Supabase).

## Idioma
- Interface, commits, PRs e documentação em português.

## Git
- Sempre partir da main atualizada (git checkout main && git pull).
- Uma branch por tarefa; PR com base main, pronta para aprovação de merge.
- Nunca abrir PR em cima de outra branch de feature.

## Banco de dados
- NUNCA editar migrations existentes.
- Mudança de banco = nova migration em supabase/migrations/ e aviso em destaque na PR:
  "Rodar a migration no SQL Editor ANTES do merge".
- Nunca aplicar migration por conta própria.

## Segurança
- Nunca usar nem pedir service_role/secret key; nunca commitar chaves ou senhas
  (.env e e2e/.env.e2e ficam no .gitignore).
- Chaves de serviços externos (Mercado Pago, WhatsApp, SMTP) só em Supabase Secrets,
  usadas por Edge Functions; nunca no front.
- O cadastro de personal é ABERTO, com confirmação de e-mail e captcha. Isolamento
  entre personais é garantido por RLS: toda tabela nova precisa de RLS com
  (SELECT auth.uid()), USING e WITH CHECK, e GRANT só para authenticated.

## Testes
- Testes ao vivo e E2E usam SOMENTE a conta de teste fixa definida em e2e/.env.e2e.
  Não criar contas descartáveis via signup (poluem a base e ficam órfãs em auth.users).
  Se a conta fixa não estiver configurada, pare e peça antes de testar.
- Todo dado de teste leva o prefixo "[E2E]" no nome e é apagado ao final
  (npm run e2e:clean).
- Antes de abrir a PR: npm run build, npm run test e lint limpos; validar ao vivo a
  390px. Reportar com honestidade o que não foi testado.

## Privacidade (LGPD)
- Dados de saúde (lesão, cirurgia, medicamentos, prontidão/bem-estar) nunca aparecem em
  mensagens de WhatsApp, e-mails, área de admin ou logs.
- Área de admin vê só dados do personal e números agregados, nunca dados de alunos.

## UX
- Mobile-first, alvos de toque ≥ 44px, contraste AA (teste de contraste deve passar).
- Datas dd/mm/aaaa, números com vírgula, fuso America/Sao_Paulo (src/lib/datas.ts e
  src/lib/format.ts).
- Nada de confirm() nativo: usar ConfirmSheet ou toast com "Desfazer".
- Vocabulário: Aula (agenda), Treino (lista de exercícios), Treino planejado (modelo
  reutilizável), Prontidão (antes do treino), Personal (nunca "professor" na interface).

## Backlog
- Ao final de cada tarefa, atualizar o status dos itens em docs/BACKLOG.md na mesma PR.
