# Auditoria de UX de 11/11/2026: crítica, síntese e status

Segunda rodada de auditoria (a primeira está em [RELATORIO.md](RELATORIO.md), de setembro).
Reúne três fontes: (1) a **crítica por heurísticas** feita sobre o código e um print da Agenda; (2) o **relatório de navegação ao vivo** feito com o Claude no Chrome (artefato `claude.ai/artifact/JDzf8oeis2DfpGqmy9r6BR`, não versionado aqui); (3) a **conferência dos achados no código**.
Contexto do produto em [BRIEFING.md](BRIEFING.md). O que foi feito está na tabela de status no fim.

## Como foi feito (e o que não foi)
- A crítica leu o código das telas centrais e contou padrões com `grep` (números aproximados), mais um print da Agenda a 1280 px. **Não navegou o app ao vivo**; o que depende de ver a tela ficou como "testar".
- O relatório do Chrome é observação ao vivo, em conta em uso. Dos 5 achados de gravidade alta, **4 se confirmaram no código e 1 era falso alarme** (ver "Correção de fato").
- Não conferidos no código, por serem observação de tela: rolagem vazando entre abas, Semana com 34 cards, salvar duplo na Disponibilidade, lista de alunos com ~170 px por linha e carrossel de KPIs cortado.
- **Nenhuma das análises até hoje foi feita com personais reais usando o app.**

## Correção de fato: teste grátis e preço
O briefing da primeira versão dizia "30 dias de teste", copiado da apresentação do marketplace. No **Treino** são **15 dias e R$ 15 por mês** (migration `20261004…`: `trial_fim = now() + 15 dias`; a landing está certa). O marketplace tem outro preço (R$ 35 a 49) e 30 dias. São duas assinaturas para a mesma marca: é decisão estratégica em aberto, não bug de landing.

## Pontos fortes (preservar)
| O que | Evidência | Princípio |
|---|---|---|
| **Hoje com a próxima aula em foco** | `HojePage`: destaque, "Próximas aulas" e estado "sem mais aulas" | Hierarquia visual |
| **Feito para academia** | Fila offline, banner offline, série guardada no aparelho | Visibilidade do estado, recuperação de erro |
| **Reversibilidade** | ~59 usos de folha de confirmação, ~28 de "Desfazer", 1 `confirm()` nativo | Controle do usuário, prevenção de erro |
| **Alvos de toque** | ~250 usos de `min-h-11/12`, barra inferior de 56 px | Lei de Fitts |
| **Nova sessão, uma pergunta por tela** | Barra de progresso "1 de 4" | Goal-gradient, Miller |
| **Estados cuidados** | ~85 esqueletos, `ErroComRetry`, `EstadoVazio` padronizado | Visibilidade do estado |
| **Página pública da agenda** | Uma tarefa, turnos, erro por campo, consentimento desmarcado, "Você escolhe. X confirma." | Postel, confiança |
| **Privacidade como UX** | Dado de saúde fora de listas, mensagens e admin | Conteúdo responsável |
| **Processo** | Auditorias registradas no BACKLOG | Melhoria contínua |

## Críticas da leitura do código
1. **Agenda empilhava o secundário antes da agenda** (alta): o cartão do link, com URL, dois botões e 4 métricas, ocupava quase metade da altura útil antes da primeira aula. Violava a hierarquia visual.
2. **Ficha do aluno: Resumo sobrecarregado** (alta): Dados, Horários, Cobrança, Relatório, Contrato, Peso e Arquivar numa rolagem só. Abas de 36 px, que rolam na horizontal.
3. **Hoje acumula blocos** (alta): até 9 competindo (clima, ativação, checklist, próxima aula, próximas, ciclos, Pix, atividade, indicação). Regra proposta: um alerta de ação por vez, o resto recolhido.
4. **Alvos abaixo de 44 px** (média): ~19 pontos (chips, ícones `size-9`, filtros de fatura).
5. **Texto pequeno e cinza** (média): ~290 usos de `text-xs` e ~400 de `text-slate-500`; passa no contraste, mas informação que decide ação a 12 px sob sol é difícil de ler.
6. **Página pública: lista de espera disputava a tela com o pedido** (média), e faltava canal de contato.
7. **Foco e movimento** (baixa a média): sem `focus-visible` próprio, campos com `outline-none`, pouca redução de movimento, sem modo escuro (WCAG 2.4.7 e 1.4.11).
8. **Código que afeta a experiência**: ~15 telas com mais de 400 linhas e ~540 `useState`; componentes repetidos (um `Numero` duplicado, já consolidado em `NumeroComRotulo`).

