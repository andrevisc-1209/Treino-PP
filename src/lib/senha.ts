/**
 * Avaliação da senha do cadastro. Segue a recomendação atual (NIST 800-63B): o que vale é o TAMANHO, não a mistura de caracteres.
 * Mínimo de 10 caracteres e nada de senha óbvia (todos os caracteres iguais, sequência, padrão repetido, lista de senhas comuns,
 * poucos caracteres diferentes). Caractere repetido em sequência não conta como tamanho nem leva a senha a "Forte".
 */
export const SENHA_MIN = 10

export type NivelSenha = 'vazia' | 'curta' | 'previsivel' | 'boa' | 'forte'

export type AvaliacaoSenha = {
  nivel: NivelSenha
  /** pode ser usada para criar a conta */
  valida: boolean
  rotulo: string
  /** o que falta ou o que evitar; null quando está tudo certo */
  dica: string | null
  /** 0 a 1, para a barra */
  progresso: number
}

const COMUNS = new Set([
  '1234567890', '0123456789', '9876543210', '12345678910', '123456789012', '1234512345', '0000000000', '1111111111',
  'senha12345', 'senha123456', 'senha1234567', 'password123', 'password1234', 'qwertyuiop', 'qwerty12345', '1q2w3e4r5t',
  'abcdefghij', 'abc1234567', 'abcd123456', 'treino1234', 'treino12345', 'personal123', 'personal1234', 'mudar12345',
])

function ehSequencia(s: string): boolean {
  let subindo = true
  let descendo = true
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1)
    if (d !== 1) subindo = false
    if (d !== -1) descendo = false
  }
  return subindo || descendo
}

const distintos = (s: string): number => new Set(s).size

/**
 * Tamanho "de verdade": uma sequência do mesmo caractere conta no máximo 2. "Visc1989@@@@@@@@@@@@@" tem 21 caracteres, mas só 10 de
 * informação; sem isso a repetição inflava o tamanho e a senha aparecia como "Forte".
 */
function tamanhoEfetivo(s: string): number {
  return s.replace(/(.)\1{2,}/g, '$1$1').length
}

function ehPrevisivel(senha: string): boolean {
  const s = senha.toLowerCase()
  const semRepeticao = s.replace(/(.)\1+/g, '$1') // "1122334455" → "12345"
  return COMUNS.has(s) || /^(.{1,3})\1+$/.test(s) || ehSequencia(s) || distintos(s) < 5 || (semRepeticao.length >= 5 && ehSequencia(semRepeticao))
}

const classes = (s: string): number => [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(s)).length

export function avaliarSenha(senha: string): AvaliacaoSenha {
  const n = senha.length
  if (n === 0) return { nivel: 'vazia', valida: false, rotulo: '', dica: null, progresso: 0 }
  if (n < SENHA_MIN) {
    const falta = SENHA_MIN - n
    return { nivel: 'curta', valida: false, rotulo: 'Muito curta', dica: falta === 1 ? 'falta 1 caractere' : `faltam ${falta} caracteres`, progresso: Math.min(n / SENHA_MIN, 1) * 0.45 }
  }
  if (ehPrevisivel(senha)) return { nivel: 'previsivel', valida: false, rotulo: 'Previsível', dica: 'evite sequências e senhas comuns', progresso: 0.3 }
  const efetivo = tamanhoEfetivo(senha)
  const repete = n - efetivo >= 3
  // muito caractere repetido: tem o tamanho, mas não a informação
  if (efetivo < SENHA_MIN) return { nivel: 'previsivel', valida: false, rotulo: 'Previsível', dica: 'evite repetir o mesmo caractere', progresso: 0.3 }
  if (distintos(senha) >= 7 && (efetivo >= 14 || (efetivo >= 12 && classes(senha) >= 2))) {
    return { nivel: 'forte', valida: true, rotulo: 'Forte', dica: null, progresso: 1 }
  }
  return { nivel: 'boa', valida: true, rotulo: 'Boa', dica: repete ? 'evite repetir o mesmo caractere' : 'quanto mais longa, mais segura', progresso: 0.7 }
}
