# UX — PR 5: Meus treinos / Exercícios

- Exercícios: seletor **Do sistema (N) / Meus exercícios (N)** no lugar da lista única com a tag "Meu".
  Cada lista mostra só o que é dela (sistema = `professional_id IS NULL`; meus = `professional_id = auth.uid()`);
  só "Meus" tem o lápis de editar. Criar um exercício leva pra "Meus". Os chips de grupo muscular são
  calculados a partir da lista escolhida (e resetam ao trocar).
- Chips de grupo muscular em `RolagemHorizontal` (rolagem suave, sombra degradê na borda, chip centralizado
  ao escolher, 44px de altura, `aria-pressed`).
- Abas "Treinos planejados / Exercícios" (`ExerciciosTabs`): 36 → 44px de altura de toque.
- Botão de editar do exercício: 44 → 48px.
- `RolagemHorizontal.tsx` é idêntico ao da PR 4 (Financeiro).
