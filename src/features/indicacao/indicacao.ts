// Programa de indicação: personal indica personal. Quem foi indicado e cadastra 3+ alunos (nomes diferentes) rende 1 mês grátis para os dois
// (regra e teto no banco: migration 20261069). Aqui só o que é puro: código, link, mensagem e a guarda do código até a pessoa entrar.

export const CHAVE_CODIGO_INDICACAO = 'treino_ref'
export const ALUNOS_PARA_GANHAR = 3
const FORMATO = /^[A-HJ-NP-Z2-9]{8}$/

/** Limpa e valida o código (maiúsculas, sem espaço nem hífen). Devolve null se não tiver o formato certo. */
export function normalizarCodigo(valor: string | null | undefined): string | null {
  const c = (valor ?? '').toUpperCase().replace(/[\s-]/g, '')
  return FORMATO.test(c) ? c : null
}

/** Link que o personal compartilha: abre direto no cadastro, com o código e a origem (UTM) da indicação. */
export function linkDeIndicacao(codigo: string, base = 'https://treino.personalperto.com.br'): string {
  return `${base}/login?ref=${encodeURIComponent(codigo)}&utm_source=indicacao&utm_medium=personal`
}

export function mensagemDeIndicacao(link: string): string {
  return (
    'Estou usando o Treino PP para organizar agenda, treino e cobrança dos meus alunos. ' +
    `Cria sua conta por aqui, testa 15 dias grátis e, quando cadastrar ${ALUNOS_PARA_GANHAR} alunos, nós dois ganhamos 1 mês grátis: ${link}`
  )
}

export function linkWhatsappIndicacao(link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensagemDeIndicacao(link))}`
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>
const armazenamento = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Guarda o código vindo do link (?ref=) até a pessoa entrar. Código inválido é ignorado. */
export function guardarCodigoDoLink(search: string): void {
  const codigo = normalizarCodigo(new URLSearchParams(search).get('ref'))
  if (!codigo) return
  try {
    armazenamento()?.setItem(CHAVE_CODIGO_INDICACAO, codigo)
  } catch {
    /* sem armazenamento: o código se perde, e a indicação não conta */
  }
}

export const lerCodigoGuardado = (): string | null => {
  try {
    return normalizarCodigo(armazenamento()?.getItem(CHAVE_CODIGO_INDICACAO))
  } catch {
    return null
  }
}

export function limparCodigoGuardado(): void {
  try {
    armazenamento()?.removeItem(CHAVE_CODIGO_INDICACAO)
  } catch {
    /* idem */
  }
}

export type ResultadoRegistro = 'registrado' | 'invalido' | 'proprio' | 'ja_registrado' | 'expirado' | 'nao_novo'

/** Resposta curta para a pessoa; null = não mostra nada (o caso comum). */
export function avisoDoRegistro(r: ResultadoRegistro): string | null {
  if (r === 'registrado') return 'Indicação registrada! Quando você cadastrar 3 alunos, você e quem indicou ganham 1 mês grátis.'
  if (r === 'proprio') return 'Esse é o seu próprio código de indicação.'
  return null
}

export type MinhasIndicacoes = {
  codigo: string | null
  teto: number
  indicados: number
  pendentes: number
  concedidas: number
  meses_ganhos: number
  fui_indicado: boolean
  minha_situacao: 'pendente' | 'concedida' | null
  bonus_ate: string | null
}

/** Mensagem de progresso da própria pessoa quando foi indicada. */
export function textoSituacaoIndicado(i: Pick<MinhasIndicacoes, 'fui_indicado' | 'minha_situacao'>): string | null {
  if (!i.fui_indicado) return null
  if (i.minha_situacao === 'concedida') return 'Você entrou por indicação e já ganhou 1 mês grátis. Obrigado!'
  return `Você entrou por indicação: cadastre ${ALUNOS_PARA_GANHAR} alunos e ganhe 1 mês grátis (quem indicou também ganha).`
}

export type PayloadIndicacao = { papel?: 'indicador' | 'indicado'; ganhou?: boolean }

/** Texto do aviso no sino quando a indicação é concluída (sem nome de ninguém). */
export function textoAvisoIndicacao(p: PayloadIndicacao | undefined, teto = 6): { titulo: string; texto: string } {
  if (p?.papel === 'indicado') return { titulo: 'Você ganhou 1 mês grátis', texto: 'Você cadastrou 3 alunos pela indicação. O mês grátis já está na sua conta.' }
  if (p?.ganhou === false) {
    return { titulo: 'Indicação concluída', texto: `Quem você indicou cadastrou 3 alunos, mas você já chegou ao limite de ${teto} meses grátis do programa. Quem entrou ganhou o dele.` }
  }
  return { titulo: 'Você ganhou 1 mês grátis', texto: 'Quem você indicou cadastrou 3 alunos. O mês grátis já está na sua conta. Obrigado por indicar!' }
}
