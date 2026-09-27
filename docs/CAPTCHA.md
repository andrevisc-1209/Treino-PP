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

## A validação já é server-side — não precisa (e não deve) duplicar

O passo 4 acima **é** a validação server-side: quando "Enable Captcha
protection" está ativo, o próprio servidor do Supabase (GoTrue) faz o POST pra
`https://challenges.cloudflare.com/turnstile/v0/siteverify` com a Secret Key,
antes de aceitar qualquer `signUp`/`signInWithPassword`/`resetPasswordForEmail`/
`resend` que leve `options.captchaToken`. O token nunca é "só conferido no
navegador" — o frontend só o obtém e repassa; quem valida de verdade é o
Supabase.

**Não crie uma Edge Function própria pra chamar o `siteverify` antes desses
métodos.** Um token do Turnstile só pode ser verificado **uma vez** — se algo
além do Supabase já consumir o token com um `siteverify` próprio, a chamada
seguinte do Supabase (que faz a mesma verificação) é recusada pelo Cloudflare
por token já usado, e login/cadastro quebram pra todo mundo, mesmo com token
"válido". Se um dia for necessário validar o captcha fora do fluxo de auth do
Supabase (ex.: um form que não passa por `supabase.auth`), aí sim faz sentido
um endpoint próprio — mas nesse caso ele deve ser o *único* lugar que chama o
`siteverify` pra aquele token, nunca em paralelo com o `captchaToken` do
Supabase Auth.

## Se algo travar

Se o login parar de funcionar depois do passo 4 (token inválido, domínio não
cadastrado no widget, deploy com a Site Key errada etc.): volte no Supabase
→ Attack Protection e **desative** "Enable Captcha protection" imediatamente
— isso libera os logins de novo enquanto você corrige o problema (Site Key,
domínios do widget, ou se o deploy com `VITE_TURNSTILE_SITE_KEY` de fato
saiu no ar) antes de tentar ativar de novo.
