// CEP: máscara (00000-000) e consulta ao ViaCEP (sem autenticação). Só o CEP sai do app — nenhum dado da pessoa.

export const UFS_SIGLAS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const

export const soDigitosCep = (s: string): string => s.replace(/\D/g, '').slice(0, 8)
export const cepCompleto = (s: string): boolean => soDigitosCep(s).length === 8

export function mascararCep(s: string): string {
  const d = soDigitosCep(s)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export type EnderecoCep = { bairro: string; cidade: string; uf: string }
export type TipoErroCep = 'invalido' | 'nao_encontrado' | 'rede'

export class ErroCep extends Error {
  tipo: TipoErroCep
  constructor(tipo: TipoErroCep) {
    super(MENSAGENS_ERRO_CEP[tipo])
    this.tipo = tipo
  }
}

export const MENSAGENS_ERRO_CEP: Record<TipoErroCep, string> = {
  invalido: 'CEP inválido. Confira os 8 números.',
  nao_encontrado: 'CEP não encontrado. Confira os números.',
  rede: 'Não foi possível consultar o CEP agora. Tente de novo.',
}

type RespostaViaCep = { erro?: boolean | string; bairro?: string; localidade?: string; uf?: string }

/** Consulta o ViaCEP. Lança ErroCep ('invalido' | 'nao_encontrado' | 'rede'). */
export async function buscarCep(cep: string, fetchFn: typeof fetch = fetch, signal?: AbortSignal): Promise<EnderecoCep> {
  const digitos = soDigitosCep(cep)
  if (digitos.length !== 8) throw new ErroCep('invalido')
  let resposta: Response
  try {
    resposta = await fetchFn(`https://viacep.com.br/ws/${digitos}/json/`, { signal })
  } catch {
    throw new ErroCep('rede')
  }
  if (resposta.status === 400) throw new ErroCep('invalido')
  if (!resposta.ok) throw new ErroCep('rede')
  let dados: RespostaViaCep
  try {
    dados = (await resposta.json()) as RespostaViaCep
  } catch {
    throw new ErroCep('rede')
  }
  if (dados.erro === true || dados.erro === 'true') throw new ErroCep('nao_encontrado')
  const uf = (dados.uf ?? '').toUpperCase()
  if (!dados.localidade || !(UFS_SIGLAS as readonly string[]).includes(uf)) throw new ErroCep('nao_encontrado')
  return { bairro: (dados.bairro ?? '').trim(), cidade: dados.localidade.trim(), uf }
}
