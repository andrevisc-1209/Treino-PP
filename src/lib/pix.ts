// Pix copia e cola: normalização da chave/nome/cidade e geração do
// BR Code estático (EMV) com valor. Lógica pura, sem I/O.

export type PixTipo = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'

function removerAcentos(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Normaliza a chave conforme o tipo: CPF/CNPJ só dígitos, telefone em +55DDDNÚMERO, e-mail em minúsculas. */
export function normalizarChavePix(tipo: PixTipo, valor: string): string {
  const v = valor.trim()
  if (tipo === 'cpf' || tipo === 'cnpj') return v.replace(/\D/g, '')
  if (tipo === 'telefone') {
    const digitos = v.replace(/\D/g, '').replace(/^0+/, '')
    const comDdi = digitos.startsWith('55') ? digitos : `55${digitos}`
    return `+${comDdi}`
  }
  if (tipo === 'email') return v.toLowerCase()
  return v
}

/** Nome do recebedor para o BR Code: sem acento, maiúsculo, até 25 caracteres. */
export function normalizarNomePix(nome: string): string {
  return removerAcentos(nome).toUpperCase().slice(0, 25)
}

/** Cidade do recebedor para o BR Code: sem acento, maiúscula, até 15 caracteres. */
export function normalizarCidadePix(cidade: string): string {
  return removerAcentos(cidade).toUpperCase().slice(0, 15)
}

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`
}

/** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF), 4 dígitos hex maiúsculos. */
export function crc16(dados: string): string {
  let crc = 0xffff
  for (let i = 0; i < dados.length; i++) {
    crc ^= dados.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export type PixPayloadInput = {
  /** Já normalizada (normalizarChavePix). */
  chave: string
  /** Já normalizado (normalizarNomePix), até 25 caracteres. */
  nome: string
  /** Já normalizada (normalizarCidadePix), até 15 caracteres. */
  cidade: string
  valor: number
  /** Identificador da cobrança; "***" (sem txid) se omitido. Até 25 alfanuméricos. */
  txid?: string
}

/** Monta o BR Code estático (Pix copia e cola) com valor fixo. */
export function gerarPayloadPix(input: PixPayloadInput): string {
  const contaMerchant = campo('00', 'br.gov.bcb.pix') + campo('01', input.chave)
  const txid = (input.txid?.trim() || '***').slice(0, 25)
  const semCrc =
    campo('00', '01') +
    campo('26', contaMerchant) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', input.valor.toFixed(2)) +
    campo('58', 'BR') +
    campo('59', input.nome) +
    campo('60', input.cidade) +
    campo('62', campo('05', txid)) +
    '6304'
  return semCrc + crc16(semCrc)
}
