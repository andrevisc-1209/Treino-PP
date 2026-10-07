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

## Limites da Fase 1
- Treino de modalidade ≠ musculação **não tem exercícios**, então ainda **não dá para executar pela tela de Sessão**
  (pré/pós-treino, PSE); na escolha de treino ele aparece informativo.
- "Treino planejado" (modelos) e "Salvar como treino planejado" ainda não carregam a modalidade.
