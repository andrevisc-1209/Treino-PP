// Catálogo central de mensagens de erro em português, usado pelos mapeadores
// de erro (errosAuth.ts, erros.ts) e pelas validações de formulário mais
// sensíveis (CPF). Objetivo: nenhum erro cru do Supabase/JS em inglês deve
// chegar ao personal — e o texto de cada categoria fica num só lugar.

export const ERROS = {
  AUTH: {
    credenciaisInvalidas: 'E-mail ou senha incorretos.',
    emailDuplicado: 'Esse e-mail já está cadastrado. Tente entrar ou recuperar a senha.',
    emailNaoConfirmado: 'Confirme seu e-mail antes de entrar.',
    senhaFraca: 'Senha fraca. Use pelo menos 8 caracteres.',
    sessaoExpirada: 'Sua sessão expirou. Entre novamente.',
    generico: 'Não foi possível concluir. Tente de novo.',
  },
  CPF: {
    invalido: 'CPF inválido',
    duplicado: 'CPF já cadastrado. Cada personal só pode ter uma conta.',
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
