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

PR: [feat/cadastro-aberto](https://github.com/andrevisc-1209/Treino-PP/pull/20)
