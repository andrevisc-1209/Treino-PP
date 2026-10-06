# Consentimento LGPD dos dados de saúde por e-mail

Fluxo: personal, na etapa **3. Saúde** do aluno → **Enviar solicitação** → e-mail ao aluno (Resend) →
aluno abre `/consentimento/saude?token=…` e clica **Confirmar autorização** (ou **Não autorizar**) → o
app libera (ou bloqueia) os campos de lesão, cirurgia e medicamentos.

## Peças

| Peça | Onde |
|---|---|
| Migration | `supabase/migrations/20261014000000_consentimento_saude_link.sql` |
| Envio (JWT do personal) | Edge Function `enviar-consentimento-saude` |
| Confirmação (pública) | Edge Function `confirmar-consentimento-saude` (`verify_jwt = false` no `config.toml`) |
| Lógica pura + testes | `supabase/functions/_shared/consentimento.ts` |
| Página do aluno | `src/features/alunos/ConsentimentoSaudePage.tsx` (rota pública) |
| Etapa Saúde | `ConsentimentoSaudeBloco.tsx` + `AlunoFormPage.tsx` |

## Decisões de segurança

- **Token fora de `alunos`**: fica em `treino.consentimento_saude_tokens` (RLS ligado, sem policy, sem grant
  para `anon`/`authenticated`). Se estivesse em `alunos`, o app (que lê `select *`) entregaria o token ao
  próprio personal, que poderia "confirmar pelo aluno".
- **Status protegido por trigger**: o cliente não consegue gravar `pendente`/`confirmado`/`negado` (nem as datas) —
  só **zerar**, que é o que a revogação faz. Quem grava é a Edge Function (service_role).
- **Abrir o link não muda nada**: a página só consulta; confirmar/negar exige clique no botão (scanners de
  e-mail abrem links automaticamente).
- Token de uso único (UPDATE condicional `used_at IS NULL`), validade de 7 dias, e só vale enquanto o status do
  aluno é `pendente` (revogar/cancelar invalida links antigos). Novo envio invalida os anteriores.
- Reenvio com intervalo de 60 s. Aluno que **negou** não recebe nova solicitação.
- O e-mail não contém dado de saúde (só pede a autorização). Ao confirmar, a função também registra o aceite
  em `treino.consentimentos` (`method = 'link'`) — ficha, revogação e travas de saúde seguem a mesma fonte.
- O caminho antigo ("O aluno já consentiu pessoalmente ou por escrito") continua, como link discreto.

## Configuração

1. Rodar a migration (SQL Editor) **antes** do merge.
2. Secret novo: `RESEND_API_KEY` (a mesma API key do SMTP do Resend). Opcionais: `SITE_URL`, `CONSENTIMENTO_FROM`
   (padrão `Treino · Personal Perto <nao-responda@treino.personalperto.com.br>`, domínio já verificado no Resend).
3. Deploy:
   ```bash
   supabase functions deploy enviar-consentimento-saude --project-ref avgrnvpvjhymsrnapfgu
   supabase functions deploy confirmar-consentimento-saude --no-verify-jwt --project-ref avgrnvpvjhymsrnapfgu
   ```
