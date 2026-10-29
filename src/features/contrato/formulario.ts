/** Estado do formulário do contrato (textos dos campos) e a conversão para os dados do contrato. Puro, sem I/O. */
import { FORMAS_CONTRATO, REGRAS_PADRAO, type DadosContrato, type FormaContrato, type RegrasContrato } from './contrato'

export type FormContrato = {
  cpf: string
  endereco: string
  /** guardar CPF e endereço digitados no cadastro do aluno (o responsável legal nunca é guardado) */
  salvarNoCadastro: boolean
  menor: boolean
  respNome: string
  respCpf: string
  modalidades: string[]
  local: string
  diasHorarios: string
  inicio: string
  forma: FormaContrato
  valorAula: string
  valorMensal: string
  qtdAulas: string
  valorPacote: string
  validadeDias: string
  vencimentoDia: string
  /** cidade/UF do foro e da assinatura */
  foro: string
  regras: RegrasContrato
}

export type OrigemContrato = {
  aluno: { cpf: string | null; endereco: string | null; birth_date: string | null }
  cobranca: { modelo: 'por_aula' | 'mensal'; valor_aula: number | null; valor_mensal: number | null } | null
  pacote: { qtd_aulas: number; valor: number; validade_dias: number; inicio: string } | null
  hoje: string
  menor: boolean
  regrasSalvas: Partial<RegrasContrato> | null
  /** horários fixos do aluno já descritos em texto (vazio se não tem) */
  horariosTexto: string
  /** local mais usado nos horários ou o primeiro local de treino do aluno */
  localSugerido: string
  /** cidade/UF do perfil do personal */
  foroSugerido: string
}

const numeroTexto = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(n).replace('.', ','))

/** Pré-preenche com o que o app já sabe: pacote ativo vale mais que a cobrança; as regras vêm das últimas escolhidas pelo personal. */
export function formularioInicial(o: OrigemContrato): FormContrato {
  const forma: FormaContrato = o.pacote ? 'pacote' : (o.cobranca?.modelo ?? 'mensal')
  return {
    cpf: o.aluno.cpf ?? '',
    endereco: o.aluno.endereco ?? '',
    salvarNoCadastro: true,
    menor: o.menor,
    respNome: '',
    respCpf: '',
    modalidades: [],
    local: o.localSugerido,
    diasHorarios: o.horariosTexto,
    inicio: o.pacote?.inicio ?? o.hoje,
    forma,
    valorAula: numeroTexto(o.cobranca?.valor_aula),
    valorMensal: numeroTexto(o.cobranca?.valor_mensal),
    qtdAulas: numeroTexto(o.pacote?.qtd_aulas),
    valorPacote: numeroTexto(o.pacote?.valor),
    validadeDias: numeroTexto(o.pacote?.validade_dias),
    vencimentoDia: '',
    foro: o.foroSugerido,
    regras: { ...REGRAS_PADRAO, ...(o.regrasSalvas ?? {}) },
  }
}

/** "1.250,50" ou "50" → número; vazio ou inválido = null. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.')
  if (!limpo) return null
  const n = Number(limpo)
  return Number.isFinite(n) ? n : null
}

const soDigitos = (t: string): string | null => t.replace(/\D/g, '') || null

export type ContextoContrato = {
  personal: DadosContrato['personal']
  aluno: { nome: string; telefone: string | null; email: string | null }
  hoje: string
}

export function dadosDoFormulario(f: FormContrato, c: ContextoContrato): DadosContrato {
  const dia = lerNumero(f.vencimentoDia)
  return {
    personal: c.personal,
    aluno: { nome: c.aluno.nome, cpf: soDigitos(f.cpf), endereco: f.endereco.trim().slice(0, 200) || null, telefone: c.aluno.telefone, email: c.aluno.email },
    responsavel: f.menor ? { nome: f.respNome.trim() || null, cpf: soDigitos(f.respCpf) } : null,
    modalidades: f.modalidades,
    local: f.local.trim(),
    diasHorarios: f.diasHorarios.trim(),
    inicio: f.inicio || c.hoje,
    forma: f.forma,
    valorAula: lerNumero(f.valorAula),
    valorMensal: lerNumero(f.valorMensal),
    qtdAulas: lerNumero(f.qtdAulas),
    valorPacote: lerNumero(f.valorPacote),
    validadeDias: lerNumero(f.validadeDias),
    vencimentoDia: dia === null ? null : Math.trunc(dia),
    regras: f.regras,
    foro: f.foro.trim(),
    geradoEm: c.hoje,
  }
}

/** O CPF ou o endereço digitados são novos ou diferentes do cadastro? (só então vale oferecer "guardar no cadastro") */
export function mudouNoCadastro(f: Pick<FormContrato, 'cpf' | 'endereco'>, aluno: { cpf: string | null; endereco: string | null }): boolean {
  const cpf = soDigitos(f.cpf)
  const endereco = f.endereco.trim() || null
  return (cpf !== null && cpf !== aluno.cpf) || (endereco !== null && endereco !== aluno.endereco)
}

export const rotuloForma = (f: FormaContrato): string => FORMAS_CONTRATO.find((x) => x.valor === f)?.rotulo ?? f

export const CHAVE_REGRAS = (userId: string): string => `contrato-regras:${userId}`

/** Regras escolhidas por último (só no aparelho, por conveniência); qualquer falha de leitura = sem regras salvas. */
export function lerRegrasSalvas(armazenamento: Pick<Storage, 'getItem'> | null, userId: string): Partial<RegrasContrato> | null {
  try {
    const bruto = armazenamento?.getItem(CHAVE_REGRAS(userId))
    if (!bruto) return null
    const o = JSON.parse(bruto) as unknown
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null
    const chaves = Object.keys(REGRAS_PADRAO) as (keyof RegrasContrato)[]
    const limpo: Record<string, unknown> = {}
    for (const k of chaves) if (typeof (o as Record<string, unknown>)[k] === typeof REGRAS_PADRAO[k]) limpo[k] = (o as Record<string, unknown>)[k]
    return limpo as Partial<RegrasContrato>
  } catch {
    return null
  }
}
