# UX — PR 4: Financeiro

- Métricas (A receber / Recebido no mês / Em atraso): **carrossel** deslizável com encaixe no celular
  (`RolagemHorizontal snap`), grade de 3 colunas + gráfico "Recebido nos últimos 6 meses" (Recharts, barras)
  em tablet/desktop (`md+`). O gráfico usa `recebidoPorMes` (`desempenho.ts`, testado): faturas `paga`,
  pelo mês de `paga_em`.
- Filtros (Todos / A fechar / Enviadas / Pagas / Em atraso): **chips** de 44px com rolagem suave, sombra
  degradê na borda onde há mais itens e o chip escolhido é centralizado.
- Pull-to-refresh (`PuxarParaAtualizar`, arquivo idêntico ao da PR 3).
- O rótulo "Receita do mês" do pedido não existe: o app chama de **"Recebido no mês"** — mantido.
- `RolagemHorizontal.tsx` também é usado em Meus treinos (PR 5, arquivo idêntico).
