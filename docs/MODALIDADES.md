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

# Fase 3 — métricas e acompanhamento

Migration `20261022000000_metricas_modalidade.sql`: índice `(professional_id, concluido_em desc)` e a função
`treino.ultima_execucao_por_aluno()` (SECURITY INVOKER: o RLS de `execucoes_assincrono` continua valendo).

- **Performance** (aba na ficha do aluno): seletor das modalidades com execução concluída (abre na mais recente), cards
  (execuções, última, média da métrica, sequência de semanas), gráfico da métrica principal (últimas 20) e log das últimas 10
  com observações e detalhes expansíveis. Métricas em `src/features/execucoes/metricas.ts` (lêem o formato real:
  `detalhes_execucao.resultado.*`; musculação = séries feitas).
- **Lista de alunos**: selo "🏃 há 2 dias" com a modalidade da última execução (só execuções registradas pelo link/aula
  presencial; sessões de musculação não entram).
- **Home**: "Atividade recente" (10 últimas execuções, com ícone de citação quando o aluno deixou observação).

Decisão: **sem materialized view e sem `atualizar-metricas`**. Materialized view não tem RLS (qualquer role com SELECT leria os
alunos de todos os personais) e o volume por personal é pequeno; agregar sob demanda com RLS é barato e nunca fica defasado.

# Pós-Fase 3 — histórico unificado e notificações

Migration `20261023000000_unificacao_historico_notificacoes.sql`.

- **Musculação presencial no histórico**: ao concluir a sessão (Pós-treino), o app também grava em `execucoes_assincrono`
  (`origem = 'presencial'`, `sessao_id` único, mesmo formato das execuções por link + maior carga, PSE e duração). É aditivo e
  tolerante a falha (só registra no console): o salvamento da sessão não muda. Com isso a aba Performance, o selo da lista e o feed
  passam a incluir essas sessões. **Sessões antigas não são retroativas** (só valem a partir do deploy).
- **Notificações do personal** (`treino.notificacoes_professor`): `treino-publico` cria uma notificação quando o aluno conclui
  pelo link. O **sino** (junto da engrenagem, nas telas principais) mostra as não lidas (9+), lista as 20 últimas (não lidas
  primeiro), abre a ficha do aluno na aba Performance e tem "Marcar todas como lidas". **Realtime**: assinatura no layout
  autenticado (`useNotificacoesRealtime`) atualiza o sino e mostra um toast. A observação do aluno **não** vai no payload (texto
  livre, pode citar dor/lesão): é lida da execução quando o personal toca no ícone de citação.

# Ajustes de UX (pós-Fase 3)

- **Abas da ficha**: Resumo · Treinos · Histórico · Performance · Evolução. A aba **Histórico** unifica sessões presenciais,
  aulas presenciais de outras modalidades e treinos feitos pelo aluno pelo link (🏋️ presencial / 📤 assíncrono), do mais recente
  ao mais antigo; execuções que vieram de uma sessão de musculação (`sessao_id`) não aparecem em duplicidade.
- **Datas** no padrão dd/mm/aaaa na ficha (`formatarDataBR`).
- **Iniciar treino de outra modalidade** (escolha de treino da Sessão): passo "Sessão de {modalidade}" com Presencial/Assíncrono
  (padrão = o do treino, troca vale só para essa vez). Presencial abre o registro da aula; Assíncrono envia pelo WhatsApp.
  Treino planejado escolhido é criado no aluno ao iniciar (ou reaproveita a cópia existente). Musculação não muda.
- **Blocos de treino** (natação, corrida, ciclismo, remo, funcional): `modalidade_detalhes.blocos` = lista de
  `{ id, nome, descricao, distancia? (m), duracao?, intensidade?, observacoes? }` (mínimo 1, nome e descrição obrigatórios,
  ↑↓ para reordenar). Aparecem numerados no app, na mensagem de WhatsApp e na página pública `/treino/:token`, onde cada bloco
  vira um item para o aluno marcar. Treinos antigos (campos únicos) aparecem como um bloco "Treino" e viram blocos ao editar.
  Yoga, pilates, boxe, futebol, futevôlei e escalada seguem com campos simples + "Observações gerais".

# Natação com biblioteca de exercícios

Migration `20261024000000_exercicios_natacao.sql` (tabela `treino.exercicios_natacao_custom`, RLS por personal).

- **Biblioteca padrão** (estática): `src/data/natacao-exercicios.ts` — 32 exercícios em 5 grupos (estilos, educativos, acessórios,
  séries, mar aberto); **modelos** em `src/data/natacao-templates.ts` (8). Modelos **não** são copiados para a biblioteca do personal.
- **Formulário** (`src/components/modalidades/NatacaoForm.tsx`): ambiente Piscina/Mar Aberto (trocar com blocos pede confirmação),
  "Começar de um modelo", lista de exercícios com distância (m) ou tempo (s, com valor legível), séries, descanso, ritmo,
  observações, chips de sugestão e ↑↓; adicionar por Biblioteca / Meus exercícios (criar o próprio, ⭐) / Modelos.
- **Dados**: `modalidade_detalhes = { ambiente, blocos: [{ id, exercicio_id, nome, is_custom?, parametros: { distancia | tempo,
  series, descanso, ritmo?, observacao? } }] }`. Total calculado (piscina: Σ distância × séries; mar: tempo + descansos).
- **Exibição**: cada exercício vira item numerado/checklist (referência do treino, página pública, WhatsApp, cards). Treino
  de natação no formato antigo (blocos de texto) continua legível e aparece no formulário para ser refeito.
- Corrida, ciclismo, remo e funcional seguem com os blocos de texto livre.
