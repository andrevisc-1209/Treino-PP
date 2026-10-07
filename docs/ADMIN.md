# Painel administrativo (`/admin`)

Rota escondida — nunca aparece no bottom nav, só acessível por URL direta, e só
pra quem tem `is_admin = true` em `treino.professionals`. Mostra dados
administrativos (personal, e-mail, assinatura, cidade do cadastro) e números
agregados — **nunca** dados de aluno (treinos, peso, saúde).

## 1. Criar a conta do admin

Não existe um passo automático pra isso (e de propósito: não crio a conta
rodando `INSERT` em `auth.users`, nem vejo sua senha). Rode localmente:

```bash
SUPABASE_URL=https://SEU-PROJETO.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key \
node scripts/admin-convite.mjs contato@personalperto.com.br
```

A `service_role` key fica só na sua máquina, na hora de rodar — não é lida de
nenhum arquivo do repo e não é commitada em lugar nenhum. O script manda um
e-mail de convite pro endereço informado; o link leva pra `/definir-senha`,
onde você escolhe a senha.

## 2. Marcar a conta como admin

Depois que o convite foi aceito (ou mesmo antes — a migration não falha se a
conta ainda não existir, só não marca nada), rode no **Supabase SQL Editor**:

```
supabase/migrations/20261007000000_admin_role.sql
```

Isso adiciona a coluna `is_admin`, marca `true` pra
`contato@personalperto.com.br`, cria a tabela `treino.admin_logs` e as
functions `SECURITY DEFINER` que o painel usa
(`admin_resumo`, `admin_listar_personais`, `admin_regioes`,
`admin_alterar_trial`, `admin_alterar_plano`, `treino.is_admin()`).

## 3. Implantar a Edge Function (reset de senha)

A única ação do painel que precisa de `service_role` é gerar o link de reset
de senha (via `supabase.auth.admin.generateLink` — a Admin API não tem
equivalente em SQL comum). Fica em `supabase/functions/admin-actions/`.

```bash
supabase functions deploy admin-actions
```

Não precisa configurar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` como secret
— o Supabase já injeta essas duas automaticamente no ambiente de toda Edge
Function.

## O que cada ação faz

- **Reset de senha**: gera um link de recuperação (válido por um tempo
  limitado, definido no projeto) e mostra na tela pra copiar. Não manda
  e-mail sozinho — `generateLink` só gera o link, quem decide como entregar é
  o admin (copiar e mandar por WhatsApp, por exemplo).
- **Alterar trial**: muda `trial_fim` e volta o `status` pra `trial` (dá pra
  reabrir o trial de quem já expirou).
- **Alterar plano**: muda `assinatura_fim`, `plano` e põe `status = 'ativa'`.
- Toda alteração de trial/plano fica registrada em `treino.admin_logs`
  (quem fez, quando, antes/depois).

## O que o admin NÃO vê

Por desenho: nenhuma function do painel faz `SELECT` em `treino.alunos`, nem
em tabelas de treino/sessão/peso. A contagem "Total de alunos" é só
`COUNT(*)`, agregada dentro da function — nunca uma linha de aluno sai do
banco pro cliente do admin.

## Login redireciona direto pro painel

Contas com `is_admin = true` são redirecionadas pra `/admin` automaticamente
sempre que logam (ou sempre que abrem o app já logadas) — não ficam vendo a
home de personal (Hoje/Agenda/bottom nav). Isso é checado em
`RequireAuth.tsx`, que é o ponto de entrada de toda a parte "normal" do app.

## Corrigir CPF pelo painel

`treino.professionals` tem um trigger (`tg_bloquear_cpf`) que impede qualquer
`UPDATE` de CPF depois do primeiro preenchimento — proteção pedida numa PR
anterior, que vale até pra admin. A migration
`20261008000000_admin_alterar_cpf.sql` abre uma exceção controlada: só a
function `treino.admin_alterar_cpf` (que já checa `is_admin()` antes de
qualquer coisa) consegue passar por ela, ligando uma configuração de sessão
que o trigger reconhece — nenhum outro caminho (nem outro `UPDATE` direto)
consegue burlar a trava.

## Cidade

A cidade dos personais vem do cadastro (`professionals.cidade` / `uf`, exibida como "Niterói/RJ").
O agrupamento é por UF + cidade. Só quem se cadastrou depois da PR de Cidade/UF (ou preencheu em
Configurações) aparece; os demais ficam sem cidade (`—`). `professional_config.pix_cidade` foi
removida: o QR Pix também usa a cidade do cadastro.

## Consentimentos LGPD (saúde) por personal

Seção **"Consentimentos LGPD (saúde)"** do painel (entre "Personais" e "Cidades"): para cada personal, total de
alunos e quantos estão **confirmados / pendentes / negados / não solicitados**, com busca por nome/e-mail do personal
e filtro por status. Função: `treino.admin_consentimentos_saude()` (migration
`20261017000000_admin_consentimentos_saude.sql`, `SECURITY DEFINER` + `is_admin()`).

**Só números agregados.** Não há lista de alunos nessa seção (nome, canal, datas individuais): a regra do projeto é o
admin não ver dados de alunos. A visão por aluno continua sendo do próprio personal, em Configurações → Consentimentos LGPD.
