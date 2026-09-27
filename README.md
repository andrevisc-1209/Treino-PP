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

## Cadastro aberto
`VITE_ALLOW_SIGNUP=true` (padrão) mostra "Criar conta" na tela de login: nome,
e-mail, senha (mín. 8 caracteres) e aceite obrigatório dos Termos de Uso
(`/termos`) e da Política de Privacidade (`/privacidade`) — o aceite (versão +
data) fica gravado em `treino.aceites_termos`. Depois de criar a conta, se o
projeto exigir confirmação de e-mail, aparece a tela "Confirme seu e-mail" com
"Reenviar e-mail" (espera de 60s entre envios); se não exigir, a pessoa já entra
direto.

Pra desativar o cadastro público (ex.: fechar pra um piloto convidado), defina
`VITE_ALLOW_SIGNUP=false` — nesse caso o administrador convida cada personal em
**Supabase → Authentication → Users → Invite user**. O e-mail de convite leva a
pessoa para `/definir-senha`, onde ela cria a senha e, no primeiro acesso,
informa o nome (se ainda não tiver). "Esqueci minha senha" na tela de login usa
o mesmo fluxo (`resetPasswordForEmail`) nos dois casos.

### Anti-spam (Cloudflare Turnstile)
Opcional. Sem `VITE_TURNSTILE_SITE_KEY` definida, o cadastro funciona sem
captcha (bom pra dev). Pra ativar:
1. [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → crie um site widget, copie a **Site Key** e a **Secret Key**.
2. `VITE_TURNSTILE_SITE_KEY` no `.env` (ou como GitHub variable, veja Deploy abaixo) = a Site Key.
3. Supabase → **Authentication → Attack Protection** → ative **Enable Captcha protection**, escolha **Turnstile** e cole a Secret Key.

O app já manda o token do Turnstile pro Supabase (`options.captchaToken` no
`signUp`) — o Supabase valida a Secret Key do lado dele.

## Deploy (GitHub Pages)
App publicado em **https://andrevisc-1209.github.io/Treino-PP/** via GitHub Actions
(`.github/workflows/deploy.yml`), disparado a cada push na `main` ou manualmente
(workflow_dispatch).

Passos manuais (uma vez só):
1. GitHub → **Settings → Pages → Source**: selecione **GitHub Actions**.
2. GitHub → **Settings → Secrets and variables → Actions**: crie os secrets
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do projeto Supabase.
   Por padrão o build usa `VITE_ALLOW_SIGNUP=true` (cadastro aberto); pra fechar,
   crie a **variable** (não secret) `VITE_ALLOW_SIGNUP` como `false`. Pra ligar o
   anti-spam, crie a variable `VITE_TURNSTILE_SITE_KEY` com a Site Key do Turnstile.
3. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://andrevisc-1209.github.io/Treino-PP/`
   - **Redirect URLs**: adicione `https://andrevisc-1209.github.io/Treino-PP/` e
     mantenha `http://localhost:5173` para o dev local.
4. Supabase → **Authentication → Providers → Email**: mantenha **Allow new users
   to sign up** ativado (é o que permite o cadastro aberto) — só desative se for
   fechar pra convite manual (`VITE_ALLOW_SIGNUP=false`).

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
- [x] PWA instalável, cadastro aberto (com convite manual como alternativa) e termo LGPD
- [ ] Fase 2: agenda + WhatsApp · Fase 3: financeiro · Fase 4: acesso do aluno
