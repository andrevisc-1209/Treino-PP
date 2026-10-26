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
      'Na tela Hoje, o card de primeiros passos mostra o que falta: sua chave Pix, o primeiro aluno, um horário fixo e um treino planejado.',
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
    id: 'arquivar-apagar-aluno',
    categoria: 'alunos',
    titulo: 'Arquivar ou apagar um aluno',
    passos: [
      'Para parar de atender um aluno sem perder nada, use "Arquivar". O histórico dele fica guardado.',
      'Só é possível apagar um aluno que já está arquivado. Antes de apagar, o app mostra o que será removido e pede confirmação.',
      'Apagar é definitivo. Se tiver dúvida, deixe arquivado.',
    ],
    sinonimos: ['excluir', 'remover', 'inativar', 'deletar'],
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
