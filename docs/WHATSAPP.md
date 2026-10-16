# WhatsApp do Personal (Evolution API)

Base para notificações por WhatsApp ao **personal**. A Evolution API é a mesma do projeto Personal Perto, mas com instância
(número) própria do Treino.

## Peças
| Peça | Onde |
|---|---|
| Envio (puro, testável) | `supabase/functions/_shared/whatsapp.ts` (`configEvolution`, `numeroWhatsApp`, `enviarTexto`) |
| Mensagem de teste | Edge Function `send-whatsapp` (JWT do personal) + botão em Configurações › Notificações |
| Opt-in e número | **já existiam**: `treino.professionals.whatsapp_opt_in` (interruptor "Alertas de aulas via WhatsApp") e `professionals.phone` (Dados pessoais) |

Não há migration: o pedido original sugeria colunas `whatsapp_numero` / `whatsapp_notificacoes` em `treino.professores`, mas a tabela se chama
`professionals` e já tem o telefone e o opt-in (preenchidos no cadastro, com o interruptor ligado por padrão).

## Segurança
- **O número nunca vem do cliente.** A função do Personal Perto aceitava `phone` no corpo; aqui isso deixaria qualquer conta (o cadastro é aberto)
  mandar WhatsApp para qualquer pessoa pela instância da plataforma. `send-whatsapp` só envia ao telefone do próprio usuário logado, e só com o opt-in ligado.
- Notificações de eventos não passam por essa function: a Edge Function que gera o evento chama `_shared/whatsapp.ts` direto, lendo o número no banco.
- **LGPD:** mensagens nunca levam dado de saúde (lesão, cirurgia, medicamentos, prontidão/bem-estar). Os logs não registram número nem o corpo da resposta da Evolution, só o status.
- Chaves só em Supabase Secrets (nunca no front nem no repositório).

## Configuração (uma vez)
1. Secrets (Dashboard → Edge Functions → Secrets, ou `supabase secrets set --project-ref avgrnvpvjhymsrnapfgu`):
   - `EVOLUTION_API_URL` — URL base da Evolution (a mesma do Personal Perto)
   - `EVOLUTION_API_KEY` — a chave (NUNCA colar no chat/PR)
   - `EVOLUTION_INSTANCE` — nome da instância do Treino (conectada ao número que vai enviar)
2. Deploy: `supabase functions deploy send-whatsapp --project-ref avgrnvpvjhymsrnapfgu` (mantém a verificação de JWT).
3. Teste: Configurações › Notificações → ligar o interruptor, ter um telefone válido em Dados pessoais → **Enviar mensagem de teste**.

## Como criar uma notificação nova
Na Edge Function do evento: ler `professionals` (service_role) → exigir `whatsapp_opt_in` → `numeroWhatsApp(phone)` → `enviarTexto(configEvolution(Deno.env), numero, texto)`,
dentro de try/catch (falha de WhatsApp nunca desfaz o registro do evento).

## Notificações automáticas (fase 2)

Todas respeitam `whatsapp_opt_in` + telefone válido do cadastro, mandam **no máximo uma mensagem por tipo por personal por dia** e gravam em
`treino.whatsapp_log` (tipo, status, dia, código do erro — sem texto nem número). Nenhuma mensagem leva dado de saúde.

| Aviso | Quando | Onde |
|---|---|---|
| ☀️ Briefing: agenda do dia + previsão | todo dia 8h (Brasília); sem aulas no dia não envia | Edge Function `daily-briefing` |
| 💰 Pagamento do plano confirmado | ao aprovar o pagamento (webhook do Mercado Pago) | `mp-webhook` |
| ⏰ Plano vencendo | 3 dias antes do fim do acesso, 8h | `avisos-diarios` |
| 👋 Aluno inativo | último treino há exatamente 10 dias, 8h (uma mensagem com a lista) | `avisos-diarios` |
| 📊 Resumo da semana | domingo 21h; sem atividade na semana não envia | `weekly-summary` |

Lógica e textos: `supabase/functions/_shared/notificacoes.ts` (testada com vitest). Previsão: Open-Meteo, pela cidade/UF do personal.

### Como disparam (pg_cron)
As três functions têm `verify_jwt = false` e exigem o header `x-cron-secret` igual ao secret **`CRON_SECRET`** (32+ caracteres; sem ele tudo é recusado).
**A `service_role` não é usada nem colocada em SQL.** Os jobs ficam em `supabase/cron/whatsapp.sql` (rodar uma vez no SQL Editor): o segredo vai para o Vault
e o job o lê a cada chamada. Passo a passo:
1. Criar o secret `CRON_SECRET` nas Edge Functions (valor aleatório longo).
2. Migration `20261037000000_whatsapp_log.sql`.
3. Deploy: `daily-briefing`, `avisos-diarios`, `weekly-summary` (e `mp-webhook`, que agora avisa o pagamento do plano).
4. Rodar `supabase/cron/whatsapp.sql`, trocando `COLE_O_VALOR_DO_CRON_SECRET` pelo mesmo valor do secret.
5. Teste manual de uma function: `curl -X POST https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/daily-briefing -H "x-cron-secret: <valor>"` (resposta: contagem de enviados/pulados/falhas).

### Decisões e o que NÃO foi implementado
- **"Financeiro":** o webhook do Mercado Pago confirma o pagamento do **plano do próprio personal** (os alunos não pagam pelo app: a fatura é marcada como paga pelo personal),
  e alunos não têm "acesso" que expire. Por isso "pagamento recebido" e "acesso expirando" falam do plano do personal (valor, plano, acesso até).
- **Receita da semana** = faturas dos alunos marcadas como pagas na semana (não pagamentos do Mercado Pago).
- **Alerta de prontidão (4b): não implementado, de propósito.** A prontidão (sono, estresse, fadiga, dor) é preenchida pelo próprio personal na sessão e é dado de saúde:
  a regra do projeto proíbe esse dado em mensagens de WhatsApp. O "motivo" do aluno iria no texto.
- Horários: 8h de Brasília (11h UTC), não 5h; o domingo 21h do resumo semanal é segunda 0h UTC.
