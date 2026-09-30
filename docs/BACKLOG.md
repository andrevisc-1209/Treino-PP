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

## 7. Login social (Google)

| Item | Descrição | Status |
|---|---|---|
| 7.1 | Botão "Continuar com Google" no login e cadastro (`SocialLoginButtons.tsx`) | ✅ feito |
| 7.2 | `signInWithOAuth` + `/auth/callback` (`AuthCallbackPage.tsx`), pede o nome se for a primeira vez | ✅ feito |

O botão do Facebook foi implementado e depois removido a pedido (só Google por
enquanto).

Pendente (fora do código, ver `docs/STATUS.md`): ativar o provider Google no
Supabase (Client ID/Secret) e adicionar
`https://treino.personalperto.com.br/auth/callback` nos Redirect URLs.

PR: [feat/social-login](https://github.com/andrevisc-1209/Treino-PP/pull/26)

## 8. Trial + assinaturas

| Item | Descrição | Status |
|---|---|---|
| 8.1 | Trial de 15 dias automático no cadastro (`treino.assinaturas` + trigger) | ✅ feito |
| 8.2 | `useAssinatura()`, `TrialBanner.tsx`, `PlanoModal.tsx`, `AssinaturaGuard.tsx` | ✅ feito |
| 8.3 | Pagamento (Mercado Pago) | ❌ não iniciado — ver checklist em `docs/STATUS.md` |

RLS de `treino.assinaturas` é só leitura pro professional (decisão de segurança,
detalhada em `docs/STATUS.md` — o pedido original permitia escrita, o que deixaria
qualquer um se auto-declarar "assinatura ativa" de graça).

Pendente: rodar a migration `20261004000000_assinaturas.sql` e definir o número de
WhatsApp real em `PlanoModal.tsx` (hoje é um placeholder).

PR: [feat/trial-assinatura](https://github.com/andrevisc-1209/Treino-PP/pull/34)

## 9. UX: Pix (UF/cidade + card na Hoje), acesso ao perfil, validação de CPF

| Item | Descrição | Status |
|---|---|---|
| 9.1 | Seletor UF → Cidade no Pix (API do IBGE), troca o campo de texto livre | ✅ feito |
| 9.2 | Card "Receber via Pix" na Hoje (chave mascarada, copiar, compartilhar) | ✅ feito |
| 9.3 | Acesso a Configurações no bottom nav ("Perfil") | ✅ feito |
| 9.4 | CPF: borda vermelha + mensagem no blur, botão desabilitado enquanto inválido | ✅ feito |
| 9.5 | Unicidade de CPF (`idx_professionals_cpf`) + mensagens de erro específicas | ✅ feito |

O pedido original referenciava `treino.perfis` (não existe neste projeto — é
`treino.professionals`) e pedia um `src/lib/validators.ts` novo — `validarCPF` já
existia em `src/lib/cpf.ts` desde a PR de cadastro do personal, não dupliquei.
Não adicionei um avatar clicável no header da Hoje (item pedido) porque o ícone de
engrenagem que já existe lá já cobre esse acesso, e agora o bottom nav também tem
"Perfil" — um terceiro caminho pra mesma tela pareceu redundante.

Pendente: rodar a migration `20261005000000_unique_cpf.sql`.

PR: [feat/ux-perfil-pix-cpf](https://github.com/andrevisc-1209/Treino-PP/pull/35)

## 10. Segurança e UX de cadastro (senha, WhatsApp, CPF imutável, e-mail duplicado)

| Item | Descrição | Status |
|---|---|---|
| 10.1 | Botão de olho na senha + checklist ao vivo (4 regras) + botão desabilitado até tudo verde | ✅ feito |
| 10.2 | Toggle de WhatsApp como switch (liga/desliga na hora, sem confirmação) | ✅ feito |
| 10.3 | CPF não editável em Configurações (campo travado) + trigger no banco bloqueando UPDATE | ✅ feito |
| 10.4 | **Bug real corrigido**: e-mail já cadastrado (via Google) era aceito silenciosamente no cadastro manual | ✅ corrigido |

**Item 10.4 é o mais importante desta leva** — bug de verdade, reproduzido e confirmado
ao vivo contra o Supabase real antes e depois da correção. Causa: quando o Supabase
tem alguma proteção de confirmação ativa, `signUp()` pra um e-mail que já existe não
retorna erro — devolve um "usuário" falso com `identities: []` e sem sessão, pra não
vazar quem já tem conta. O código tratava `!error && !session` só como "precisa
confirmar o e-mail", então um e-mail duplicado passava pela tela "Confirme seu
e-mail" como se fosse um cadastro novo — sem nunca criar de fato uma segunda conta
(a chamada não erra, mas também não duplica nada no banco), só dando a falsa
impressão de sucesso. Corrigido detectando `identities.length === 0` antes de cair
no caminho de "aguardando confirmação". Não usei o `traduzirErroAuth` novo do
pedido — o mapeamento de erros já existia e já cobria "User already registered"
(`mapearErroAuth`, `src/lib/errosAuth.ts`); o problema nunca foi o mapeamento de
erro, foi essa chamada específica que não retorna erro nenhum.

**Não consigo verificar duplicatas eu mesmo** — `auth.users` não é acessível pela
anon key (nem deveria ser). Pela mecânica do bug (o Supabase devolve um "usuário
fake" sem criar linha nova, não uma duplicata de verdade), a suspeita é de que não
exista nenhuma linha duplicada — mas isso precisa ser confirmado rodando a query
abaixo no SQL Editor:

```sql
SELECT email, COUNT(*) FROM auth.users GROUP BY email HAVING COUNT(*) > 1;
```

Se aparecer algum e-mail com `COUNT(*) > 1`, me avisa qual — decido com você como
resolver (provavelmente apagar a conta mais recente/sem dados pelo Dashboard).

PR: [feat/cadastro-ux-seguranca](https://github.com/andrevisc-1209/Treino-PP/pull/36)

## 11. UX de treino: Places no horário, sliders de toque, cronômetro opcional, nascimento obrigatório

| Item | Descrição | Status |
|---|---|---|
| 11.1 | Google Places no campo "Local" do horário fixo | ✅ feito |
| 11.2 | **Bug real corrigido**: sliders de pré/pós-treino reagiam a qualquer tap, sem distinguir de arraste | ✅ corrigido |
| 11.3 | Cronômetro opcional no treino (pergunta ao entrar, pausa/retoma, persiste ao navegar) | ✅ feito |
| 11.4 | Data de nascimento obrigatória no cadastro do aluno (14–100 anos) | ✅ feito |

**Item 11.2 tem dois bugs reais, não só o pedido original**: além do tap simples
mudando o valor (o pedido), a reescrita inicial (pra resolver isso) introduziu um bug
novo — `onChange` disparava a cada `pointermove` durante o arraste, e o
`NovaSessaoPage.tsx` avança de pergunta a cada `onChange`, então um arraste só
conseguia "pular" várias perguntas de uma vez (testei ao vivo, reproduzi, só a
primeira pergunta ficava respondida). Corrigido chamando `onChange` só uma vez, no
`pointerup`.

**Não criei a migration do item 4** (`data_nascimento`) — o pedido presumia que a
coluna não existia; `treino.alunos.birth_date` já existe desde a migration inicial
do schema. Só estendi a validação (obrigatório, 14–100 anos, sem data futura).

PR: [feat/ux-treino-ajustes](https://github.com/andrevisc-1209/Treino-PP/pull/37)
