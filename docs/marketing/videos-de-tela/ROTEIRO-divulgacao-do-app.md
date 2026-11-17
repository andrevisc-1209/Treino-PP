# Roteiro · Vídeo de divulgação do app (funcionalidades + preço), v1 (17/11/2026)

Vídeo "institucional" para o Instagram do Personal Perto: um tour das funcionalidades e dos valores em um só Reels. Segue as regras de `docs/MKT-CALENDARIO-30-DIAS.md`
(só dados fictícios, sem dado de saúde, sem citar concorrente, sem prometer resultado, CTA único) e o posicionamento de `docs/MKT-POSICIONAMENTO.md`.

- **Formato:** 1080x1920 (9:16), versão longa de ~81 s para o feed/Reels e versão curta de ~30 s para stories e anúncio.
- **Promessa:** "Você treina. O app cuida da rotina."
- **Preços (confirmar na landing antes de publicar):** Mensal R$ 15/mês; Trimestral R$ 39 (R$ 13/mês); Semestral R$ 60 (R$ 10/mês). Alunos ilimitados, sem taxa por aluno, sem
  comissão sobre a cobrança, 15 dias grátis sem cartão, sem fidelidade, não renova sozinho.
- **Link da bio:** `https://treino.personalperto.com.br/landing.html?utm_source=instagram&utm_medium=bio`

## Versão longa (~75 s)

| # | Tempo | Imagem | Narração (voz) | Texto na tela |
|---|---|---|---|---|
| 1 | 0.0 s | Colagem fictícia: planilha, papel, conversa de WhatsApp bagunçada → corte para a tela Hoje do app | Papel, planilha, WhatsApp e boleto esquecido? Seu dia de personal cabe num app só. | **Tudo num app só** |
| 2 | 6.5 s | Tela **Hoje** (aulas do dia) + notificação do briefing das 5h30 no WhatsApp (dados fictícios) | Toda manhã, a agenda do dia chega no seu WhatsApp: quem treina, a que horas e onde. | Agenda do dia no WhatsApp |
| 3 | 13.0 s | Importar alunos (planilha ou IA) → cadastro (dados, cobrança, saúde, horários) → ficha com o cartão **Contrato** | Traga seus alunos em minutos: por planilha, ou com a ajuda de uma IA. Cadastre dados, cobrança, horários e até o contrato em PDF. | Importar · Cadastrar · Contrato em PDF |
| 4 | 22.9 s | Treino: **Começar** → marcar séries (modo avião visível) → link do treino à distância aberto no navegador | Na academia, marque as séries na hora, mesmo sem sinal. E o treino à distância vai por link: o aluno não instala nada. | Funciona sem sinal · Treino por link |
| 5 | 31.3 s | Ficha do aluno: **Evolução** (gráfico) e histórico; relatório em PDF | O histórico e a evolução de cada aluno ficam prontos para você mostrar o progresso. | Evolução e histórico |
| 6 | 37.1 s | Financeiro: ciclo encerrado → fatura → mensagem pronta → **Abrir WhatsApp** → **Pagas** | No fim do ciclo, o app fecha a conta, gera a fatura e deixa a mensagem pronta. Você envia pelo WhatsApp, e o pagamento é direto com o aluno. | Fatura e mensagem prontas |
| 7 | 47.3 s | Configurações → página pública da agenda → página aberta como visitante → **Aprovar** | Quer encaixar mais aulas? Mande o seu link de agenda: o aluno pede o horário e você só aprova. | Link de agenda |
| 8 | 53.9 s | Tela do consentimento de saúde (sem dado) ou ícone de cadeado + "Meus alunos" | Dados de saúde só com o consentimento do aluno, e cada personal vê apenas os próprios alunos. | Consentimento do aluno (LGPD) |
| 9 | 60.7 s | Cartão de preço animado (ver "Cartão de preço" abaixo) | E o preço? Quinze reais por mês, com alunos ilimitados. Sem taxa por aluno e sem comissão sobre a cobrança. No plano trimestral são trinta e nove reais, e no semestral, sessenta: dez reais por mês. | **R$ 15/mês · alunos ilimitados** |
| 10 | 75.4 s | Logo + link | Teste quinze dias grátis, sem cartão, e sem fidelidade. Link na bio. | **15 dias grátis · sem cartão** |

Texto da narração, para gerar na ElevenLabs (um trecho por arquivo `1.mp3` a `10.mp3`): a coluna *Narração* acima. Números por extenso para a voz não errar.

### Cartão de preço (trecho 9)

Fundo azul-marinho da marca, 3 linhas que entram uma a uma:
1. **Mensal · R$ 15/mês**
2. **Trimestral · R$ 39 (R$ 13/mês)**
3. **Semestral · R$ 60 (R$ 10/mês)**

Rodapé fixo: *Alunos ilimitados · Sem taxa por aluno · Sem comissão · Sem fidelidade*.

