# Sobre esta pasta

O plano original desta auditoria previa capturar screenshots de todas as telas em
390px, 820px e 1280px e salvá-las aqui, com os achados linkando para o arquivo de
imagem correspondente.

Na execução, o ambiente de browser disponível (painel embutido do Claude Code)
não expõe um jeito de persistir os PNGs capturados em disco — as capturas de tela
retornam como imagens inline para a análise, mas não há uma ferramenta de "salvar
como arquivo" no toolset desta sessão. Depois de confirmar que não havia
contorno viável (checei diretórios temporários do bridge do browser, não há PNGs
persistidos), o formato de evidência foi ajustado:

- Toda tela relevante foi navegada e inspecionada visualmente ao vivo nos 3
  breakpoints (para as telas centrais das 5 jornadas) ou em 390px (para telas
  secundárias/de configuração), com o conteúdo textual e a árvore de
  acessibilidade extraídos a cada passo.
- Onde a heurística pede um número objetivo (contraste, tamanho de alvo de
  toque), o cálculo foi feito a partir do valor real do design system
  (`src/index.css`, classes Tailwind) em vez de medir um screenshot — é mais
  preciso e fica citável por arquivo:linha no relatório.
- Cada achado no `RELATORIO.md` cita o arquivo e a linha de código (ou o grep)
  que sustenta a evidência, em vez de um link de imagem.

Se quiser as imagens de fato, a forma mais rápida é rodar `npm run dev` e
reproduzir os passos de cada jornada listados no relatório — nenhum dado extra
de setup é necessário além dos 6 alunos e 3 treinos planejados já existentes
no banco de teste usado nesta auditoria.
