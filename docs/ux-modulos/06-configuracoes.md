# UX — PR 6: Configurações

- Seções em **acordeões** (`Acordeao.tsx`, cabeçalho de 56px, `aria-expanded`): Dados pessoais (nome, e-mail e CPF,
  só leitura), Localização, Aulas e cobrança, Pix, Notificações. Só a Localização abre sozinha, e só quando o
  estado/cidade ainda não foi preenchido; seções com erro de validação abrem sozinhas.
- **Um único "Salvar alterações"**, fixo acima da bottom nav, que **só aparece quando há alteração** (comparação com
  o que está salvo: aulas/cobrança, Pix e localização). Cada acordeão alterado ganha um ponto âmbar. Valida tudo
  antes de gravar; se algo falha nada é gravado; se uma parte grava e outra falha, só a que falhou continua "suja".
  O interruptor de WhatsApp continua salvando na hora (avisado na própria seção).
- **Teclado virtual** (`src/lib/teclado.ts`, `index.css`, `index.html`): meta `interactive-widget=resizes-content`
  (Chrome/Android encolhe a página com o teclado); ao focar um campo que ficaria atrás do teclado ou de uma barra
  fixa, ele é rolado pro centro; em telas de toque, com um campo de texto focado, a bottom nav e o FAB somem e as
  barras fixas (`data-barra-fixa`) descem pro fundo. As barras seguram o foco no `mousedown` pra o layout não mudar
  no meio do toque.
- Alvos de toque: botão voltar 48px; chips de tipo de chave Pix 44px; linhas de checkbox 48px.
