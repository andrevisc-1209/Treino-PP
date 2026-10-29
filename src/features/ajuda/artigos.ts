export type CategoriaAjuda = 'comecando' | 'alunos' | 'treinos' | 'agenda' | 'financeiro' | 'conta' | 'privacidade'

export const CATEGORIAS: { id: CategoriaAjuda; titulo: string }[] = [
  { id: 'comecando', titulo: 'Começando' },
  { id: 'alunos', titulo: 'Alunos' },
  { id: 'treinos', titulo: 'Treinos' },
  { id: 'agenda', titulo: 'Agenda' },
  { id: 'financeiro', titulo: 'Financeiro' },
  { id: 'conta', titulo: 'Conta e plano' },
  { id: 'privacidade', titulo: 'Privacidade' },
]

export type Artigo = {
  id: string
  categoria: CategoriaAjuda
  titulo: string
  /** Passos ou parágrafos; cada item é uma linha. */
  passos: string[]
  /** Palavras que o personal costuma usar e que não aparecem no texto. */
  sinonimos?: string[]
}

export const ARTIGOS: Artigo[] = [
  {
    id: 'primeiros-passos',
    categoria: 'comecando',
    titulo: 'Por onde começar',
    passos: [
      'Na tela Hoje, o card de primeiros passos mostra o que falta: cadastrar seus primeiros alunos, definir os horários em que você atende, adicionar um horário fixo, montar um treino planejado e configurar sua chave Pix.',
      'Comece pelos alunos: com 3 cadastrados o app já fica útil. Os horários em que você atende viram vagas livres na Agenda e podem ser abertos aos alunos pelo link da sua agenda.',
      'Você pode fazer na ordem que quiser. Cada passo concluído some da lista.',
      'Dúvida em algum passo? Procure o assunto aqui na central ou fale com a gente pelo WhatsApp.',
    ],
    sinonimos: ['iniciar', 'comecar', 'tutorial', 'checklist'],
  },
  {
    id: 'instalar-app',
    categoria: 'comecando',
    titulo: 'Instalar o app no celular',
    passos: [
      'Abra treino.personalperto.com.br no navegador do celular.',
      'No Android (Chrome), use o aviso "Instalar" ou o menu do navegador. No iPhone (Safari), toque em Compartilhar e depois em "Adicionar à Tela de Início".',
      'O ícone fica na tela inicial e o app abre em tela cheia, como um aplicativo normal.',
    ],
    sinonimos: ['pwa', 'icone', 'atalho', 'baixar'],
  },
  {
    id: 'cadastrar-aluno',
    categoria: 'alunos',
    titulo: 'Cadastrar um aluno',
    passos: [
      'Abra a aba Alunos e toque em "Novo aluno".',
      'Preencha o nome e, se quiser, telefone e demais dados. Você pode completar o resto depois, na ficha do aluno.',
      'Salve. O aluno aparece na lista e você já pode montar o treino ou marcar aulas.',
    ],
    sinonimos: ['adicionar', 'criar', 'novo', 'incluir'],
  },
  {
    id: 'contrato-aluno',
    categoria: 'alunos',
    titulo: 'Gerar o contrato do aluno em PDF',
    passos: [
      'Na ficha do aluno, no cartão "Contrato", toque em "Gerar contrato".',
      'Já vem preenchido com os dados do aluno, os seus e a cobrança. Informe o CPF e o endereço do aluno (se quiser, o app guarda no cadastro dele), as modalidades, o local e os horários. O local e os horários vêm dos horários fixos do aluno, e a busca de endereço ajuda a preencher.',
      'Escolha as regras que valem para você: aviso mínimo para cancelar, falta cobrada, reposição, multa e juros por atraso, reajuste e trancamento. O app avisa quando a multa passa de 2%.',
      'Toque em "Baixar contrato em PDF", imprima e colha as assinaturas. O app não coleta assinatura nem guarda o contrato assinado.',
      'Se o aluno for menor de 18 anos, informe o responsável legal: os dados dele entram só no PDF.',
      'É um modelo-padrão, não um parecer jurídico: vale uma revisão de advogado antes de usar. O contrato não leva dados de saúde.',
    ],
    sinonimos: ['contrato', 'termo', 'assinar', 'cpf', 'endereco', 'multa', 'cancelamento', 'foro'],
  },
  {
    id: 'arquivar-apagar-aluno',
    categoria: 'alunos',
    titulo: 'Arquivar, apagar e restaurar um aluno',
    passos: [
      'Para parar de atender um aluno sem perder nada, use "Arquivar". O histórico dele fica guardado.',
      'Para apagar, primeiro arquive o aluno. Depois, na aba Arquivados, escolha "Mover para a lixeira".',
      'Na aba Lixeira ele fica por 30 dias e você pode restaurar. Depois desse prazo, ou se você escolher "Apagar agora", ele e todo o histórico são apagados de vez, sem volta.',
      'Se tiver dúvida, deixe arquivado: nada se perde.',
    ],
    sinonimos: ['excluir', 'remover', 'inativar', 'deletar', 'lixeira', 'recuperar'],
  },
  {
    id: 'iniciar-treino',
    categoria: 'treinos',
    titulo: 'Iniciar um treino com o aluno',
    passos: [
      'Na ficha do aluno ou pela aula na Agenda, toque em "Iniciar treino".',
      'Registre séries, cargas e repetições conforme o aluno executa. As séries ficam salvas à medida que você registra.',
      'Ao terminar, finalize o treino para fechar o registro e alimentar a evolução do aluno.',
    ],
    sinonimos: ['sessao', 'executar', 'registrar serie', 'carga'],
  },
  {
    id: 'sem-sinal',
    categoria: 'treinos',
    titulo: 'Estou sem internet na academia',
    passos: [
      'As séries que você registra sem sinal ficam guardadas no celular e são enviadas quando a conexão voltar.',
      'Não feche nem limpe os dados do navegador antes de voltar a ter sinal.',
      'Se alguma série não puder ser enviada, o app avisa e você pode tentar de novo.',
    ],
    sinonimos: ['offline', 'conexao', 'wifi', 'internet', 'sinal'],
  },
  {
    id: 'treino-planejado',
    categoria: 'treinos',
    titulo: 'Criar um treino planejado (modelo)',
    passos: [
      'Abra a aba "Meus treinos" e vá em Planejados. Ali você monta o treino com os exercícios que quiser.',
      'Salve. Ele vira um modelo que você reutiliza com vários alunos.',
      'Na ficha do aluno, toque em "Novo treino" e escolha "Usar um treino planejado". Ou escolha "Criar do zero".',
    ],
    sinonimos: ['modelo', 'template', 'ficha de treino', 'reutilizar'],
  },
  {
    id: 'prontidao',
    categoria: 'treinos',
    titulo: 'O que é a Prontidão',
    passos: [
      'É um pequeno questionário respondido antes do treino, para você saber como o aluno chega naquele dia.',
      'As respostas ajudam a ajustar a carga e aparecem na evolução do aluno.',
    ],
    sinonimos: ['bem-estar', 'questionario', 'antes do treino'],
  },
  {
    id: 'marcar-aula',
    categoria: 'agenda',
    titulo: 'Marcar uma aula',
    passos: [
      'Abra a aba Agenda e toque em "Nova aula".',
      'Escolha o aluno, o dia e o horário. Se houver conflito com outra aula, o app avisa antes de salvar.',
      'Para aulas que se repetem toda semana, cadastre um horário fixo do aluno.',
    ],
    sinonimos: ['agendar', 'marcar horario', 'compromisso'],
  },
  {
    id: 'disponibilidade-vagas',
    categoria: 'agenda',
    titulo: 'Definir seus horários de atendimento e ver as vagas livres',
    passos: [
      'Na Agenda, toque em "Minha disponibilidade" (ou vá em Configurações → Aulas e cobrança → Disponibilidade de agenda).',
      'Ligue os dias em que você atende e informe os horários "das … até …". Dá para ter mais de um horário no dia, por exemplo de manhã e à tarde. "Copiar para segunda a sexta" repete o horário, e há um modelo pronto para começar.',
      'Em "Regras das vagas" ajuste a duração da aula, o intervalo entre aulas, a antecedência mínima para marcar (o padrão é 3 horas) e quantas semanas à frente mostrar as vagas.',
      'Em "Dias sem atendimento" bloqueie férias, feriados e viagens. As aulas que já estão marcadas não mudam.',
      'As vagas livres aparecem no fim de cada dia da Agenda, em "Vagas livres". Quando uma aula é cancelada, o horário volta a ser vaga.',
    ],
    sinonimos: ['horario', 'disponivel', 'disponibilidade', 'vaga', 'folga', 'ferias', 'bloquear', 'expediente'],
  },
  {
    id: 'oferecer-vaga',
    categoria: 'agenda',
    titulo: 'Oferecer uma vaga a outros alunos',
    passos: [
      'Ao cancelar uma aula que ainda não aconteceu, o app pergunta se você quer oferecer aquele horário. Você também pode tocar em "Oferecer" em qualquer vaga livre da Agenda.',
      'Aparece a lista dos seus alunos com telefone. Toque em WhatsApp ao lado de quem você quer chamar: a conversa abre com a mensagem pronta, com o dia e a hora da vaga.',
      'Você escolhe para quem mandar, um por um. O app não envia nada sozinho.',
      'Quando o aluno responder, marque a aula normalmente.',
    ],
    sinonimos: ['cancelou', 'cancelamento', 'encaixar', 'horario livre', 'preencher', 'remarcar'],
  },
  {
    id: 'pagina-publica-agenda',
    categoria: 'agenda',
    titulo: 'Receber pedidos de aula pelo link da sua agenda',
    passos: [
      'Antes, defina seus horários de atendimento (veja "Definir seus horários de atendimento e ver as vagas livres").',
      'Vá em Configurações → Página pública da agenda e ligue "Aceitar pedidos pelo link". A página vem desligada.',
      'Se quiser, escreva uma apresentação curta (até 160 caracteres) logo abaixo da chave: ela aparece no topo da página. Não coloque telefone nem dados de saúde.',
      'Copie o link ou envie pelo WhatsApp. Ele também fica no alto da Agenda, e "Ver como visitante" mostra a página como seus alunos a verão. Quem abrir vê só os seus horários livres, escolhe um e envia nome, telefone e uma mensagem curta. Nada é marcado sozinho: você aprova cada pedido.',
      'Com a página ligada, o cartão do link na Agenda mostra os pedidos dos últimos 7 dias, quantos esperam sua resposta, o seu tempo típico de resposta e quantas aulas já foram feitas pelo link.',
      'Você é avisado no sino do app e, se as notificações por WhatsApp estiverem ligadas, por WhatsApp (só com o dia e a hora).',
      'Na Agenda, toque na faixa "pedidos de aula para responder" (ela fica vermelha se algum pedido espera há mais de 24 horas). Os pedidos aparecem do mais antigo para o mais novo, com o tempo de espera, e as abas Aprovados e Recusados guardam os últimos 30 dias. "Aprovar" marca a aula: se o telefone for de um aluno seu, a aula vai para ele; se for uma pessoa nova, o app cria um cadastro rápido com nome e telefone, ou você vincula a um aluno que já tem. "Recusar" abre o WhatsApp com uma mensagem pronta.',
      'Lista de espera: quem não achou horário toca em "Avisar se abrir uma vaga" e deixa nome, telefone, o dia e o turno que prefere. Na Agenda, a aba "Espera" (em "Lista de espera") mostra essas pessoas e, quando há vaga livre que serve a alguém, o botão "Chamar no WhatsApp" com a mensagem pronta. Quem avisa é você: o app não manda nada sozinho. A espera some em 14 dias.',
      'Para parar de receber pedidos, desligue a chave. "Trocar o link" faz o link antigo deixar de funcionar.',
      'Privacidade: o nome, o telefone e a mensagem de quem pediu só você vê. Pedidos que não viram aula são apagados em 30 dias. Quem entra na lista de espera também só aparece para você e some em 14 dias. A administração da plataforma vê só totais (quantos pedidos), nunca quem pediu. Peça para ninguém escrever dados de saúde na mensagem.',
    ],
    sinonimos: ['lista de espera', 'fila de espera', 'link', 'autoagendamento', 'agendar sozinho', 'calendly', 'pedido', 'reservar', 'pagina publica', 'aprovar'],
  },
  {
    id: 'horario-fixo',
    categoria: 'agenda',
    titulo: 'Cadastrar um horário fixo',
    passos: [
      'No cadastro do aluno, use "Novo horário fixo".',
      'Informe o dia da semana e a hora. O horário fixo gera as aulas na agenda a cada semana.',
      'Para parar, encerre o horário fixo: ele deixa de gerar novas aulas a partir de hoje.',
    ],
    sinonimos: ['recorrente', 'toda semana', 'repetir', 'fixo'],
  },
  {
    id: 'fechar-ciclo',
    categoria: 'financeiro',
    titulo: 'Fechar o ciclo e gerar a fatura',
    passos: [
      'Quando um aluno completa o ciclo de aulas, ele aparece para fechar. O aviso aparece na tela Hoje e no Financeiro; toque em "Fechar ciclo".',
      'Confira as aulas incluídas e confirme. A fatura é criada.',
      'A mensagem para o aluno fica pronta para você enviar pelo WhatsApp.',
    ],
    sinonimos: ['cobrar', 'cobranca', 'mensalidade', 'fatura', 'fechamento'],
  },
  {
    id: 'pacote-de-aulas',
    categoria: 'financeiro',
    titulo: 'Vender um pacote de aulas e acompanhar o contador',
    passos: [
      'Na ficha do aluno, em Cobrança, escolha "Pacote de aulas" e informe a quantidade de aulas, o valor e a validade em dias. A venda gera uma fatura: marque "Já recebi" (com a data) ou deixe "A receber" com o vencimento.',
      'Se o aluno já fez aulas, informe em "Aulas já feitas neste pacote" (por exemplo, esta é a 2 de 10).',
      'O contador (como 2/10) aparece na ficha e no cartão do aluno e conta as aulas com presença desde o início do pacote.',
      'Faltando 3, 2 ou 1 aula, ou 7 dias para o prazo acabar, o app avisa.',
      'Com todas as aulas usadas, o app não deixa marcar nem iniciar novas aulas até você renovar o pacote.',
      'O treino à distância só gasta uma aula se você ligar "Treino à distância gasta uma aula" no pacote.',
      'Ao encerrar o pacote, baixe o relatório completo em PDF na própria fatura.',
    ],
    sinonimos: ['pacote', 'combo', 'creditos', 'aulas avulsas', 'contador', 'renovar', 'validade'],
  },
  {
    id: 'relatorios-aluno',
    categoria: 'financeiro',
    titulo: 'Relatórios em PDF: do ciclo, mensal e resumo de cobrança',
    passos: [
      'Na fatura de um ciclo ou de um pacote, toque em "Baixar relatório completo": um PDF com as aulas, os resultados por modalidade, a evolução, a sua avaliação e o resumo financeiro. O Pix só entra se você marcar "Incluir o Pix".',
      'Para só cobrar, em uma fatura em aberto toque em "Baixar resumo de cobrança": uma página com as aulas contabilizadas, o valor, o vencimento e o Pix.',
      'Na ficha do aluno, o cartão "Relatório mensal" gera o acompanhamento de um mês, sem parte financeira.',
      'Dados de saúde (lesão, cirurgia, medicamentos, prontidão) nunca entram nos relatórios. Se você citar algo assim na sua avaliação, o app avisa antes de baixar.',
    ],
    sinonimos: ['relatorio', 'pdf', 'recibo', 'fatura', 'evolucao', 'cobranca', 'resumo'],
  },
  {
    id: 'receber-pix',
    categoria: 'financeiro',
    titulo: 'Receber do aluno por Pix',
    passos: [
      'O app não cobra o aluno nem recebe o dinheiro. O pagamento vai direto para a sua conta.',
      'Cadastre sua chave em Configurações, em "Recebimento via Pix". Ela vai junto da mensagem de cobrança.',
      'Quando o aluno pagar, abra a fatura e toque em "Marcar como paga".',
    ],
    sinonimos: ['pagamento', 'chave', 'receber', 'dinheiro', 'pagar'],
  },
  {
    id: 'assinatura',
    categoria: 'conta',
    titulo: 'Assinatura do Personal Perto',
    passos: [
      'Você começa com 15 dias grátis, sem cartão.',
      'Depois, escolha o plano em Configurações, na seção Assinatura. O pagamento é feito pelo Mercado Pago e não renova sozinho.',
      'Se a assinatura vencer, o app entra em modo leitura: você consulta tudo, mas não registra novidades até renovar. Seus dados continuam guardados.',
    ],
    sinonimos: ['plano', 'trial', 'teste gratis', 'vencida', 'renovar', 'modo leitura', 'bloqueado'],
  },
  {
    id: 'whatsapp-alertas',
    categoria: 'conta',
    titulo: 'Alertas e briefing no WhatsApp',
    passos: [
      'Em Configurações, na seção Notificações, ligue "Alertas de aulas via WhatsApp".',
      'Você recebe a agenda e a previsão do dia pela manhã, entre outros avisos.',
      'Se não chegar, confirme seu telefone em Dados pessoais e use o envio de teste na mesma seção.',
    ],
    sinonimos: ['notificacao', 'aviso', 'briefing', 'mensagem'],
  },
  {
    id: 'senha-acesso',
    categoria: 'conta',
    titulo: 'Esqueci minha senha',
    passos: [
      'Na tela de entrada, toque em "Esqueci minha senha" e informe seu e-mail.',
      'Você recebe um link para criar uma nova senha. Olhe também a caixa de spam.',
      'Pode entrar com e-mail ou CPF, o que você usou no cadastro.',
    ],
    sinonimos: ['login', 'entrar', 'acesso', 'recuperar', 'cpf', 'redefinir'],
  },
  {
    id: 'saude-consentimento',
    categoria: 'privacidade',
    titulo: 'Dados de saúde e consentimento do aluno',
    passos: [
      'Dados de saúde (lesões, cirurgias, medicamentos) só são tratados com o consentimento do aluno.',
      'O aluno pode consentir pelo link que você envia, ou você registra o consentimento dele no app.',
      'Acompanhe quem já consentiu em Configurações, em "Consentimentos LGPD". Esses dados nunca vão em mensagens de WhatsApp ou e-mail.',
    ],
    sinonimos: ['lgpd', 'termo', 'lesao', 'privacidade', 'dados sensiveis'],
  },
]

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Busca sem acento e sem diferença de maiúsculas; todas as palavras digitadas precisam aparecer. */
export function buscarArtigos(termo: string, artigos: Artigo[] = ARTIGOS): Artigo[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return artigos
  return artigos.filter((a) => {
    const alvo = normalizar([a.titulo, ...a.passos, ...(a.sinonimos ?? [])].join(' '))
    return palavras.every((p) => alvo.includes(p))
  })
}
