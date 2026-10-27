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
  it('guarda o ?ref= válido, lê e limpa', () => {
    guardarCodigoDoLink('?ref=abcd2345&utm_source=indicacao')
    expect(store[CHAVE_CODIGO_INDICACAO]).toBe('ABCD2345')
    expect(lerCodigoGuardado()).toBe('ABCD2345')
    limparCodigoGuardado()
    expect(lerCodigoGuardado()).toBeNull()
  })
  it('ignora código inválido ou ausente e não apaga o que já estava guardado', () => {
    guardarCodigoDoLink('?ref=ABCD2345')
    guardarCodigoDoLink('?ref=lixo')
    guardarCodigoDoLink('')
    expect(lerCodigoGuardado()).toBe('ABCD2345')
  })
})

describe('textos', () => {
  it('só avisa quando registrou ou o código é o próprio; o resto fica em silêncio', () => {
    expect(avisoDoRegistro('registrado')).toContain('3 alunos')
    expect(avisoDoRegistro('proprio')).toContain('seu próprio')
    expect(avisoDoRegistro('invalido')).toBeNull()
    expect(avisoDoRegistro('expirado')).toBeNull()
    expect(avisoDoRegistro('ja_registrado')).toBeNull()
  })
  it('situação de quem foi indicado', () => {
    expect(textoSituacaoIndicado({ fui_indicado: false, minha_situacao: null })).toBeNull()
    expect(textoSituacaoIndicado({ fui_indicado: true, minha_situacao: 'pendente' })).toContain('cadastre 3 alunos')
    expect(textoSituacaoIndicado({ fui_indicado: true, minha_situacao: 'concedida' })).toContain('já ganhou')
  })
})
