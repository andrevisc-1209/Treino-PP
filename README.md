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
4. `cp .env.example .env` e preencha URL e anon key.
5. `npm install && npm run dev`

## Deploy (GitHub Pages)
App publicado em **https://andrevisc-1209.github.io/Treino-PP/** via GitHub Actions
(`.github/workflows/deploy.yml`), disparado a cada push na `main` ou manualmente
(workflow_dispatch).

Passos manuais (uma vez só):
1. GitHub → **Settings → Pages → Source**: selecione **GitHub Actions**.
2. GitHub → **Settings → Secrets and variables → Actions**: crie os secrets
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do projeto Supabase.
3. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://andrevisc-1209.github.io/Treino-PP/`
   - **Redirect URLs**: adicione `https://andrevisc-1209.github.io/Treino-PP/` e
     mantenha `http://localhost:5173` para o dev local.

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
- [ ] Cadastro completo do aluno (+ consentimento LGPD)
- [ ] Biblioteca de exercícios e montagem do plano
- [ ] Registro da sessão (pré, séries, avaliação, PSE)
- [ ] Ficha com histórico e gráficos
- [ ] Fase 2: agenda + WhatsApp · Fase 3: financeiro · Fase 4: acesso do aluno
