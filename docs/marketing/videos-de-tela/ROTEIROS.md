# Vídeos de tela · roteiros dos 5 primeiros (v1, 13/11/2026)

Complementa `docs/MKT-CALENDARIO-30-DIAS.md` (ritmo, regras de ouro e CTA) e segue o formato de `docs/marketing/semana-1/reels.md`. Estes são os vídeos de **produto**
(a proporção do calendário é 2 de dor para 1 de produto): cada um mostra uma tela do app resolvendo UMA coisa, em 20 a 30 s.

**Como usar:** o vídeo de produto é a "virada" de um gancho de dor. Posta como Reels, fixa os melhores no perfil e reusa nos stories (corte de 10 s) e na conversa de
WhatsApp com quem pergunta "como funciona?". Link da bio: `https://treino.personalperto.com.br/landing.html?utm_source=instagram&utm_medium=bio`.

---

## 0. Antes de gravar

### Conta de demonstração (uma vez)
- **Crie uma conta de demonstração separada**, só para os vídeos (outro e-mail seu). Não use a conta de teste dos testes automáticos: o `npm run e2e:clean` apaga o que tem
  "[E2E]" e os nomes do vídeo não podem ter esse prefixo.
- **Alunos fictícios:** importe `alunos-ficticios.csv` (15 alunos: 14 prontos e 1 "com aviso", o Bruno, de propósito, para mostrar o aviso). Antes, cadastre à mão a **Ana Exemplo** com
  telefone `(11) 90000-0115`, para o vídeo mostrar "já existe" (o app só considera o mesmo aluno se o **nome e o telefone** forem iguais).
- **Telefones inventados** (`90000-0xxx`). Não mande mensagem para eles e não grave com a conta real aberta.
- Para o vídeo 5, deixe o demo com **uma cobrança "por aula" (R$ 100, ciclo no dia 1)** em 2 ou 3 alunos e **3 aulas registradas no ciclo que já terminou**
  (o app só deixa fechar o ciclo a partir do dia seguinte ao último dia dele).
- Para o vídeo 3, tenha **1 treino planejado de musculação** (ex.: "Treino A · peito e tríceps") e **uma aula de hoje** com a Camila Duarte.

### Gravação
- **Gravação de tela do iPhone** (Central de Controle) ou Android, na vertical. Edite em 9:16, 1080 × 1920.
- **Tema:** escolha claro ou escuro e use sempre o mesmo nos 5 vídeos (o app acompanha o tema do celular).
- Liga **Não Perturbe**, tira notificações, deixa o relógio e a bateria limpos. **Confira cada frame**: nenhum nome, telefone ou valor real na tela (regra 1 do calendário).
- **Texto na tela em todos** e legenda automática ligada (muita gente assiste sem som). Voz opcional; se falar, frases curtas e sem jargão.
- Corte as esperas (carregando, teclado). Cada passo no máximo 2 s na tela, senão o vídeo passa de 30 s.
- **Fim de todos:** "15 dias grátis, sem cartão. Link na bio." (3 s, logo + texto).

### O que nunca dizer
- "cobra sozinho" / "recebe o pagamento do aluno" → o app **não cobra o aluno nem processa o pagamento dele**; organiza o ciclo, gera a fatura e deixa a mensagem pronta (regra 4).
- Prometer resultado ("vai dobrar sua renda") ou citar concorrente pelo nome (regra 3).
- Dado de saúde de aluno (regra 2): nos vídeos, nem a etapa "saúde" do cadastro entra.

---

## Vídeo 1 · "Traga todos os seus alunos em minutos" (a importação)  — o mais importante

**Por que primeiro:** o maior freio de quem tem tudo em planilha ou caderno é o custo de trocar de ferramenta (a seção "Traga seus alunos" da landing já ataca isso).
**Gancho de dor:** "Trocar de app e digitar 40 alunos de novo? Não precisa."
**Dados:** para o gancho "40 alunos", use **`lista-baguncada-40-ficticia.txt`** (para colar na IA) e **`alunos-ficticios-40.csv`** (o resultado esperado; os 40 entram "Pronto", sem nenhum dado de saúde nem menor de idade). As versões menores, `alunos-ficticios.csv` (15, com 1 "com aviso") e `lista-baguncada-ficticia.txt`, servem quando quiser mostrar o aviso e o "já existe".

