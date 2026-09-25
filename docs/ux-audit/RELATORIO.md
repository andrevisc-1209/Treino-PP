# Auditoria de UX — Treino-PP

**Data**: 25/09/2026 · **Escopo**: app inteiro (rotas em `src/App.tsx`), foco nas 5 jornadas do personal trainer no celular, na academia.

## Metodologia (leia antes dos achados)

O app foi navegado ao vivo (`npm run dev`) com uma conta de teste real, em 390px / 820px /
1280px para as telas centrais de cada jornada e em 390px para telas secundárias. A base de
dados de teste usada tem 6 alunos variados (lesão + cirurgia + horário fixo + cobrança por
aula, dupla/grupo, cobrança mensal, ficha incompleta, objetivo de hipertrofia, aluno vazio),
3 treinos planejados com exercícios e um com 0 exercícios (para testar o estado vazio), e
sessões já registradas no histórico.

**Sobre as evidências**: o ambiente de browser desta sessão não tem uma ferramenta para
persistir screenshots como arquivo (só retorna a imagem inline para análise — ver
[screens/README.md](screens/README.md) para o detalhe). Para manter o relatório verificável,
cada achado cita **arquivo:linha de código** ou um comando de grep reproduzível em vez de um
link de imagem — o que também tem a vantagem de ser precisamente checável (contraste e
tamanho de alvo de toque, por exemplo, foram calculados a partir dos valores reais do design
system, não estimados a olho de um screenshot).

---

## Resumo executivo

