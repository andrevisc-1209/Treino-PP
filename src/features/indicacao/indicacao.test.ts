import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CHAVE_CODIGO_INDICACAO,
  avisoDoRegistro,
  guardarCodigoDoLink,
  lerCodigoGuardado,
  limparCodigoGuardado,
  linkDeIndicacao,
  linkWhatsappIndicacao,
  mensagemDeIndicacao,
  normalizarCodigo,
  textoAvisoIndicacao,
  textoSituacaoIndicado,
} from './indicacao'

const store: Record<string, string> = {}
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('normalizarCodigo', () => {
  it('aceita 8 símbolos do alfabeto (sem I, O, 0, 1), ignora caixa, espaço e hífen', () => {
    expect(normalizarCodigo('abcd2345')).toBe('ABCD2345')
    expect(normalizarCodigo(' ABCD-2345 ')).toBe('ABCD2345')
  })
  it('recusa tamanho errado e símbolos fora do alfabeto', () => {
    expect(normalizarCodigo('ABC')).toBeNull()
    expect(normalizarCodigo('ABCD234O')).toBeNull() // O
    expect(normalizarCodigo('ABCD2341')).toBeNull() // 1
    expect(normalizarCodigo('ABCD23456')).toBeNull()
    expect(normalizarCodigo(null)).toBeNull()
  })
})

describe('link e mensagem', () => {
  it('o link vai direto ao cadastro, com código e origem da indicação', () => {
    expect(linkDeIndicacao('ABCD2345')).toBe('https://treino.personalperto.com.br/login?ref=ABCD2345&utm_source=indicacao&utm_medium=personal')
  })
  it('a mensagem diz a regra e leva o link; o do WhatsApp codifica o texto', () => {
    const link = linkDeIndicacao('ABCD2345')
    expect(mensagemDeIndicacao(link)).toContain('3 alunos')
    expect(mensagemDeIndicacao(link)).toContain(link)
    expect(linkWhatsappIndicacao(link)).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })
})

describe('guarda do código até entrar', () => {
  it('guarda o ?ref= válido com o momento da abertura e lê os segundos desde então', () => {
    guardarCodigoDoLink('?ref=abcd2345&utm_source=indicacao', false, 1_000_000)
    expect(JSON.parse(store[CHAVE_CODIGO_INDICACAO])).toEqual({ c: 'ABCD2345', t: 1_000_000 })
    expect(lerCodigoGuardado(1_000_000 + 90_500)).toEqual({ codigo: 'ABCD2345', segundosDesdeAbertura: 90 })
    limparCodigoGuardado()
    expect(lerCodigoGuardado()).toBeNull()
  })
  it('quem já está logado (conta existente) não guarda nada', () => {
    guardarCodigoDoLink('?ref=ABCD2345', true, 1_000_000)
    expect(lerCodigoGuardado()).toBeNull()
  })
  it('abrir o link de novo renova o momento (vale o mais recente)', () => {
    guardarCodigoDoLink('?ref=ABCD2345', false, 1_000)
    guardarCodigoDoLink('?ref=ABCD2345', false, 5_000)
    expect(JSON.parse(store[CHAVE_CODIGO_INDICACAO]).t).toBe(5_000)
  })
  it('ignora código inválido ou ausente e não apaga o que já estava guardado', () => {
    guardarCodigoDoLink('?ref=ABCD2345', false, 1_000)
    guardarCodigoDoLink('?ref=lixo', false, 2_000)
    guardarCodigoDoLink('', false, 3_000)
    expect(JSON.parse(store[CHAVE_CODIGO_INDICACAO])).toEqual({ c: 'ABCD2345', t: 1_000 })
  })
  it('formato antigo (só o código) ou quebrado não vale', () => {
    store[CHAVE_CODIGO_INDICACAO] = 'ABCD2345'
    expect(lerCodigoGuardado()).toBeNull()
    store[CHAVE_CODIGO_INDICACAO] = '{"c":"ABCD2345"}'
    expect(lerCodigoGuardado()).toBeNull()
  })
  it('relógio do aparelho voltando atrás nunca dá segundos negativos', () => {
    guardarCodigoDoLink('?ref=ABCD2345', false, 10_000)
    expect(lerCodigoGuardado(5_000)?.segundosDesdeAbertura).toBe(0)
  })
})

describe('textos', () => {
  it('só avisa quando registrou ou o código é o próprio; o resto fica em silêncio', () => {
    expect(avisoDoRegistro('registrado')).toContain('3 alunos')
    expect(avisoDoRegistro('proprio')).toContain('seu próprio')
    expect(avisoDoRegistro('invalido')).toBeNull()
    expect(avisoDoRegistro('expirado')).toBeNull()
    expect(avisoDoRegistro('nao_novo')).toContain('depois de abrir o link')
    expect(avisoDoRegistro('ja_registrado')).toBeNull()
  })
  it('situação de quem foi indicado', () => {
    expect(textoSituacaoIndicado({ fui_indicado: false, minha_situacao: null })).toBeNull()
    expect(textoSituacaoIndicado({ fui_indicado: true, minha_situacao: 'pendente' })).toContain('cadastre 3 alunos')
    expect(textoSituacaoIndicado({ fui_indicado: true, minha_situacao: 'concedida' })).toContain('já ganhou')
  })
})

describe('textoAvisoIndicacao', () => {
  it('indicado e indicador que ganhou: parabéns, sem nome de ninguém', () => {
    expect(textoAvisoIndicacao({ papel: 'indicado', ganhou: true }).titulo).toBe('Você ganhou 1 mês grátis')
    expect(textoAvisoIndicacao({ papel: 'indicador', ganhou: true }).texto).toContain('Obrigado por indicar')
  })
  it('indicador no limite: explica o teto, sem prometer o mês', () => {
    const r = textoAvisoIndicacao({ papel: 'indicador', ganhou: false })
    expect(r.titulo).toBe('Indicação concluída')
    expect(r.texto).toContain('limite de 6 meses')
  })
  it('payload ausente cai no texto do indicador que ganhou', () => expect(textoAvisoIndicacao(undefined).titulo).toBe('Você ganhou 1 mês grátis'))
})