| Tempo | Imagem | Fala | Texto na tela |
|---|---|---|---|
| 0–3 s | Caderno ou planilha bagunçada (pode ser a `lista-baguncada-ficticia.txt` aberta no celular) | "Trocar de app e digitar todos os alunos de novo? Não precisa." | **Digitar 40 alunos de novo?** |
| 3–8 s | App: Alunos → **Adicionar alunos**. Mostra as duas abas: "Colar lista com ajuda de IA · para lista bagunçada" e "Importar planilha · CSV pronto" | "Tem dois caminhos: lista bagunçada ou planilha." | Dois caminhos |
| 8–15 s | Aba da IA → toque em **Copiar prompt para IA** → cola no ChatGPT/Gemini com a lista bagunçada → a IA responde com o CSV → copia e cola no app | "Copio o prompt pronto, a IA organiza a minha lista e eu colo de volta." | Copiar prompt → IA → colar |
| 15–21 s | Tela de conferência: "15 linhas lidas · 14 prontas para importar", o Bruno **"Com aviso"** ("Telefone '1234' inválido: o aluno entra sem telefone"), a Ana **"Já existe"** | "Antes de gravar eu confiro tudo: o app avisa o que está errado e o que já existe." | Você confere antes de salvar |
| 21–26 s | Toque em **Importar N alunos** → tela "N alunos importados" e "Agora, o que falta" (com **Desfazer a importação** visível) | "Importou? Se não gostou, desfaz com um toque." | Até 50 por vez · Desfazer com 1 toque |
| 26–30 s | Logo + link | "15 dias grátis, sem cartão. Link na bio." | **15 dias grátis · sem cartão** |

**Legenda:** "Tem tudo num caderno, no WhatsApp ou numa planilha? Você não precisa digitar de novo. Cole a lista com a ajuda de uma IA ou importe a planilha, confira e pronto, com opção de
desfazer. Até 50 alunos por vez. 15 dias grátis, sem cartão. Link na bio."
**Aviso a incluir no comentário fixado:** "Ao colar dados de alunos numa IA, você envia dados pessoais a um serviço de terceiros: mande só nome, telefone, e-mail, nascimento, sexo e objetivo."
**Hashtags (máx. 5):** #personaltrainer #gestãodealunos #educaçãofísica #personal #treino

---

## Vídeo 2 · "Cadastrar um aluno em 2 minutos"

**Gancho:** "Ficha em papel, planilha, WhatsApp... e eu nunca acho nada."
**Tela:** já existem `prints/editar-aluno-dados.webp` e `prints/editar-aluno-revisao.webp`; melhor ainda é gravar o fluxo em ritmo acelerado.

| Tempo | Imagem | Fala | Texto na tela |
|---|---|---|---|
| 0–3 s | Pilha de papel ou a conversa de WhatsApp bagunçada (fictícia) | "Ficha em papel, planilha, WhatsApp... e eu nunca acho nada." | **Cada aluno em um lugar diferente** |
| 3–8 s | Alunos → novo aluno: **Dados** (nome, telefone, objetivo) | "Primeiro, os dados." | 1 · Dados |
| 8–14 s | **Cobrança** (por aula ou mensal, valor, dia do ciclo) e **Horários** (dias e hora fixos) | "Depois, quanto cobro e quando treina." | 2 · Cobrança · 3 · Horários |
| 14–20 s | **Revisão** → salvar → ficha do aluno | "Reviso e salvo." | 4 · Revisão |
| 20–25 s | Lista de alunos com o novo aluno e a agenda do dia já com a aula | "Pronto: ele já está na agenda e no financeiro." | Já na agenda e no financeiro |
| 25–28 s | Logo + link | "15 dias grátis, sem cartão. Link na bio." | **15 dias grátis · sem cartão** |

**Atenção:** pule a etapa de saúde do cadastro (não mostrar dado de saúde, nem fictício). **Legenda:** "Cadastro do aluno com cobrança e horários em 2 minutos. R$ 15/mês, alunos ilimitados. Link na bio."
**Hashtags:** #personaltrainer #educaçãofísica #personal #gestãodealunos #treino

---

## Vídeo 3 · "Iniciar o treino do aluno, mesmo sem sinal"

**Gancho:** "Planilha que trava na hora do treino, com sinal ruim na academia."
**Dados:** a aula de hoje com a Camila Duarte e o treino planejado "Treino A · peito e tríceps". **Dica:** grave esta parte com o **modo avião ligado** para mostrar que funciona sem sinal (e sincroniza depois).

| Tempo | Imagem | Fala | Texto na tela |
|---|---|---|---|
| 0–3 s | Planilha lenta / ícone de sem sinal | "Planilha que trava na academia, com sinal ruim." | **Sem sinal na academia?** |
| 3–8 s | Tela **Hoje**: aula em foco (quem, que horas, onde) → toque em **Começar** | "Abro o Hoje e toco em Começar." | Hoje → Começar |
| 8–16 s | Escolhe o treino → tela da sessão: marca as séries (carga e repetições), **Adicionar série** | "Marco as séries enquanto ele treina." | Marca cada série na hora |
| 16–21 s | Modo avião visível no topo | "Sem sinal? Funciona igual: sincroniza quando voltar." | Funciona sem sinal |
| 21–26 s | **Finalizar treino** → resumo do treino | "Finalizo e o resumo já fica no histórico dele." | Histórico do aluno |
| 26–29 s | Logo + link | "15 dias grátis, sem cartão. Link na bio." | **15 dias grátis · sem cartão** |

**Legenda:** "Treino marcado série a série, na hora, mesmo com sinal ruim. O resumo vai direto para o histórico do aluno. 15 dias grátis, sem cartão. Link na bio."
**Variações para próximos vídeos:** corrida (distância e tempo) e natação (piscina, séries de nado), cada um em um vídeo próprio.
**Hashtags:** #personaltrainer #treino #personal #educaçãofísica #musculação

