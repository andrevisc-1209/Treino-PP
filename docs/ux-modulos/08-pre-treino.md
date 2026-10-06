# Pré-treino (wizard de perguntas)

`NovaSessaoPage.tsx` + `components/ScaleQuestion.tsx`.

- **Slider**: balão escuro "7 / 10 · Moderada" acima do polegar só durante o arraste; ao soltar o valor
  fica como label fixo abaixo da barra. `onChange` continua disparando uma única vez no `pointerup`.
- **Chips** (`1 Nenhuma · 3 Leve · 5 Moderada · 8 Forte · 10 Extrema`, prop `chips`): tocar move o
  valor; arrastar a barra deixa o chip desmarcado.
- **Celular**: botão fixo no rodapé ("Avançar (n/4)"; na última, "Confirmar e iniciar treino" que já
  inicia a sessão). A auto-avançada de 300 ms foi removida (conflitava com chips/botão). A tela
  "Resumo" separada saiu: a prontidão e o alerta (sono baixo/dor alta) aparecem na última pergunta.
- **Animação**: slide lateral entre perguntas (esquerda ao avançar, direita ao voltar; respeita
  `prefers-reduced-motion`).
- **Tablet/desktop (≥ md)**: modal único com as 4 perguntas em coluna e um botão "Confirmar e iniciar treino".