## Versão curta (~30 s, stories e anúncio)

Gancho (trecho 1, 5 s) → agenda no WhatsApp (2, encurtado, 5 s) → fatura e mensagem prontas (6, encurtado, 7 s) → preço só do mensal (9 encurtado, 8 s) → CTA (10, 5 s).
Narração: *Papel, planilha e WhatsApp? Seu dia de personal cabe num app só. A agenda do dia chega no seu WhatsApp. No fim do ciclo, a fatura e a mensagem saem prontas. Quinze
reais por mês, alunos ilimitados, sem comissão. Teste quinze dias grátis, sem cartão. Link na bio.*

## O que já temos e o que falta gravar

| Trecho | Material | Situação |
|---|---|---|
| 3 (importar, cadastro) | `importar-alunos_v3_elevenlabs.mp4`, `cadastro-de-aluno_v2_elevenlabs.mp4` (cortar trechos mudos) | Pronto, falta o cartão Contrato da ficha |
| 6 (financeiro) | `cobranca-e-financeiro_v2_elevenlabs.mp4` | Pronto |
| 1 (colagem) | Imagens fictícias de planilha/papel/WhatsApp | A criar |
| 2 (Hoje + briefing) | Gravar Hoje; print do briefing com dados fictícios | A gravar |
| 4 (treino sem sinal e por link) | Gravar a sessão com modo avião; abrir o link do treino à distância | A gravar |
| 5 (evolução) | Gravar a aba Evolução e o relatório PDF (valores fictícios) | A gravar |
| 7 (agenda por link) | Gravar a página pública e a aprovação | A gravar (usa captcha, envio real de teste) |
| 8 (consentimento) | Tela do consentimento (fictícia, sem dado de saúde) | A gravar |
| 9 (preço) | Cartão de preço | Eu monto |

## Legenda e hashtags

**Legenda:** "O app do personal: agenda do dia no WhatsApp, alunos importados em minutos, treino sem sinal, fatura e mensagem prontas, link de agenda e contrato em PDF. R$ 15/mês, alunos
ilimitados, sem comissão. 15 dias grátis, sem cartão. Link na bio."
**Hashtags (máx. 5):** #personaltrainer #gestãodealunos #educaçãofísica #personal #treino

## Cuidados

- Nunca dizer "o app cobra sozinho" ou "recebe o pagamento": o app gera a fatura e a mensagem; o aluno paga direto ao personal.
- Não citar concorrente por nome; não prometer resultado ("vai dobrar sua renda").
- Conferir cada quadro: só nomes, telefones e valores fictícios. Sem dado de saúde.
- Confirmar que os preços e o "15 dias grátis, sem cartão" seguem iguais na landing no dia de publicar.

## Corte v1 (montado com as gravações de 17/11/2026)
- Arquivos: `saida-videos/divulgacao-do-app_v1_sem-audio.mp4` e `..._voz-guia.mp4` . Legenda: `divulgacao-do-app.srt`.
- Trecho 7 mostra o link, a página pública e a aprovação do pedido. Trecho 5 mostra as abas Performance e Evolução (gráficos de carga) de um aluno.
- Trecho 4: o clipe sem sinal (modo avião) tem a faixa de aviso de lesão desfocada. Evitei de propósito a faixa de lesão da ficha, as telas de prontidão (inclusive o gráfico "Prontidão pré-treino"), de medidas corporais e a folha de compartilhamento (aparecem nomes de contatos reais).
- A voz final da ElevenLabs entra no lugar da guia: gerar 10 trechos (`1.mp3` a `10.mp3`) com os textos da coluna *Narração*.

## Versão curta v1 (~27 s) montada, com a narração final da ElevenLabs
Trechos: gancho (áudio `1.mp3`), agenda no WhatsApp (`2.mp3`), fatura e mensagem prontas, preço (só o mensal) e final (`10.mp3`).
Falas novas a gerar na ElevenLabs (as outras três reaproveitam os áudios da versão longa):
- **A:** No fim do ciclo, a fatura e a mensagem saem prontas.
- **B:** Quinze reais por mês, alunos ilimitados e sem comissão.
Legenda: `divulgacao-do-app-curta.srt`.

## Versões montadas (arquivos locais em `saida-videos/`, fora do git)

| Arquivo | Duração | Uso |
|---|---|---|
| `divulgacao-do-app_v3_elevenlabs.mp4` | ~81 s | Feed e Reels longo, com todas as funcionalidades |
| `divulgacao-30s_v1_elevenlabs.mp4` | ~27 s | Reels curto e anúncio (falas: gancho, agenda, fatura, preço, final) |
| `divulgacao-20s_v1_elevenlabs.mp4` | ~18 s | Reels e anúncio (narração da legenda principal, em um áudio só) |
| `divulgacao-stories-9s_v1_elevenlabs.mp4` | ~8,5 s | Stories |