---

## Vídeo 4 · "Seus alunos marcam aula sozinhos, você só aprova"

**Gancho:** "Quantas mensagens você responde por dia só para marcar horário?"
**Dados:** a página pública da agenda ligada, com disponibilidade (ex.: seg a sex, 6h às 11h) e 1 ou 2 locais cadastrados.

| Tempo | Imagem | Fala | Texto na tela |
|---|---|---|---|
| 0–3 s | WhatsApp cheio de "tem horário amanhã?" (fictício) | "Quantas mensagens por dia só para marcar horário?" | **Marcar horário no WhatsApp** |
| 3–9 s | Configurações → **Página pública da agenda** → liga **Aceitar pedidos pelo link** → **Copiar link** / **Enviar no WhatsApp** / **Mostrar QR code** | "Eu ligo a página, copio o link ou mostro o QR code na academia." | Link ou QR code |
| 9–16 s | A página pública aberta como visitante: vagas livres, escolhe a **modalidade** e **onde será a aula**, preenche nome e telefone (fictícios) | "O aluno vê só os horários livres, escolhe o local e pede." | O aluno escolhe e pede |
| 16–23 s | Volta ao app: aviso no sino e na Agenda ("pedidos de aula para responder") → **Aprovar** → a aula aparece na agenda | "Eu só aprovo. A aula entra na agenda." | Você só aprova |
| 23–27 s | Logo + link | "15 dias grátis, sem cartão. Link na bio." | **15 dias grátis · sem cartão** |

**Cuidado:** a página pública usa captcha ao enviar. Para gravar o pedido de ponta a ponta, use a conta demo e o próprio celular (um envio real de teste, com nome e telefone inventados).
**Legenda:** "Seu link de agenda: o aluno vê os horários livres, escolhe o local e pede a aula. Você aprova e ela entra na sua agenda. Sem 20 mensagens por dia. Link na bio."
**Hashtags:** #personaltrainer #agenda #personal #educaçãofísica #gestãodealunos

---

## Vídeo 5 · "Cobrança sem constrangimento: fechar o mês e mandar a mensagem pronta"

**Gancho:** "Meu financeiro era o 'esqueci de falar'."
**Honestidade (regra 4):** dizer "mensagem pronta para eu enviar", **nunca** "o app cobra sozinho".
**Dados:** 2 ou 3 alunos por aula com 3 aulas no ciclo que terminou (ver a preparação acima).

| Tempo | Imagem | Fala | Texto na tela |
|---|---|---|---|
| 0–3 s | WhatsApp bagunçado de cobranças (fictício) | "Meu financeiro era o 'esqueci de falar'." | **Cobrar aluno é desconfortável** |
| 3–8 s | **Financeiro** → "Ação necessária": ciclos encerrados para fechar | "No fim do ciclo, o app me avisa quem eu preciso fechar." | O app avisa o fim do ciclo |
| 8–15 s | **Fechar ciclo**: as aulas do ciclo listadas, valor por aula, total | "Eu confiro as aulas, o valor e fecho o ciclo." | Confira e feche |
| 15–22 s | Fatura criada com a **mensagem pronta** → toque para abrir no WhatsApp | "A fatura sai com a mensagem pronta. Eu só envio." | Mensagem pronta · você envia |
| 22–27 s | **Financeiro → Pagas**: quem já pagou no mês, mês a mês | "E aqui eu vejo quem já pagou." | Histórico de pagamentos |
| 27–30 s | Logo + link | "15 dias grátis, sem cartão. Link na bio." | **15 dias grátis · sem cartão** |

**Legenda:** "Cobrança sem constrangimento: o app fecha o ciclo, gera a fatura e deixa a mensagem pronta; você envia no WhatsApp. O pagamento é combinado direto com o aluno. R$ 15/mês, 15 dias grátis, sem cartão. Link na bio."
**Hashtags:** #personaltrainer #personal #gestãodealunos #educaçãofísica #financeiro

---

## Próximos vídeos (ideias)

6. **Treino à distância por link:** o aluno abre o link do WhatsApp e marca as séries, sem instalar nada.
7. **Briefing das 5h30 no WhatsApp:** quem treina hoje, a que horas e onde.
8. **Evolução do aluno:** o gráfico subindo como argumento de renovação (peso e carga fictícios).
9. **Consentimento de saúde do aluno por link** (sem mostrar dado de saúde): "dados de saúde do jeito certo".
10. **Modo escuro e o Hoje no centro:** o app na academia à noite, em 10 s.

## Depois de postar

- Olhe nos **stories e no perfil** quem clicou (UTM `utm_medium=bio` / `story`) e compare no PostHog: `cta_click` → `cadastro_aberto` → `cadastro_enviado` → `perfil_concluido` → `aluno_cadastrado`.
- Reaproveite o vídeo mais assistido em anúncio (R$ 300/mês, `utm_medium=ads&utm_campaign=<tema>`), como diz o `MKT-POSICIONAMENTO.md`.
