# Treino-PP — Assistente do Personal

App do personal trainer para gerenciar alunos e registrar treinos
(pré-treino, exercícios por série, avaliação, PSE) com gráficos de evolução.
Projeto **segregado** do Personal Perto, com a mesma stack e o mesmo padrão
de banco, para permitir integração futura.

## Stack
React + Vite + TypeScript · Tailwind v4 · React Router · TanStack Query ·
React Hook Form + Zod · Supabase (Auth + Postgres schema `treino` + RLS) ·
Recharts · GitHub Pages

## Setup
1. Crie um projeto novo no Supabase (não use o do Personal Perto).
2. SQL Editor → rode `supabase/migrations/20260924000000_create_treino_schema.sql`.
3. Settings → API → Exposed schemas → adicione `treino`.
4. `cp .env.example .env` e preencha URL e anon key. Em dev, defina
   `VITE_ALLOW_SIGNUP=true` no `.env` se quiser testar o cadastro por e-mail/senha
   (em produção fica `false` — acesso só por convite, veja abaixo).
5. `npm install && npm run dev`

## Acesso por convite (piloto)
Em produção (`VITE_ALLOW_SIGNUP=false`), não existe cadastro público: o
administrador convida cada personal em **Supabase → Authentication → Users →
Invite user**. O e-mail de convite leva a pessoa para `/definir-senha`, onde ela
cria a senha e, no primeiro acesso, informa o nome. "Esqueci minha senha" na tela
de login usa o mesmo fluxo (`resetPasswordForEmail`).

## Deploy (GitHub Pages)
App publicado em **https://andrevisc-1209.github.io/Treino-PP/** via GitHub Actions
(`.github/workflows/deploy.yml`), disparado a cada push na `main` ou manualmente
(workflow_dispatch).

Passos manuais (uma vez só):
1. GitHub → **Settings → Pages → Source**: selecione **GitHub Actions**.
2. GitHub → **Settings → Secrets and variables → Actions**: crie os secrets
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do projeto Supabase.
   Opcional: crie a **variable** (não secret) `VITE_ALLOW_SIGNUP` como `true` se
   quiser expor o cadastro público; por padrão (sem a variable) o build usa `false`.
3. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://andrevisc-1209.github.io/Treino-PP/`
   - **Redirect URLs**: adicione `https://andrevisc-1209.github.io/Treino-PP/` e
     mantenha `http://localhost:5173` para o dev local.
4. Supabase → **Authentication → Providers → Email**: desative **Allow new users
   to sign up** (o cadastro público some do app quando `VITE_ALLOW_SIGNUP=false`,
   mas essa opção fecha a porta também na API).

## Estrutura
```
src/
  lib/          supabase client (schema treino), utils
  components/   UI base
  features/
    auth/       login, sessão, rota protegida
    alunos/     dashboard de alunos
supabase/migrations/   schema do banco
```

## Integração futura com o Personal Perto
- `treino.professionals.id = auth.uid()` — mesmo contrato do PP.
- Pontes sem FK: `professionals.personal_perto_id`, `alunos.profile_id`.
- No merge: repontar FKs para `public.professionals` e mover `src/features/*`.

## Roadmap
- [x] Schema + RLS + login + lista de alunos
- [x] Cadastro completo do aluno (+ consentimento LGPD)
- [x] Biblioteca de exercícios e montagem do plano
- [x] Registro da sessão (pré, séries, avaliação, PSE)
- [x] Ficha com histórico e gráficos
- [x] PWA instalável, acesso por convite e termo LGPD (piloto)
- [ ] Fase 2: agenda + WhatsApp · Fase 3: financeiro · Fase 4: acesso do aluno