O app é funcional e a maior parte dos fluxos individuais funciona bem, mas o modelo mental
"treino planejado × plano do aluno" (dois objetos parecidos, nomes inconsistentes, cópia sem
sincronismo automático completo — o bug corrigido no PR #15 é sintoma disso) é a maior fonte
de confusão, e o vocabulário muda de tela pra tela (plano/treino/sessão/aula para conceitos
sobrepostos). A jornada mais crítica, "dar a aula", leva ~9 toques do zero até a primeira
série registrada — viável, mas dá pra cortar quase pela metade. Faltam dois recursos que o
contexto de uso (academia, sinal ruim, pressa) torna importantes: indicador de offline e
alerta proativo de ciclo financeiro a fechar. Acessibilidade tem dois problemas objetivos e
baratos de corrigir: a cor de marca usada como fundo com texto branco fica abaixo do mínimo
de contraste AA, e os botões de reordenar exercício são menores que o alvo de toque mínimo.

---

## Achados

| ID | Tela | Problema | Evidência | Heurística | Sev. | Esforço | Recomendação |
|----|------|----------|-----------|------------|:---:|:---:|---|
| F05 | Todo o app (chips/toggles selecionados, botões primários em ~15 arquivos) | `bg-brand` (#16a34a) + texto branco = contraste **3.30:1**, abaixo do mínimo AA de 4.5:1 para texto normal | Calculado de `src/index.css:4`; usos em `src/components/ui.tsx:13`, `AlunoFormPage.tsx:124`, `ExerciciosPage.tsx:105,116`, `SessaoPage.tsx:65`, `FaturaPage.tsx:271`, `CobrancaForm.tsx:39`, `HorarioFormSheet.tsx:93,130`, `ConfiguracoesPage.tsx:128`, `AulaAcoesSheet.tsx:289`, `NovaAulaAvulsaSheet.tsx:92`, `ExerciciosEditor.tsx:195,206` | Acessibilidade (WCAG 1.4.3) | **3** | P | Trocar o texto para `brand-dark` (5.02:1, já usado como estado `active:`) ou usar `bg-brand-dark` como fundo nesses estados; é uma troca de token, não de layout |
| F06 | Editor de plano/treino planejado — botões "Mover para cima/baixo" | Alvo de toque de **32×32px** (`size-8`) com ícone `text-slate-400` (contraste 2.56:1) — abaixo do mínimo de 44px e do mínimo de contraste para componentes de UI (3:1) | `src/components/ExerciciosEditor.tsx:134-148` (compare com o botão "Editar" ao lado, `size-11` = 44px, linha 162) | Acessibilidade / H8 | **3** | P | Subir para `size-11` e trocar `text-slate-400` por `text-slate-500` ou `text-slate-600` |
| F10 | App inteiro | Vocabulário inconsistente entre código, rota e rótulo visível para os mesmos 2-3 conceitos | Ver seção [Inventário de vocabulário](#inventário-de-vocabulário-e-glossário-proposto) | Consistência e padrões (#4) / H2 | **3** | G | Adotar o glossário proposto abaixo; migração incremental (rótulos primeiro, código depois) |
| F01 | Hoje → Sessão | Jornada "dar a aula" leva **9 toques** do zero até a 1ª série registrada | Rastreado em `AulaCard.tsx:19` → `AulaAcoesSheet.tsx:157` → `NovaSessaoPage.tsx` (seleção de treino, 4 perguntas com auto-avanço em `responderMobile` linha 166-178, tela "resumo", `comecarTreino` linha 192) → `SessaoPage.tsx` | Eficiência de uso (#7) / H5 | **3** | M | Ver seção [Jornada antes × depois](#jornada-dar-a-aula-antes--depois) |
| F08 | Ficha do aluno (cabeçalho) | Badges de dados demográficos (idade, sexo, altura, peso, objetivo) e alertas de saúde (lesão, cirurgia, medicamentos) usam o mesmo componente `<Badge>` sem nenhuma distinção visual | `src/features/alunos/AlunoFichaPage.tsx:125-135` | Reconhecimento em vez de memorização (#6) / H7 | **3** | P | Alertas de saúde em um badge com cor de atenção (ex. `amber`/`red`) e ícone, sempre antes dos demográficos |
| F12 | App inteiro | Nenhuma detecção de estado offline (`navigator.onLine`/equivalente não aparece em nenhum lugar do código), apesar do contexto de uso ser academia com sinal ruim | `grep -rn "navigator.onLine\|offline\|isOnline" src` → 0 resultados | Visibilidade do status do sistema (#1) / H4 | **3** | M | Banner fixo "Sem conexão — as alterações serão enviadas quando a internet voltar" (dá pra combinar com fila de mutations do TanStack Query) |
| F04 | Ficha do aluno / aba Treinos | "Iniciar treino" (topo da ficha) e "Novo plano" (aba Treinos) usam o mesmo `Button` `variant="primary"` — cor, peso de fonte e largura idênticos — e ficam visíveis ao mesmo tempo quando a aba Treinos está aberta | `src/components/ui.tsx:8-19` (variant primary), `AlunoFichaPage.tsx:137-141`, `PlanosTab.tsx:144-146` | Hierarquia visual / Estética minimalista (#8) / H3 | **2** | P | "Novo plano" deveria usar `variant="ghost"` ou um estilo secundário — só "Iniciar treino" é a ação primária da ficha |
| F09 | Ficha do aluno, aba Resumo | Uma aba só empilha 7 seções heterogêneas em rolagem contínua: Dados, Horários fixos, Cobrança, Financeiro do ciclo, Consentimento LGPD, Peso, Arquivar aluno | `src/features/alunos/AlunoFichaPage.tsx:162-224` | Estética e design minimalista (#8) | **2** | M | Dividir em sub-seções colapsáveis ou em abas próprias (Dados / Financeiro / Saúde) |
| F07 | Arquivar aluno, Revogar LGPD, Excluir plano/modelo/exercício, Pular exercício, Cancelar sessão/fatura, Encerrar horário fixo | 11 usos de `confirm()` nativo do navegador para ações destrutivas — visual fora do app, não estilizável, comportamento inconsistente em PWA instalado | `grep -rn "confirm(" src` → `AlunoFichaPage.tsx:91,97`, `PlanoOrigemBadge.tsx:34`, `PlanosTab.tsx:135`, `ModelosPage.tsx:72`, `ExerciciosPage.tsx:80`, `SessaoPage.tsx:176,270`, `FaturaPage.tsx:155`, `HorariosFixosBlock.tsx:83`, `ExerciciosEditor.tsx:117` | Consistência e padrões (#4) / H11 | **2** | M | Um `<ConfirmSheet>` único (BottomSheet já existe no design system) reaproveitado nesses 11 pontos |
| F11 | App inteiro | Carregando = só texto "Carregando…" sem skeleton (23 ocorrências); erro = `(error as Error).message` cru, podendo expor mensagem técnica do Postgres/Supabase (12 ocorrências) | `grep -rn "Carregando…" src \| wc -l` → 23; `grep -rn "(error as Error).message" src \| wc -l` → 12 | Visibilidade do status / Mensagens de erro em linguagem do usuário (#1, #9) | **2** | M | Skeleton simples nas listas mais usadas (Alunos, Agenda, Treinos); mapear os erros comuns do Supabase (RLS, rede, validação) para mensagens em português |
| F13 | Alunos | Busca de aluno existe, mas só dentro da tela Alunos — não é acessível de Hoje/Agenda/Financeiro | `src/features/alunos/AlunosPage.tsx:14,35` | Reconhecimento em vez de memorização (#6) / H12 | **2** | M | Ícone de busca persistente na navegação inferior ou no topo de qualquer tela |
| F14 | Financeiro / Hoje | "A fechar" existe como filtro passivo dentro de Financeiro; nada alerta proativamente em Hoje quando um ciclo está para fechar | `src/features/financeiro/FinanceiroPage.tsx:55-59,132-138`; ausente em `HojePage.tsx` | Visibilidade do status do sistema (#1) / H12 | **2** | M | Card/banner em Hoje quando há ciclos "a fechar" nos próximos N dias |
| F15 | Primeiro acesso | Nenhum onboarding/tour para um personal trainer novo no app | `grep -rln "onboarding\|tour\|primeiro acesso" src` → 0 resultados | Ajuda e documentação (#10) / H10 | **2** | M | Tour curto (3-4 telas) no primeiro login, ou um estado vazio mais didático em Alunos/Meus treinos |
| F16 | Todas as telas exceto Agenda e Pré-treino | Layout não responde além de 672px; em 1280px sobra ~600px de espaço vazio nas laterais, sem visão lista+detalhe | `grep -rn "max-w-2xl" src/features \| wc -l` → 19; `grep -rn "lg:\|md:\|xl:" src/features` → só 5 ocorrências, em `NovaSessaoPage.tsx` e `AgendaPage.tsx` | Flexibilidade e eficiência de uso (#7) / H9 | **2** | G | Em Alunos e Meus treinos (as listas mais navegadas), layout lista + detalhe a partir de `lg:` |
| F02 | Escolher treino (Nova sessão) | Nenhuma sugestão do próximo treino do rodízio (A→B→C) ao escolher o treino da sessão | `grep -rln "rodízio\|rotina\|proximoTreino" src` → 0 resultados | Reconhecimento em vez de memorização (#6) / H5 | **2** | G | Guardar a ordem dos treinos planejados do aluno e destacar "Sugerido: Treino B (última vez foi A)" |
| F03 | Ficha do aluno / Nova sessão | Modelo de dados "plano do aluno" é uma cópia do "treino planejado" sem sincronismo automático completo — precisa de reconciliação manual quando os dois divergem (comportamento corrigido parcialmente no PR #15, mas a decisão em caso de conflito ainda é do usuário) | `src/features/planos/PlanoOrigemBadge.tsx`, `src/features/planos/compare.ts`, PR #15 | Consistência / Modelo mental do usuário / H1 | **2** | — (parcialmente resolvido) | Ver discussão em H1 abaixo — resolver de vez exige repensar o modelo de dados, não só a UI |
| F17 | Hoje / Agenda | "Hoje" e "Agenda" (visão Dia, na data de hoje) renderizam essencialmente a mesma lista de `AulaCard` | `src/features/agenda/HojePage.tsx` vs `src/features/agenda/AgendaPage.tsx` | Consistência e padrões (#4) / H6 | **1** | M | Não fundir as duas (Agenda cobre semana/navegação de datas, Hoje é o "hub" do dia), mas considerar linkar diretamente de Hoje para a Agenda na data certa em vez de duplicar a renderização |
| F18 | Histórico do aluno | Sessão registrada a partir de um treino planejado depois excluído aparece como "Treino Teste Nome · plano excluído", sem explicação do que isso significa pro personal | Observado ao vivo no Histórico de Carla Mendes (dado real da conta de teste) | Reconhecimento / Prevenção de erros (#5, #6) | **2** | P | Trocar o rótulo cru por algo como "Treino planejado removido — os exercícios ficam preservados nesta sessão" |
| F19 | Cadastro de aluno, etapa 5 (Revisão) | A revisão final mostra Dados/Cobrança/Saúde mas **não lista o horário fixo** cadastrado na etapa 4 — o personal não consegue conferir antes de salvar | Observado ao vivo (cadastro de "Roberto Almeida"); a etapa de revisão em `AlunoFormPage.tsx` não tem seção de horários | Visibilidade do status do sistema (#1) | **2** | P | Adicionar seção "Horários" na revisão, igual às outras |
| F20 | Lista de Alunos | Rótulo "Ficha incompleta" aparece mesmo em aluno com cobrança e horário fixo cadastrados (faltam só campos opcionais como nascimento/altura) — critério do rótulo não é óbvio | Observado ao vivo ("Roberto Almeida": mensal R$400 + horário fixo, ainda mostra "Ficha incompleta") | Reconhecimento em vez de memorização (#6) | **1** | P | Trocar por um indicador específico ("Sem data de nascimento") ou tornar o critério visível ao tocar |

---

## Inventário de vocabulário e glossário proposto

Grep de rótulos visíveis (`grep -rnoE` em `src/features`) por conceito, junto com o nome
usado no código/rotas:

| Camada | Termo usado | Onde |
|---|---|---|
| Tabela/tipo no código | `modelos` / `Modelo` | `src/features/modelos/api.ts` |
| Rota | `/meus-treinos/planejados` | `App.tsx:46-49` |
| Rótulo na UI | **"Treino planejado"** | `ModelosPage.tsx:79,80,128,165`, `ModeloEditorPage.tsx:50,103`, `NovaSessaoPage.tsx:359,388,406`, `PlanosTab.tsx:211,238` |
| — | | |
| Tabela/tipo no código | `planos` / `Plano` | `src/features/planos/api.ts` |
| Rota | `/alunos/:id/planos/:planoId` | `App.tsx:39` |
| Rótulo na UI | **"Plano"** e **"Treino"**, alternando | `PlanosTab.tsx:145,194,281,331` ("Novo plano", "Editar plano", "Treino A") vs `NovaSessaoPage.tsx:281` ("Treinos do aluno") |
| — | | |
| Tabela/tipo no código | `sessoes` (implícito pela rota) | `App.tsx:40-42` |
| Rótulo na UI | **"Sessão"** (`HistoricoTab.tsx:9`, `SessaoPage.tsx:277,390`) *e* **"Treino"** (`SessaoPage.tsx:183` "Tempo de treino", `NovaSessaoPage.tsx` "Pré-treino"/"Pós-treino") |
| — | | |
| Conceito à parte | **"Aula"** = compromisso na agenda | `AgendaPage.tsx:29`, `HojePage.tsx:51`, `AulaAcoesSheet.tsx:269` — distinto de sessão, mas 1 aula pode gerar 1 sessão |

**Glossário proposto** (um termo por conceito, em todas as camadas onde for viável trocar
sem quebrar nada):

- **Treino planejado** — o modelo reutilizável, sem aluno vinculado, criado em "Meus
  treinos". (Já é o termo mais usado na UI — manter, mas alinhar `Modelo`/`modelos` no
  código só como detalhe de implementação, nunca vazar pro usuário.)
- **Plano do aluno** — a cópia atribuída a um aluno específico, editável independente do
  treino planejado de origem. Parar de chamar de "Treino" solto ("Treinos do aluno" →
  "Planos do aluno", ou manter mas ser consistente em 100% dos lugares).
  do aluno.
- **Sessão** — o registro de uma execução real (pré-treino, séries, pós-treino). Nunca
  chamar de "treino" como substantivo — "treino" fica reservado para verbo/ação
  ("Iniciar treino") ou para os dois objetos acima.
- **Aula** — o compromisso da agenda (horário + aluno(s) + status). Pode ou não ter uma
  Sessão associada.

---

## Veredito das hipóteses

| # | Hipótese | Veredito | Por quê |
|---|---|---|---|
| H1 | Separação plano×treino planejado confunde o modelo mental | **Confirmada** | O próprio PR #15 (corrigido nesta mesma branch de trabalho) existe porque a cópia congelava e não sincronizava — sintoma direto da confusão. Ver F03, F10. |
| H2 | Vocabulário inconsistente | **Confirmada** | Ver Inventário de vocabulário acima — 3 termos (modelo/plano/sessão) descrevem 2-3 conceitos de forma cruzada. |
| H3 | "Iniciar treino" e "Novo plano" competem visualmente | **Confirmada** | Mesmo componente `Button variant="primary"`, mesma cor, mesma largura, visíveis ao mesmo tempo (F04). |
| H4 | Mutations falham sem feedback; falta indicador de offline | **Parcial** | A parte de mutations sem feedback já foi corrigida nesta mesma branch de trabalho (toast global em `main.tsx`, `MutationCache.onError`). O indicador de offline continua **ausente** (F12). |
| H5 | Fluxo de iniciar aula > 5 toques; falta avançar sem "Continuar"; falta sugestão de rodízio | **Confirmada** | 9 toques rastreados (F01). O toque extra do botão "Continuar" já foi eliminado para quem escolhe um treino planejado (avança direto pro pré-treino) — mas a tela "Resumo" antes de `comecarTreino()` ainda exige 1 toque a mais, e a sugestão de rodízio A→B→C não existe (F02). |
| H6 | "Hoje" e "Agenda" se sobrepõem; 4 abas bastam | **Parcial** | Sobrepõem no conteúdo de "hoje" (F17), mas Agenda cobre semana e navegação entre datas que Hoje não tem — não são 100% redundantes. Reduzir para 4 abas juntando as duas é viável, mas perde a função de "hub do dia" de Hoje se não for bem desenhado. |
| H7 | Cabeçalho da ficha mistura dados demográficos e alertas de saúde com o mesmo peso | **Confirmada** | Mesmo componente `<Badge>` para os dois tipos, sem distinção (F08). |
| H8 | Controles de reordenar são pequenos e de baixo contraste | **Confirmada** | 32×32px (abaixo de 44px) e contraste de ícone 2.56:1 (F06). |
| H9 | Em ≥820px o layout desperdiça espaço | **Confirmada** | `max-w-2xl` em quase todo o app, sem lista+detalhe (F16). |
| H10 | Falta onboarding de primeiro acesso | **Confirmada** | 0 ocorrências de qualquer padrão de onboarding no código (F15). |
| H11 | App usa `confirm()` nativo em ações destrutivas | **Confirmada** | 11 usos, incluindo ações sensíveis como revogar consentimento LGPD (F07). |
| H12 | Falta busca global de aluno e aviso proativo de ciclos a fechar | **Confirmada — mas com nuance** | Busca de aluno **existe** (não é ausência total), só não é global (F13). Aviso proativo de ciclo a fechar realmente **não existe** em lugar nenhum (F14). |

---

## Jornada "dar a aula": antes × depois

**Antes (atual, 9 toques, ~4 telas/etapas)**

1. Toque no card da aula (Hoje) → abre `AulaAcoesSheet`
2. Toque em "Iniciar treino" → navega para Escolher treino
3. Toque no treino planejado desejado → auto-avança para Pré-treino
4. Toque em "Sono" → auto-avança
5. Toque em "Estresse" → auto-avança
6. Toque em "Fadiga" → auto-avança
7. Toque em "Dor muscular" → avança para Resumo
8. Toque em "Começar treino" → cria a sessão, abre a tela de séries
9. Toque na 1ª série do 1º exercício para marcar como feita

**Depois (proposto, ~4 toques, 2 telas)**

1. Toque no card da aula (já destacando o treino sugerido pelo rodízio, F02) → abre
   direto a tela de sessão com o treino pré-selecionado
2. As 4 perguntas de pré-treino aparecem como 4 sliders na mesma tela (sem trocar de
   rota a cada resposta) — 1 toque por slider, sem tela de "Resumo" intermediária
3. Toque em "Começar" (substitui a etapa 8 atual, mas já na mesma tela do passo 2)
4. Toque na 1ª série

Redução de ~55% nos toques, sem remover nenhuma pergunta nem dado coletado — só
compactando telas e eliminando o toque de confirmação redundante do Resumo.

---

## Roadmap sugerido

**Onda 1 — quick wins (dias, esforço P)**
F05 (contraste `bg-brand`+branco), F06 (alvo de toque + contraste dos botões de
reordenar), F19 (horário fixo na revisão do cadastro), F20 (critério de "ficha
incompleta"), F18 (rótulo do plano com origem excluída), F04 (variant secundário
para "Novo plano").

**Onda 2 — estrutural (semanas, esforço M)**
F01/F02 (compactar o fluxo de iniciar treino + sugestão de rodízio), F07
(substituir os 11 `confirm()` por um ConfirmSheet do design system), F08/F09
(reestruturar cabeçalho e aba Resumo da ficha), F11 (skeletons + mensagens de erro
amigáveis), F12 (indicador de offline), F13 (busca global), F14 (alerta proativo de
ciclo a fechar), F17 (repensar a relação Hoje/Agenda).

**Onda 3 — evolução (trimestre+, esforço G)**
F10 (glossário único — renomear na UI primeiro, depois no código/rotas), F16
(layout responsivo lista+detalhe em ≥820px nas telas mais navegadas), H1 de forma
definitiva (repensar o modelo de dados plano×treino planejado — copy-on-write real
em vez de cópia+reconciliação), F15 (onboarding de primeiro acesso).
