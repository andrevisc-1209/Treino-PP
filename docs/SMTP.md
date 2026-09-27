# SMTP próprio (Resend)

Guia — sem código envolvido, é tudo configuração no Resend, na Vercel (onde
fica o DNS de `personalperto.com.br`) e no Supabase.

Por que fazer isso: o Supabase, sem SMTP próprio, usa um servidor
compartilhado com limite baixo de e-mails por hora — insuficiente assim que o
cadastro aberto começar a gerar volume de confirmação/redefinição de senha.

## 1. Verificar o subdomínio no Resend

No [Resend Dashboard](https://resend.com/domains), adicione o domínio
**`treino.personalperto.com.br`** — o **subdomínio**, não o domínio raiz
`personalperto.com.br`.

⚠️ **Importante**: verificar o domínio raiz mexeria no SPF que já existe pro
e-mail principal do Personal Perto (`@personalperto.com.br`), podendo quebrar
a entrega desses e-mails. Verificando só o subdomínio, o SPF/DKIM do Treino
fica isolado do domínio raiz.

## 2. Adicionar os registros DNS na Vercel

O DNS de `personalperto.com.br` está na Vercel. O Resend mostra uma lista de
registros (TXT pro SPF, CNAME/TXT pro DKIM, e às vezes um MX) pra colar lá.

1. **Vercel Dashboard → Domains → `personalperto.com.br` → DNS Records**.
2. Adicione cada registro exatamente como o Resend mostrar (nome, tipo, valor)
   — copie e cole, não digite de cabeça.
3. **Não edite nem apague nenhum registro existente.** Os registros do Resend
   são todos escopados a `treino.personalperto.com.br` (ex.:
   `resend._domainkey.treino.personalperto.com.br`), então não colidem com o
   que já existe pro domínio raiz ou pro Personal Perto.
4. Volte no Resend e clique em **Verify** — a propagação do DNS pode levar de
   minutos a algumas horas.

## 3. Criar a API key

No Resend: **API Keys → Create API Key**. Copie a chave (só aparece uma vez).

## 4. Configurar o SMTP no Supabase

**Supabase → Project Settings → Authentication → SMTP Settings**:

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Porta | `465` |
| Usuário | `resend` |
| Senha | a API key do passo 3 |
| Remetente (From) | `Treino · Personal Perto <nao-responda@treino.personalperto.com.br>` |

Salve. O Supabase passa a mandar os e-mails de auth (confirmação de cadastro,
redefinição de senha, convite) pelo Resend, com esse remetente.

## 5. Testar

1. **Cadastro novo**: crie uma conta de teste (ou use a conta de teste fixa em
   `e2e/.env.e2e`) e confirme que o e-mail de confirmação chega, vindo de
   `nao-responda@treino.personalperto.com.br`.
2. **Esqueci minha senha**: peça a redefinição pra mesma conta e confirme que
   o e-mail de redefinição também chega.
3. Confira o remetente, o assunto e se os links (`{{ .ConfirmationURL }}`)
   apontam pro domínio certo — ver `docs/email-templates/`.

## 6. Aumentar o limite de e-mails por hora

Depois que o SMTP próprio estiver ativo e testado: **Supabase →
Authentication → Rate Limits** → aumente o limite de "Email sent" (o limite
baixo padrão é só pro servidor de e-mail compartilhado; com SMTP próprio dá
pra subir bastante, dentro do que o plano do Resend permitir).
