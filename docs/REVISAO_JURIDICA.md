# Dossiê para a revisão jurídica: Política de Privacidade 1.11 a 1.16, Termos 1.7 e contrato-modelo

Preparado em 12/11/2026 para quem for revisar (advogado de proteção de dados). **Não é parecer jurídico**: é o inventário do que o produto faz e do que os textos dizem, para a pessoa revisar o texto contra a prática. Textos vigentes: `src/features/legal/textos.ts`. A prática está nas migrations e funções citadas.

Quem somos no tratamento: o **Personal Trainer** é controlador dos dados dos alunos e dos visitantes da agenda; a plataforma (Treino · Personal Perto) é **operador** nesses casos, e **controladora** dos dados do próprio personal (cadastro, cobrança, uso do app). Dados de saúde dos alunos existem (lesão, cirurgia, medicamentos, prontidão), com consentimento do aluno, e **nunca** aparecem em mensagens, e-mails, administração ou logs.

## Resumo do que mudou em cada versão
| Versão | O que passou a ser tratado | Quem vê | Prazo de guarda | Base legal declarada | Código |
|---|---|---|---|---|---|
| **1.11** | CPF e endereço **opcionais** do aluno, para preencher a minuta de contrato em PDF | Só o personal (RLS). A administração não vê; não vai a relatórios, mensagens nem CSV | Enquanto o aluno existir; apagado com a conta | Execução de contrato (art. 7º, V), como declara o texto | `20261086…` |
| **1.12** | **Página pública da agenda**: visitante informa nome, telefone, mensagem curta e confirma contato por WhatsApp; antirrobô Cloudflare Turnstile (recebe IP e dados do navegador) | Só o personal. Administração só vê totais | Pedido que não vira aula: **30 dias** | Procedimentos preliminares a contrato (art. 7º, V) + consentimento (art. 7º, I) | `20261089…`, `agenda-publica` |
| **1.13** | Números do resultado da página (pedidos, tempo de resposta) para o personal; **totais** para a administração | Personal: os dele. Admin: só totais, sem nome, telefone, mensagem nem id | n/a (agregados) | O texto **não declara uma base específica** para os totais da administração: apenas afirma que só vê totais. Pedido: indicar a base (ex.: legítimo interesse) | `20261093…` |
| **1.14** | **Lista de espera**: visitante informa nome, telefone, dia e turno. A plataforma **não** envia mensagem ao visitante; quem chama é o personal, por WhatsApp | Só o personal. Administração nunca | **14 dias** (ou até o dia pedido passar) | Consentimento + procedimentos preliminares | `20261094…`, `supabase/cron/lista_espera.sql` |
| **1.15** | O personal **pode publicar** CREF, modalidades, locais e "valor a partir de" na página pública | Qualquer pessoa com o link | Até o personal apagar ou excluir a conta | Consentimento do próprio personal (ele escolhe e digita) | `20261095…` |
| **1.16** | **Foto opcional** do personal na página pública; **3 eventos novos de uso no app** (registrar aula, 1ª série, checklist concluído) e uma propriedade `barra` (padrão ou Hoje no centro) | Foto: qualquer pessoa com o link. Eventos: PostHog, só com aceite | Foto: até remover ou excluir a conta. Eventos: conforme o PostHog | Consentimento (art. 7º, I) | `20261099…`, `analytics.ts` |

