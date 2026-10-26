// Catálogo central de mensagens de erro em português, usado pelos mapeadores
// de erro (errosAuth.ts, erros.ts) e pelas validações de formulário mais
// sensíveis (CPF). Objetivo: nenhum erro cru do Supabase/JS em inglês deve
// chegar ao personal — e o texto de cada categoria fica num só lugar.

export const ERROS = {
  ALUNO: {
    arquivarAntes: 'Arquive o aluno antes de apagar.',
  },
  ASSINATURA: {
    // modo leitura (trial/assinatura vencidos): o banco barra as gravações (policies assinatura_ativa_*, migration 20261052)
    modoLeitura: 'Assine o plano para fazer esta alteração. Suas informações continuam disponíveis para consulta.',
  },
  AUTH: {
    credenciaisInvalidas: 'E-mail ou senha incorretos.',
    // genérica DE PROPÓSITO: não confirma se o e-mail tem conta (evita listar quem é cliente); orienta quem já tem conta
    emailDuplicado: 'Não foi possível concluir o cadastro. Se você já tem uma conta, entre com seu e-mail ou use "Esqueci minha senha".',
    emailNaoConfirmado: 'Confirme seu e-mail antes de entrar.',
    senhaFraca: 'Senha fraca. Use pelo menos 8 caracteres.',
    sessaoExpirada: 'Sua sessão expirou. Entre novamente.',
    generico: 'Não foi possível concluir. Tente de novo.',
  },
  CPF: {
    invalido: 'CPF inválido',
    // DECISÃO DE PRODUTO (risco aceito, docs/SECURITY-AUDIT.md): avisa que o CPF já está na plataforma e orienta a recuperar a conta.
    // Troca: confirma que o CPF é cliente; o limite de 5 tentativas/dia por conta (RPC atualizar_cpf) e o captcha continuam.
    duplicado: 'Este CPF já está cadastrado na plataforma. Se for você, entre com seu e-mail ou use "Esqueci minha senha".',
    tentativas: 'Muitas tentativas de salvar o CPF. Tente novamente amanhã.',
    imutavel: 'CPF não pode ser alterado depois do cadastro.',
    falhaNoCadastro:
      'Não foi possível concluir o cadastro. Se o CPF ou e-mail já estiverem cadastrados, tente entrar ou recuperar a senha. Dúvidas? Fale com a gente no WhatsApp (21) 98652-1747.',
  },
  REDE: {
    semConexao: 'Sem conexão com a internet. Verifique o sinal e tente de novo.',
    generico: 'Algo deu errado. Tente de novo. Se persistir, fale com a gente no WhatsApp (21) 98652-1747.',
  },
  FORM: {
    obrigatorio: 'Este campo é obrigatório',
    dataInvalida: 'Data inválida',
    idadeMinima: 'O aluno deve ter pelo menos 14 anos',
  },
} as const
