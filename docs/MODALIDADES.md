# Treino multimodalidade — Fase 1

O "treino" do aluno é a tabela `treino.planos` (não existe `treino.treinos`). A migration
`20261020000000_modalidades_treino.sql` acrescenta a ela:

| Coluna | Valores |
|---|---|
| `modalidade` (enum `treino.modalidade_tipo`) | musculacao (padrão), corrida, natacao, ciclismo, funcional, futebol, futevolei, pilates, yoga, boxe, escalada, remo |
| `tipo_execucao` | `sincrono` (padrão, presencial) · `assincrono` (enviado ao aluno) |
| `modalidade_detalhes` (jsonb) | métricas da modalidade, ex.: corrida `{ "distancia_km": 5, "pace_alvo": "5:30" }` |

Planos existentes ficam `musculacao` + `sincrono` — nada muda para eles.

## App
- `src/types/modalidades.ts`: configuração de campos por modalidade + helpers (`montarDetalhes`, `resumoModalidade`, `linhasDetalhes`).
- `ModalidadeForm` (criar do zero e editar treino): grade de modalidades, Presencial/Assíncrono e campos dinâmicos.
  Musculação segue o fluxo de sempre (vai para o editor de exercícios).
- Cards da aba Treinos: selo da modalidade, "📤 Assíncrono" e a métrica-chave ("10 km · pace 6:00/km").
- Assíncrono: botão enviar (no card e logo após criar) abre o WhatsApp com a mensagem pronta
  (`src/lib/mensagemTreino.ts`). Telefone do aluno válido → abre a conversa dele; senão, escolher o contato.
  Só vai o que o personal montou para o treino — nunca a ficha de saúde.

## Limites da Fase 1 (resolvidos na Fase 2, exceto o último)
- ~~Treino de outra modalidade não executável~~ → ver Fase 2.
- ~~"Treino planejado" sem modalidade~~ → ver Fase 2.

# Fase 2 — execução e check-off

Migration `20261021000000_execucao_treino_modalidade.sql` (rodar **antes** do merge).

## Aluno sem conta: link público `/treino/:token`
1. **Enviar** (treino assíncrono): chama `gerar-link-treino` (JWT do personal) → link de 7 dias e uso único em
   `treino.links_treino_assincrono` (reaproveita o link se ainda válido) → entra na mensagem de WhatsApp.
2. A página pública fala **só com a Edge Function `treino-publico`** (`verify_jwt = false`): `consultar` devolve o treino
   e o *primeiro* nome do aluno (nada de telefone/e-mail/ficha de saúde); `concluir` valida o resultado
   (`_shared/execucao.ts`: só campos conhecidos, séries ≤ planejado, textos limitados), grava em
   `treino.execucoes_assincrono` e queima o link. **As tabelas não têm acesso anônimo** — o aluno não tem `auth.uid()`.
3. Musculação: série a série com check, observação por exercício e barra de progresso. Outras modalidades: prescrição de
   referência, exercícios livres para marcar, campos de resultado (`RESULTADO_CAMPOS`) e observações.
   O progresso fica salvo no navegador (sinal ruim) até concluir.

## Personal
- **Execuções** (nova aba na ficha do aluno): execuções por link e aulas presenciais, com detalhes legíveis e observações.
- **Presencial fora da musculação**: ▶ no card do treino (ou na escolha de treino da Sessão) abre a folha com a prescrição,
  checklist e resultado; grava em `execucoes_assincrono` com `origem = 'presencial'`. *Não passa por pré-treino/PSE/agenda
  (só musculação usa esse fluxo) — fica para uma próxima fase.*

## Treinos planejados (modelos)
`treino.modelos` ganhou modalidade/execução/detalhes. Criar e editar em "Treinos planejados" usa o mesmo formulário;
**exercícios livres** (`modalidade_detalhes.exercicios_livres`: lista de `{ nome, descricao? }`) existem em todas as
modalidades exceto musculação. Aplicar um planejado a um aluno, duplicar e "Salvar como treino planejado" copiam
modalidade, execução e exercícios livres.
