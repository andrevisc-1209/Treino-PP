# UX — PR 3: Alunos

- Busca fixa (`sticky`) no topo da lista; abas Ativos/Arquivados com alvo de toque de 44px; botão ⋮ de 48×48.
- `CardDeslizavel`: deslizar o card pra esquerda revela atalhos — **Treino** e **Arquivar** (aba Ativos) ou
  **Restaurar** (aba Arquivados). É atalho: tudo continua no menu ⋮. A rolagem vertical segue normal
  (`touch-action: pan-y`); tocar num card aberto só fecha; depois de arrastar, o clique no link é descartado.
- Ficha do aluno: "Iniciar treino"/"Continuar treino" fica **fixo no rodapé no celular** (acima da bottom nav,
  fora da área das abas) e **no cabeçalho a partir de `md`**.
- `PuxarParaAtualizar` (sem biblioteca, só toque): puxar a tela no topo refaz as consultas ativas. Usado em
  Alunos e Agenda. `body { overscroll-behavior-y: contain }` desliga o pull-to-refresh nativo do navegador.
  `data-sem-puxar` (nas `BottomSheet`) evita disparar com um sheet aberto.
- A mesma `PuxarParaAtualizar` é reaproveitada no Financeiro (PR 4) — o arquivo é idêntico nas duas PRs.
