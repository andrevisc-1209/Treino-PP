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
