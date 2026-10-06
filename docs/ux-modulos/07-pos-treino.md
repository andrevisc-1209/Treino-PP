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
