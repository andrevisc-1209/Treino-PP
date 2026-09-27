# Anti-spam (Cloudflare Turnstile)

O app manda `options.captchaToken` pro Supabase em cadastro, login, "esqueci
minha senha" e reenvio de confirmação (`signUp`, `signInWithPassword`,
`resetPasswordForEmail`, `resend`). Enquanto `VITE_TURNSTILE_SITE_KEY` não
estiver definida, todos esses fluxos funcionam **sem captcha** — é assim que
o dev local roda por padrão.

## ⚠️ Ordem de ativação (importa!)

Siga **nesta ordem exata**. Se você colar a Secret Key no Supabase (passo 4)
**antes** do site em produção já estar mandando o token do Turnstile (passos
1–3), todo login e cadastro passam a ser recusados pelo Supabase — inclusive
o seu — até você reverter a ativação.

1. **Cloudflare Dashboard → Turnstile** → crie um site widget. Em **Domains**,
   cadastre os dois domínios que o app usa:
   - `treino.personalperto.com.br` (produção)
   - `localhost` (dev local)

   Copie a **Site Key** (pública) e a **Secret Key** (fica só no Supabase).

2. Cadastre a Site Key em dois lugares:
   - **GitHub → Settings → Secrets and variables → Actions**: crie o secret
     `VITE_TURNSTILE_SITE_KEY` com a Site Key (usado no build do deploy).
   - `.env` local: `VITE_TURNSTILE_SITE_KEY=<a mesma Site Key>` (pra testar
     antes do deploy, se quiser).

3. Faça o deploy (push na `main` ou `workflow_dispatch`) e **teste o cadastro
   e o login no site em produção** (`https://treino.personalperto.com.br/`).
   Confirme que o widget do Turnstile aparece e que cadastro/login continuam
   funcionando normalmente — nesse ponto o Supabase ainda não exige o
   captcha, só o Turnstile já está sendo carregado e mandando o token.

4. **Só depois** de confirmar o passo 3: Supabase → **Authentication → Attack
   Protection** → ative **Enable Captcha protection**, escolha **Turnstile**
   e cole a **Secret Key** (a do passo 1, não a Site Key). A partir daqui o
   Supabase passa a exigir e validar o `captchaToken` em todo signUp/login/
   reset/resend.

## Se algo travar

Se o login parar de funcionar depois do passo 4 (token inválido, domínio não
cadastrado no widget, deploy com a Site Key errada etc.): volte no Supabase
→ Attack Protection e **desative** "Enable Captcha protection" imediatamente
— isso libera os logins de novo enquanto você corrige o problema (Site Key,
domínios do widget, ou se o deploy com `VITE_TURNSTILE_SITE_KEY` de fato
saiu no ar) antes de tentar ativar de novo.
