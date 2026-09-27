# Backlog

## 1. Identidade visual Personal Perto

| Item | Descrição | Status |
|---|---|---|
| 1.1 | Fonte da marca (logo, paleta, fonte lidos do repo do PP) — `docs/BRAND.md` | ✅ feito |
| 1.2 | Tokens de marca (CSS vars, contraste AA, fonte) | ✅ feito |
| 1.3 | Onde a logo aparece (login, Hoje, Treino concluído, splash) | ✅ feito |
| 1.4 | Ícones (PWA, favicon, apple-touch-icon) gerados por script | ✅ feito |
| 1.5 | Nome do app centralizado (`src/config/app.ts`) | ✅ feito |
| 1.6 | Templates de e-mail (convite, redefinir senha) | ✅ feito |

PR: [feat/identidade-pp](https://github.com/andrevisc-1209/Treino-PP/pull/19)

## 5. Cadastro aberto (D3)

Decisão de produto: o cadastro de personal é aberto (não é mais por convite) — quem quiser, cria conta.

| Item | Descrição | Status |
|---|---|---|
| 5.1 | Cadastro aberto por padrão (`VITE_ALLOW_SIGNUP=true`), sem texto de "acesso por convite" | ✅ feito |
| 5.2 | Termos de Uso + Política de Privacidade (aceite obrigatório no cadastro, versão e data gravados) | ⚠️ feito no código — falta rodar a migration `aceites_termos` no Supabase |
| 5.3 | Tela "Confirme seu e-mail" com reenvio (espera de 60s entre envios) | ✅ feito |
| 5.4 | Anti-spam (Cloudflare Turnstile via captcha nativo do Supabase Auth) | ✅ feito no código — falta configurar site key/secret key pra ativar |
| 5.5 | Checklist de onboarding no primeiro acesso (Pix → 1º aluno → horário fixo → 1º treino planejado) | ✅ feito |
| 5.6 | Erros do `supabase.auth` em português (login, cadastro, recuperação, reenvio) + tela de e-mail não confirmado no login | ✅ feito |
| 5.7 | Captcha (Turnstile) em todos os fluxos de auth (login, "esqueci minha senha", reenvio, além do cadastro) + `docs/CAPTCHA.md` e `docs/SMTP.md` | ✅ feito no código — falta configurar site key/secret key (`docs/CAPTCHA.md`) e o SMTP próprio (`docs/SMTP.md`) |

PR: [feat/cadastro-aberto](https://github.com/andrevisc-1209/Treino-PP/pull/20), [feat/auth-robusto](https://github.com/andrevisc-1209/Treino-PP/pull/23)

## 6. Domínio próprio (D2)

D2 = GitHub Pages com domínio próprio `treino.personalperto.com.br` (em vez de
`andrevisc-1209.github.io/Treino-PP/`). Detalhes em `docs/DOMINIO.md`.

| Item | Descrição | Status |
|---|---|---|
| 6.1 | Base do app na raiz (vite base, router, manifest, ícones, favicons, splash) | ✅ feito |
| 6.2 | `public/CNAME` com `treino.personalperto.com.br` | ✅ feito |
| 6.3 | `APP_URL` centralizada em `src/config/app.ts`, usada no `emailRedirectTo`/`redirectTo` | ✅ feito |
| 6.4 | Logo dos templates de e-mail apontando pro domínio novo | ✅ feito |
| 6.5 | `docs/DOMINIO.md` (DNS, Pages, Supabase Site URL/Redirect URLs, reinstalar o PWA) | ✅ feito |

Pendente pra depois do deploy no domínio novo (não dá pra fazer nesta PR): apontar o
**Site URL** e os **Redirect URLs** do Supabase pro domínio novo — ver `docs/DOMINIO.md`.

`docs/CAPTCHA.md` e `docs/SMTP.md` foram criados na PR `feat/auth-robusto` (item 5.7),
já com o domínio novo (Turnstile: `treino.personalperto.com.br` + `localhost`; Resend:
subdomínio `treino.personalperto.com.br`, não o domínio raiz).

PR: [chore/dominio-proprio](https://github.com/andrevisc-1209/Treino-PP/pull/22)

## 7. Login social (Google + Facebook)

| Item | Descrição | Status |
|---|---|---|
| 7.1 | Botões "Continuar com Google/Facebook" no login e cadastro (`SocialLoginButtons.tsx`) | ✅ feito |
| 7.2 | `signInWithOAuth` + `/auth/callback` (`AuthCallbackPage.tsx`), pede o nome se for a primeira vez | ✅ feito |

Pendente (fora do código, ver `docs/STATUS.md`): ativar os providers Google e
Facebook no Supabase (Client ID/Secret de cada um) e adicionar
`https://treino.personalperto.com.br/auth/callback` nos Redirect URLs.

PR: [feat/social-login](https://github.com/andrevisc-1209/Treino-PP/pull/26)