## O que o relatório do Chrome apontou e o código confirmou
| Achado | Causa no código |
|---|---|
| Financeiro: "6 faturas em atraso · Ver" abre vazio | O aviso contava **todas as faturas vencidas**; o filtro listava **alunos cuja última fatura** estava vencida. Duas definições de "em atraso". |
| Sino, Hoje e Financeiro com números de ciclo diferentes | O sino guardava notificação antiga (`ciclo_encerrado`, valor congelado); Hoje calcula ao vivo; o Financeiro mostrava o valor do **ciclo atual** com a etiqueta "Ciclo encerrado". |
| Hoje lista aulas passadas em "Próximas aulas" | `organizarAulasDoDia` punha as pendentes atrasadas na lista "seguintes". |
| Página pública sem foto, preço e CREF | Só inicial, cidade, duração e apresentação de 160 caracteres. |
| Mock de WhatsApp da landing dizia "3 treinos hoje" | O resumo real do sistema também dizia "N treinos hoje". |

## O insight central
As duas análises apontam para uma cadeia que quebra no mesmo ponto:

**aula dada e não registrada → "0 treinos essa semana" → Financeiro R$ 0,00 / 0 aulas → número errado no ciclo → perda de confiança na cobrança.**

Na conta em uso, 4 de 6 aulas do dia estavam sem registro. O valor do produto (cobrar, evolução, relatório) depende de a aula ser registrada, e a tela tratava registrar quase como iniciar um treino. Quem cobra por aula só recebe o que foi registrado.

## Estratégia
- **Resultado:** o personal registra e cobra suas aulas sem perder dinheiro nem esforço.
- **Métrica-norte candidata:** aulas registradas por personal por semana. Entradas: personais que chegam ao 3º aluno (adoção), **taxa de registro** = aulas registradas ÷ aulas já passadas (engajamento), ciclos fechados no prazo (tarefa), personais ativos na semana 2 (retenção).
- **Concorrente real:** planilha, caderno e WhatsApp, não outro app. Para trocar, registrar tem de ser **mais rápido que o caderno**.
- **Oportunidades:** (1) "esqueço de marcar a aula como dada"; (2) "não sei quanto tenho a receber e os números não batem"; (3) "perco horários por não ter como o aluno pedir"; (4) "quem chega pelo meu link não sabe quem eu sou"; (5) "perco tempo achando o que importa numa tela cheia".
- **Apostas a testar (maior risco primeiro):** um toque em "Dei a aula" sobe a taxa de registro? Perfil público opcional aumenta os pedidos? Uma só definição de ciclo reduz dúvidas?
- **Responsabilidade:** preço e CREF públicos exigem ação do próprio personal e constam na Política; evitar texto que culpe quem esqueceu de registrar.
- **Postura do produto:** o uso é transitório, mas o app cresce em gestão. Regra proposta: **o que se faz em pé ocupa no máximo 2 toques**, e a gestão mora em outro lugar.

## Onde as análises divergiram
A crítica propunha dividir o Resumo da ficha em duas abas; o relatório do Chrome propunha reduzir de 5 para 3 abas. **Decisão do dono: manter 5 abas.** A ficha foi resolvida com a situação do aluno no topo e acordeões.

## Status (12/11/2026)
| Ponto | Situação | PR |
|---|---|---|
| Uma definição de "em atraso"; sino calculado ao vivo; "Ciclo encerrado" com o valor do ciclo encerrado | ✅ feito | #278 |
| Hoje: "Para registrar" com "Dei a aula" / "Faltou" em um toque, "Começar" só na próxima aula | ✅ feito | #279 |
| Agenda: link em uma linha, faixa única de pedidos e espera, métricas só com amostra | ✅ feito | #280 |
| Ficha: situação no topo, abas de 44 px, Cobrança e Financeiro num cartão, "Arquivar" em "Mais opções" | ✅ feito (5 abas mantidas) | #281 |
| Página pública: perfil opcional, "Amanhã" e mês, menos repetição, espera some com horário escolhido | ✅ feito | #282 |
| Alvos de 44 px e texto mínimo de 13 px | ✅ feito (sem validação visual logada) | #283 |
| "Aula" no resumo do WhatsApp e na landing; `/treinos`; rolagem ao voltar; instalação; Disponibilidade; clima em uma linha; Documentos em acordeão | ✅ feito (sem validação visual logada) | #284 |
| Taxa de registro no admin; roteiro do teste com 5 personais | ✅ feito (teste ainda **não rodado**) | #285 |
| **Hoje: regra de um alerta por vez** | ⏳ em aberto | |
| Canal de contato (WhatsApp) na página pública | ⏳ em aberto | |
| Foto do profissional | ⏳ em aberto (Storage + Política) | |
| Foco visível, `outline-none`, redução de movimento, modo escuro | ⏳ em aberto | |
| Métricas de comportamento dentro do app (hoje o PostHog cobre só landing e cadastro) | ⏳ em aberto | |
| Vocabulário único entre Treino e marketplace ("Personal" × "professor") | ⏳ decisão estratégica | |
| Preço separado (Treino R$ 15 / 15 dias × marketplace R$ 35–49 / 30 dias); "sem comissão" × "taxa por transação" | ⏳ decisão estratégica | |
| Teste de usabilidade com 5 personais | ⏳ marcar | |
| Validar a 390 px, logado: Fatura, aula avulsa, horários fixos, Evolução, Disponibilidade, ficha, Hoje e a aba de admin | ⏳ não feito | |
