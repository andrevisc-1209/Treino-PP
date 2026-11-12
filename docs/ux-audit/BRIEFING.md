# Treino · Personal Perto: briefing para análise de UX

Atualizado em 12/11/2026. Serve para quem vai analisar o produto sem ter acompanhado o desenvolvimento.
Os fatos de preço e teste grátis foram conferidos no código (migration `20261004…` e landing), não na apresentação do marketplace.

## O que é
Um **app web instalável (PWA) para personal trainers autônomos** cuidarem do dia a dia: alunos, agenda, treinos, evolução e cobrança.
Faz parte do ecossistema Personal Perto (o marketplace por bairro), mas funciona sozinho e atende qualquer profissional do Brasil.
O personal paga **R$ 15 por mês, com 15 dias de teste grátis**. O aluno não paga nem precisa de conta.

> Atenção: o **marketplace** Personal Perto é outro produto, com outra base de dados, outro preço (R$ 35 a 49) e 30 dias grátis, e chama o profissional de "professor".
> Não misture os dois. Este repositório é só o Treino.

**Endereço:** https://treino.personalperto.com.br (a landing está em `/landing.html`)

## Para quem
| Perfil | Como usa |
|---|---|
| **Personal trainer** (usuário principal) | No celular, na academia, com pressa e sinal ruim. Usa entre uma aula e outra, em pé. |
| **Aluno** (sem conta) | Abre um link: o treino à distância (`/treino/:token`) ou o consentimento de dados de saúde. |
| **Visitante** | Abre a página pública da agenda do personal (`/agenda/:slug`), vê horários e pede uma aula ou entra na lista de espera. |
| **Admin** (só o dono do produto) | Painel `/admin` com números agregados dos personais. Nunca vê dados de alunos. |

## Estrutura do app
Barra inferior com 5 áreas:
- **Hoje:** a próxima aula em foco, "Para registrar" (aulas que já passaram, com "Dei a aula" e "Faltou" em um toque), avisos e primeiros passos.
- **Agenda:** aulas por dia ou semana, vagas livres, pedidos de aula e lista de espera numa faixa só, o link da agenda em uma linha e o botão "Horários" (disponibilidade).
- **Alunos:** lista com fila "sem treino"; ficha do aluno com 5 abas, começando pela situação do aluno (cobrança, contrato, pendências). Contrato e relatório ficam no acordeão "Documentos".
- **Treinos:** exercícios e treinos planejados (modelos reutilizáveis).
- **Financeiro:** ciclos a fechar, faturas, pacotes de aulas e Pix.

Fora da barra: Configurações, Central de ajuda, o sino de notificações, importação de alunos (planilha ou IA) e a assinatura.

## Principais jornadas (as que mais valem testar)
1. **Primeiro acesso → 3 alunos cadastrados** (meta de ativação), com o checklist "Comece por aqui".
2. **Dar baixa na aula:** em Hoje, "Dei a aula" ou "Faltou". Ou abrir a aula, escolher o treino, registrar as séries e finalizar (funciona offline, com fila de gravação).
3. **Fechar o ciclo e cobrar:** gerar a fatura e mandar a mensagem pronta por WhatsApp. Cobrança por aula, mensal ou pacote.
4. **Abrir a agenda ao público:** definir horários, ligar o link, preencher o perfil da página e responder pedidos (aprovar ou recusar).
5. **Visitante pedindo aula** no celular, em poucos toques (a tela mais "de vitrine" do produto).
6. **Aluno fazendo o treino à distância** pelo link, sem login.

## Restrições que moldam o design
- **Mobile-first, a 390 px**, com uma mão só. Alvos de toque de pelo menos 44 px, texto de pelo menos 13 px e contraste AA (há testes automatizados).
- **Offline e sinal ruim** são casos normais, não exceções.
- **Dados de saúde são sensíveis (LGPD):** nunca aparecem em mensagens, e-mails, listas ou no admin.
- **Vocabulário fixo:** Aula (agenda), Treino (lista de exercícios), Treino planejado (modelo), Prontidão, "Treino à distância" (nunca "assíncrono") e "Personal" (nunca "professor" na interface).
- **Padrões:** datas dd/mm/aaaa, números com vírgula, sem `confirm()` nativo (usa folha de confirmação ou toast com "Desfazer").

## O que já foi analisado e tratado
- **Set/2026:** auditoria interna do app inteiro ([RELATORIO.md](RELATORIO.md)).
- **28/10/2026:** ChatGPT e Gemini sobre contas novas e contas em uso; e sobre o painel admin.
- **11/11/2026:** crítica de UX por heurísticas + relatório de navegação ao vivo no Chrome, cruzados. Resultado e status de cada ponto em [RELATORIO-2026-11.md](RELATORIO-2026-11.md). Oito PRs entregues (#278 a #285).

O histórico completo está em `docs/BACKLOG.md`. **Não vale repetir o que já foi tratado**; peça à pessoa que parta do app atual.

## Decisões já tomadas (para não reabrir sem motivo)
- A ficha do aluno **fica com 5 abas** (a ideia de reduzir para 3 foi avaliada e recusada).
- Pedidos da página pública **nunca expiram sozinhos** (só alertam depois de 24 h). Quem não virou aula é apagado em 30 dias.
- O consentimento na página pública vem **desmarcado**.
- O personal **sempre aprova** o pedido; quem avisa a lista de espera é ele, pelo WhatsApp.
- O captcha (Turnstile) **fica**.
- Perfil público (CREF, modalidades, locais, preço) é **opcional** e escrito pelo próprio personal. A **foto** ficou de fora por exigir armazenamento e nova revisão de Política.

## Onde a opinião de UX mais ajuda agora
1. **Teste com personais de verdade.** Nenhuma das análises até aqui foi feita com pessoas usando. Roteiro pronto em [ROTEIRO_TESTE_USABILIDADE.md](ROTEIRO_TESTE_USABILIDADE.md).
2. **Hoje para quem já usa o app:** ainda reúne até 9 blocos (clima, ativação, ciclos, Pix, atividade, indicação). Falta uma regra de "um alerta de ação por vez".
3. **Página pública da agenda** (visitante): conversão e confiança, sem teste com pessoas reais; falta um canal de contato para quem tem dúvida.
4. **Ativação do personal novo:** do cadastro ao 3º aluno.
5. **Financeiro:** clareza entre "a fechar", "a receber" e "recebido", e os três modelos de cobrança.
6. **Acessibilidade:** não há estilo de foco próprio, os campos usam `outline-none`, há pouco suporte a redução de movimento e não existe modo escuro.
7. **Tela do aluno no treino à distância** (visitante sem contexto do app).

## Como medir
No admin, em Indicadores, o bloco **"Registro das aulas"** mostra a taxa de aulas passadas que receberam baixa (só totais, sem identificar personal nem aluno). Métrica-norte proposta: aulas registradas por personal por semana.

## Como acessar
O projeto usa uma **conta de teste fixa** (definida em `e2e/.env.e2e`, dados marcados "[E2E]"). As credenciais não ficam neste repositório nem circulam por chat: o acesso deve vir do dono do produto.
A landing e a página pública da agenda abrem sem login.

## O que pedir de volta
Um relatório por jornada, com: o problema, onde aparece, a gravidade (alta, média ou baixa), a recomendação e o esforço estimado.
Se possível, com mockups em 390 px. Pedir também **o que NÃO mudar**.
