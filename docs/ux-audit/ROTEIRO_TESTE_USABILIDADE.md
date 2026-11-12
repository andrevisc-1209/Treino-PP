# Roteiro de teste de usabilidade: 5 personais

Objetivo: ver, sem ajudar, se um personal que nunca usou o app consegue fazer as tarefas do dia a dia no celular.
Hipótese que queremos testar: **o personal abre o app, dá baixa nas aulas e cobra sem precisar de explicação.**
O que significa acertar: pelo menos **4 dos 5** personais fazem cada tarefa sozinhos e em menos de 2 minutos.

## Antes de começar
- 5 personais que dão aulas de verdade, de preferência com 5 a 30 alunos. Não pode ser quem ajudou a desenhar o app.
- Uma sessão de 30 minutos cada, no celular do próprio personal (ou num emprestado, já com a PWA instalada).
- Use a conta de teste fixa de `e2e/.env.e2e`. Dados de teste levam o prefixo "[E2E]" e são apagados no fim (`npm run e2e:clean`).
- Peça para gravar a tela (com o consentimento da pessoa). Quem conduz fica ao lado e **não ajuda**.
- Leia a abertura em voz alta, sempre igual: "Estamos testando o app, não você. Se travar, a falha é nossa. Pense em voz alta. Eu não vou ajudar, mas vou anotar tudo."

## Tarefas (uma por vez, sem dizer onde clicar)
| # | Tarefa dita ao personal | O que observar |
|---|---|---|
| 1 | "Você acabou de dar a aula das 7h com a Ana. Marque que ela aconteceu." | Acha "Dei a aula" no Hoje? Quantos toques? Usa Desfazer? |
| 2 | "O Carlos faltou e você quer cobrar a aula." | Entende "Faltou" e a cobrança de falta? Hesita? |
| 3 | "Cadastre um aluno novo, a Bia, e marque aulas toda terça às 18h." | Cadastro e horário fixo: onde trava? Abandona? |
| 4 | "Mande o link para alunos pedirem horário com você." | Acha o link da agenda? Copia? Entende a disponibilidade? |
| 5 | "Veja quem está devendo este mês e cobre um aluno." | Acha o Financeiro? Entende o ciclo e o status de cada aluno? |

## O que anotar em cada tarefa
- Fez sozinho? (sim / com dica / não)
- Tempo e número de toques.
- Onde hesitou, o que disse em voz alta, qual palavra não entendeu.
- Erros: tocou no lugar errado, voltou, abriu a Ajuda.

## Perguntas no fim (3 minutos)
1. "Se o app sumisse amanhã, o que mais ia fazer falta?"
2. "O que você ainda faz fora do app (caderno, planilha, WhatsApp)? Por quê?"
3. "Qual palavra ou tela te confundiu?"
4. "De 0 a 10, a chance de indicar a um colega, e por quê?"

## Como fechar
- Planilha: personal × tarefa (sim / dica / não), tempo e citação literal da maior dor.
- Problema que aparece em **3 ou mais** dos 5 vira item de backlog com prioridade. Um só, anotar e esperar.
- Cruzar com o número "Registro das aulas" do admin: se muitos personais não dão baixa, a tarefa 1 deve mostrar por quê.
- Não usar dados de saúde dos alunos em nenhuma sessão (LGPD).
