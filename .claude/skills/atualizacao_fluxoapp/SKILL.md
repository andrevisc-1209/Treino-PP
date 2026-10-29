---
name: atualizacao_fluxoapp
description: Revisa se uma mudança no app (funcionalidade, fluxo, tela, dado coletado) exige atualizar a Central de ajuda (FAQ), o onboarding, a landing page, a Política de Privacidade e os Termos. Rodar ao concluir qualquer tarefa que o personal ou o aluno percebam, antes de abrir a PR, e sempre que o usuário pedir "/atualizacao_fluxoapp".
---

# Atualização do fluxo do app nos canais

Funcionalidade nova que ninguém sabe que existe não vira diferencial. Cada mudança visível ao personal, ao aluno ou ao visitante precisa ser **revisada em todos os canais abaixo**, na mesma PR (ou numa PR irmã aberta junto), antes de pedir o merge.

## Quando rodar
- Funcionalidade nova, fluxo alterado, tela nova, botão novo ou regra de negócio nova (ex.: pacote de aulas, contrato, página pública da agenda).
- Dado novo coletado, guardado ou exibido (qualquer campo novo; qualquer pessoa nova no sistema, como o visitante de uma página pública).
- Mensagem nova de WhatsApp ou e-mail, ou mudança de quem recebe o quê.
- Mudança de preço, limite, plano ou prazo.
- Ao final de cada tarefa, junto com a atualização do `docs/BACKLOG.md`.

Não precisa rodar para correção interna que não muda o que a pessoa vê (refatoração, teste, ajuste de performance). Mesmo assim, diga na PR que revisou e que não se aplica.

## Os canais (revisar um por um)
| Canal | Onde fica | O que conferir |
|---|---|---|
| **Central de ajuda (FAQ do app)** | `src/features/ajuda/artigos.ts` (teste: `artigos.test.ts`) | Existe artigo que ensina o fluxo, passo a passo e com o nome exato dos botões? Os artigos antigos ainda estão certos? Categoria e `sinonimos` para a busca. |
| **Onboarding** | `src/features/onboarding/` (`AtivacaoCard.tsx`, `OnboardingChecklist.tsx`, `ativacao.ts`) e o artigo `primeiros-passos` | O passo novo entra na primeira semana do personal? Lembre: o cartão de ativação tem **um foco só** (3 alunos); passos secundários vão em "Sua rotina" ou no checklist, nunca em cartões concorrentes. O texto do artigo `primeiros-passos` bate com a tela? |
| **Landing page** | `public/landing.html` (seção do sistema, comparação "O que você usa hoje × o Treino", perguntas frequentes, preço) | A novidade é **diferencial de mercado**? Entra na comparação e/ou numa pergunta frequente, com texto factual. Testes: `landing*.test.ts`. |
| **Política de Privacidade** | `src/features/legal/textos.ts` (`PRIVACIDADE_VERSAO`) | Dado novo, pessoa nova, terceiro novo (ex.: captcha), finalidade nova ou retenção nova? Se sim: texto novo **e** versão nova registrada em `treino.documentos_versoes` por migration (o teste `versoesRegistradas.test.ts` cobra). |
| **Termos de Uso** | `src/features/legal/textos.ts` (`TERMOS_USO_VERSAO`) | O personal assume responsabilidade nova (ex.: usar modelo de contrato, divulgar link público, responder a visitantes)? Se sim, texto e versão nova com a mesma migration. |
| **Admin e métricas** | `src/features/admin/` | A novidade precisa de número agregado no painel (nunca dado de aluno)? |
| **Mensagens** | Edge Functions de aviso e `docs/` de e-mail | Texto novo ou destinatário novo; nunca dado de saúde. |

## Regras
1. **Vocabulário** do `CLAUDE.md`: Aula (agenda), Treino, Treino planejado, Prontidão, "Treino à distância" (nunca "assíncrono"), "Personal" (nunca "professor") na interface. Datas dd/mm/aaaa, números com vírgula.
2. **Só afirme o que está pronto e funciona.** Não anuncie na landing ou no FAQ o que depende de migration, deploy ou configuração ainda não feita. Se a funcionalidade for opcional ou estiver desligada por padrão, diga isso.
3. **Texto jurídico (Política e Termos) muda com revisão do dono.** Pode redigir a proposta, mas diga na PR que o texto precisa de revisão de advogado antes de divulgar. Nunca prometa o que a plataforma não garante (ex.: valor jurídico de um contrato-modelo).
4. **LGPD:** dado de saúde nunca aparece em landing, FAQ de exemplo, mensagem de WhatsApp, e-mail ou admin. Dado novo de pessoa nova (visitante) pede finalidade, base legal, retenção e quem é o controlador.
5. **Um foco por tela de onboarding.** Não crie um segundo cartão de primeiros passos; encaixe o passo no que já existe.
6. Texto do FAQ: frases curtas, passos numerados na ordem da tela, em português simples, escrito para quem está na academia com pressa.

## Como entregar
1. Liste os canais e marque cada um: **precisa mudar / não se aplica (por quê) / pendente de decisão do dono**.
2. Faça as mudanças que são só texto do produto (FAQ, onboarding, landing). Para Política e Termos, redija a proposta e deixe a decisão com o dono quando for texto novo de efeito legal.
3. Rode `npm run test` e `npm run build`; os testes de FAQ, landing e versões legais pegam esquecimento.
4. Na descrição da PR, inclua a seção **"Canais revisados"** com a tabela acima preenchida, e no `docs/BACKLOG.md` a linha do que foi atualizado ou ficou pendente.
5. Se a mudança afeta o que já foi divulgado (landing no ar), diga o que precisa de publicação/deploy.

## Exemplo de saída
```
Canais revisados (pacote de aulas)
- FAQ: novo artigo "Vender um pacote de aulas e acompanhar o contador" ✅
- Onboarding: não se aplica (recurso de quem já tem alunos) ✅
- Landing: item na comparação + pergunta frequente ✅
- Privacidade: não se aplica (nenhum dado novo) ✅
- Termos: não se aplica ✅
- Admin: não se aplica ✅
```
