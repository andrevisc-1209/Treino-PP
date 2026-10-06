# Pós-treino (resumo da sessão)

`src/features/sessoes/PosTreino.tsx` (tela `TreinoConcluidoResumo`) deixou de ser uma tabela de linhas.

- **Hero**: Volume total (com variação vs. último treino do aluno, ou "Mesmo volume" sem histórico)
  e Carga interna com faixa: Leve < 200 · Moderado 200–399 · Forte 400–599 · Muito forte ≥ 600 UA.
- **Grade 2×2**: Duração, Séries concluídas, PSE, Avaliação do personal.
- **Antes → depois**: Prontidão inicial → PSE final (só aparece se a prontidão foi respondida).
- **Conquistas**: "Novo recorde" de volume e/ou maior carga por exercício, comparando com todas as
  sessões concluídas anteriores do aluno. Exercício sem histórico não conta como recorde.
- **Compartilhar resumo**: imagem PNG 1080×1350 desenhada em canvas (sem dependência nova), enviada
  pelo share nativo (WhatsApp/Instagram) ou baixada quando o navegador não suporta.
- **LGPD**: a imagem **não** inclui prontidão/bem-estar; só dados pós-treino.

Lógica pura e testada em `resumoSessao.ts` / `resumoSessao.test.ts`.

## Métricas extras (PR de métricas)

- **Treino em números**: exercícios, séries, repetições e minutos; barra "Cumpriu X% do planejado"
  (séries concluídas ÷ séries dos exercícios que vieram do treino planejado; some em treino livre).
- **Evolução vs. última vez** (até 3): maior carga (+kg) ou, com carga igual, reps da série principal;
  exercício sem carga compara o total de reps. Só melhoras; exercício sem histórico não aparece.
- **Exercício destaque** (maior volume em kg, ignora sem carga) e chips dos grupos musculares.
- **Contexto**: "Treino #N · Kº da semana" / "Primeiro treino registrado 🎯"; "🔥 N semanas seguidas" a partir de 2.
- **Imagem**: volume, exercícios/séries/repetições, destaque, melhor evolução, recorde e PSE; sem carga
  interna, prontidão ou nota do personal.
- Aviso "Confira a duração" no formulário quando < 5 min.
