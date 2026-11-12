# Decisões estratégicas em aberto: vocabulário, preço e comissão

Memo para decidir, não para executar. Escrito em 12/11/2026. Os fatos do Treino foram conferidos no código; os do marketplace (Personal Perto) vêm das apresentações v2 e **precisam de confirmação** antes de virarem texto público.

## Onde estamos
| | **Treino · Personal Perto** (este app) | **Personal Perto** (marketplace) |
|---|---|---|
| Quem paga | O personal | O profissional (aluno é grátis) |
| Preço | R$ 15 por mês | R$ 35 a 49 por mês |
| Teste grátis | 15 dias | 30 dias |
| Como entra | Cadastro aberto, sem verificar CREF | Verificação de CREF |
| Dados | Base própria | Outra base, separada |
| Como chama quem dá a aula | "Personal" | "Professor" |
| Dinheiro do aluno | O app só gera a cobrança (Pix do próprio personal); não passa pela plataforma | Roadmap: pagamento integrado, **com taxa por transação** |

O ponto de dor é que a mesma marca tem **duas assinaturas, dois preços e dois vocabulários**, e a promessa "100% do valor é do profissional" convive com um roadmap que cobra taxa por transação.

## Decisão 1: vocabulário ("Personal" × "professor")
| Opção | O que muda | Risco |
|---|---|---|
| **A. "Personal" nos dois produtos** (recomendada) | Marketplace e apresentações passam a dizer "personal". O Treino não muda nada. | Trabalho de texto no marketplace; "personal" some em buscas como "professor de natação". |
| B. "Professor" nos dois | O Treino muda a interface inteira, o FAQ, a landing, os e-mails, a Política e os Termos, e a regra do `CLAUDE.md` cai. | Alto: atinge dezenas de telas e documentos legais. "Professor" soa escola, não treino particular. |
| C. Cada produto com o seu | Nada muda agora. | A marca fala duas línguas no dia em que os dois produtos se encontrarem (página pública do Treino levando ao marketplace, por exemplo). |

**Recomendo A**, e usar "professor" só como termo de busca (SEO) no marketplace. Custo no Treino: zero.

## Decisão 2: preço e assinatura
| Opção | Como funciona | A favor | Contra |
|---|---|---|---|
| **A. Dois produtos, dois preços** (hoje) | Treino R$ 15 / 15 dias. Marketplace R$ 35–49 / 30 dias. | Cada produto se explica sozinho; o Treino é barato e entra fácil. | Quem usa os dois paga duas vezes; teste de prazo diferente confunde. |
| **B. Um plano com os dois** | Uma assinatura (por exemplo R$ 35 a 49) inclui o Treino e o marketplace. | Simples de explicar; sobe o valor médio. | Quem só quer o Treino paga mais; o Treino perde o argumento do preço baixo. |
| **C. Treino como porta de entrada** | O Treino segue em R$ 15; aparecer no marketplace é um adicional. | Mantém a entrada barata e dá um motivo claro para subir de plano. | Exige integração entre as duas bases (hoje separadas). |

**Recomendo C como destino e A como situação até lá.** Enquanto as bases forem separadas, não prometer nada em conjunto. Alinhar o **prazo de teste** (15 ou 30 dias) é decisão pequena que vale tomar já: afeta a landing, o e-mail de boas-vindas e a regra de "trial" no banco.

## Decisão 3: comissão (taxa por transação)
O Treino hoje **não toca no dinheiro do aluno**: gera a cobrança e o Pix é do próprio personal. A promessa "sem comissão" é verdadeira no Treino.

| Opção | O que muda | Observação |
|---|---|---|
| **A. Sem comissão em nenhum produto** | Só assinatura. O pagamento integrado deixa de ser fonte de receita. | Coerente com a promessa; receita só cresce com o número de personais. |
| **B. Taxa só no pagamento integrado** (como no roadmap) | Quem **escolhe** pagar pelo app paga uma taxa; quem usa Pix direto não paga nada. | Mantém "sem comissão" verdadeiro para o Pix direto, mas a mensagem precisa ser exata: "sem comissão **no Pix**". |
| C. Taxa sobre tudo | Qualquer cobrança passa pela plataforma. | Quebra a promessa e muda o modelo; o personal tem rota fácil para fugir (planilha, Pix direto). |

**Recomendo B, com texto preciso.** Duas consequências a decidir junto: (1) a landing e a apresentação não podem dizer "100% é seu" sem o "no Pix direto"; (2) pagamento integrado exige **Mercado Pago, termos próprios e revisão da Política** (dado financeiro do aluno), então não entra antes da revisão jurídica já pendente.

## Como estas decisões se conectam
- A Decisão 1 é a mais barata e destrava as outras: sem vocabulário único, nenhuma integração fica coerente.
- A Decisão 3 define se a Decisão 2 pode ser "um plano": com taxa, a assinatura pode ficar menor; sem taxa, a assinatura precisa carregar a receita.
- Nenhuma delas muda o app hoje. As três mudam **landing, FAQ, Política e Termos** quando forem tomadas; o checklist `/atualizacao_fluxoapp` cobre esses canais.

## O que eu precisaria que você confirmasse
1. Preço atual do marketplace e se os 30 dias de teste são regra ou promoção.
2. Se o pagamento integrado está confirmado no roadmap ou ainda é hipótese.
3. Se a verificação de CREF do marketplace vale também para quem vem do Treino.

## Recomendação resumida
**Vocabulário A (Personal), preço C como destino (A até lá), comissão B (só no pagamento integrado, com texto exato).** Alinhar o prazo de teste agora; o resto espera a revisão jurídica e a integração das bases.
