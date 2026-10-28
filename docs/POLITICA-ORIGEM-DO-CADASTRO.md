# Política de Privacidade: origem do cadastro (para o jurídico)

**Status:** proposta, **não aplicada**. O BI do admin (BACKLOG item 122) já tem o banco pronto para guardar a origem do cadastro, mas o app **não registra nada** até a Política ser atualizada.

## O que muda na prática
Quando alguém cria conta, o app passa a guardar, junto do cadastro, **de qual link a pessoa veio**: `utm_source`, `utm_medium` e `utm_campaign` do primeiro link aberto (por exemplo `instagram / reels / cobranca_01`, `whatsapp / prospeccao`, `indicacao / personal`). Sem link com origem, fica "direto". Isso serve só para saber quais divulgações trazem personais pagantes e investir melhor (o painel mostra cadastros, ativados e pagantes por origem e o custo por pagante).

- **Dado guardado:** três textos curtos (até 60 caracteres cada), sem nome, e-mail, CPF, telefone, dado de aluno ou de saúde.
- **Quem vê:** só o admin, em números agregados por origem (no painel não aparece a origem de uma pessoa específica).
- **Só conta nova:** o servidor só aceita registrar a origem nas primeiras 48 horas da conta; quem já tem conta não é rastreado.
- **Hoje a Política diz (seção 3, última frase do parágrafo do PostHog):** "…e não ligamos esses dados ao seu nome nem ao seu cadastro." Com esta mudança isso **deixa de ser verdade para a origem da campanha**, por isso a Política precisa mudar antes de ligar o registro.

## Texto sugerido (seção 3, depois do parágrafo do PostHog)
> **Origem do seu cadastro.** Quando você cria a conta, guardamos junto ao seu cadastro de qual divulgação você veio (por exemplo, "Instagram" ou "indicação de um Personal"), a partir dos parâmetros do link (utm_source, utm_medium e utm_campaign). Usamos isso para saber quais divulgações trazem Personal Trainers e investir melhor, e só vemos o resultado somado por origem. Essa informação não inclui o que você faz no app. Se preferir que ela seja apagada do seu cadastro, escreva para contato@personalperto.com.br.

E trocar a frase final do parágrafo do PostHog por:
> Os dados de uso do PostHog não são ligados ao seu nome nem ao seu cadastro.

## Base legal sugerida
Legítimo interesse (LGPD, art. 7º, IX): medir e melhorar a divulgação do serviço, com dado mínimo e direito de oposição por e-mail.

## Para aplicar depois da aprovação
1. Atualizar `src/features/legal/textos.ts` (Política) e subir a versão (próxima: 2.0 ou 1.10, como o jurídico preferir).
2. Registrar a nova versão em `treino.documentos_versoes` (nova migration, como nas versões 1.7 a 1.9) e atualizar o teste `versoesRegistradas.test.ts`.
3. Ligar o registro no app: guardar o UTM no `/login` e na landing (`localStorage`, primeiro toque) e chamar `treino.registrar_origem_cadastro` na primeira entrada da conta. O código está pronto (testado) e só falta ligar.