## Pontos que peço atenção especial
1. **Visitantes da agenda (1.12 e 1.14).** O personal é controlador, mas a plataforma recolhe os dados pelo formulário. O aviso ao visitante está na página? (A página mostra o consentimento de contato por WhatsApp, **desmarcado por padrão**.) Falta um link direto da página pública para a Política? Confirmar se basta.
2. **Prazos de eliminação.** 30 dias (pedido), 14 dias (espera). São executados por jobs `pg_cron` (`supabase/cron/pedidos_agenda.sql`, `supabase/cron/lista_espera.sql`). O texto diz "até 30 dias" e "até 14 dias". Está compatível?
3. **Cloudflare Turnstile.** Recebe IP e dados do navegador do visitante. A Política cita; avaliar se exige menção específica a transferência internacional (EUA).
4. **Foto (1.16).** Dado pessoal do próprio personal, publicado por ele, visível a quem tem o link e indexável se o link circular. Guardada junto ao cadastro (campo no banco, ≤ 60.000 caracteres), apagada ao remover ou ao excluir a conta. Avaliar: precisa de aviso antes do envio além do texto "fica visível a qualquer pessoa com o link"? Foto de terceiros: o app não impede que o personal envie foto de outra pessoa; precisa de cláusula nos Termos?
5. **Medição de uso (1.16).** PostHog só carrega depois do aceite, sem cookies (localStorage), sem identify, sem gravação de sessão, e trata o **Global Privacy Control como recusa**. Eventos nomeados, sem conteúdo. Um teste automatizado trava a lista de sete eventos e a única propriedade (`barra`) contra o texto da Política. Avaliar se "dado anônimo" é afirmação segura (há identificador no navegador) ou se convém falar em "pseudonimizado".
6. **Transferência internacional (art. 33).** Supabase (EUA) e PostHog (EUA). A seção 4.1 existe; confirmar mecanismo (cláusulas-padrão / consentimento) conforme a regulamentação da ANPD.
7. **Exclusão da conta.** 30 dias de carência, depois eliminação definitiva, **exceto** o livro de pagamentos do plano, guardado 5 anos sem identificar a pessoa (obrigação legal tributária). Conferir se "sem identificação" é verdadeiro na prática (`finalizar_exclusoes_vencidas`).
8. **Direitos do titular dos alunos e visitantes.** Como o personal é o controlador, o canal para o aluno exercer direitos passa pelo personal. A Política deixa isso claro? Existe e-mail da plataforma (contato@personalperto.com.br) para o aluno que não consegue falar com o personal?
9. **Dado de saúde.** Consentimento do aluno por link (e-mail ou WhatsApp, com prova do aceite: data, hora, versão, IP). Texto e fluxo estão em `docs/CONSENTIMENTO_SAUDE.md`. Revisar a base do art. 11 e a forma de revogação.
10. **Menores.** O app não verifica idade do aluno. Há texto sobre responsável legal? Confirmar.

## Termos de Uso (versão 1.7)
Pontos de atenção: cláusula 2.6 (direito de arrependimento) e 2.8 (exclusão sem reembolso do plano vigente); 5.3 (conteúdo inserido pelo personal é dele); 6.1 e 6.2 (limitação de responsabilidade ao valor pago); 3.4 (a plataforma é controladora só dos dados do personal). Os Termos **não** foram alterados nas PRs de 11 e 12/11/2026 (a versão em vigor é a 1.7). Considerar se a publicação de foto e informações profissionais (1.15 e 1.16) pede uma cláusula de **conteúdo publicado pelo personal** (responsabilidade pela veracidade do CREF e pelos direitos sobre a foto).

## Contrato-modelo (minuta em PDF do aluno)
Texto-base em `src/features/contrato/contrato.ts` (cláusulas numeradas, preenchido com dados do aluno e da cobrança). O produto gera a minuta; **não** a assina nem a guarda, e não dá aconselhamento jurídico ao personal. Pedido: revisar o texto-base e o aviso de que a minuta é um modelo que o personal deve adaptar. Pontos: multa e cancelamento, reposição de aulas, cobrança de falta, foro, e consentimento de saúde remetendo ao fluxo próprio.

## O que a plataforma **não** faz (para o revisor não procurar)
- Não vende nem compartilha dados para marketing. Não usa dado de aluno em análise de uso.
- Não mostra dados de aluno nem de visitante à administração, só totais agregados.
- Não envia mensagem automática ao visitante da agenda.
- Pagamento de aluno: não passa pela plataforma (Pix do próprio personal). **Pagamento integrado (Mercado Pago) com taxa por transação ainda não existe**: se entrar, exige nova revisão (ver `DECISOES_ESTRATEGICAS.md`).

## Perguntas objetivas para o revisor
1. As bases legais declaradas em cada versão estão corretas e suficientes?
2. Os prazos (14, 30 dias, 5 anos) estão bem descritos e são defensáveis?
3. A afirmação de que os eventos de uso "não são ligados ao seu nome nem ao seu cadastro" é segura?
4. Falta alguma obrigação de transparência na página pública (aviso ao visitante, DPO/encarregado, canal de direitos)?
5. Precisamos de cláusula nos Termos sobre conteúdo publicado pelo personal (foto, CREF)?
6. O encarregado (DPO): é obrigatório indicar e divulgar? Quem, e onde?
7. O RIPD (relatório de impacto) é recomendável, dada a existência de dado de saúde?

---
Nota de método: as bases legais da tabela são as que o **texto vigente** declara (conferidas em `textos.ts`); onde o texto não declara, a tabela diz isso. Termos e cláusulas citados foram conferidos pelo número no texto; o contrato-modelo foi descrito pela estrutura do código, sem revisão do conteúdo jurídico.
