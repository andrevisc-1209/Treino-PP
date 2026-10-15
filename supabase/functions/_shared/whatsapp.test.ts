import { describe, expect, it } from 'vitest'
import { configEvolution, enviarTexto, mensagemDeTeste, numeroWhatsApp } from './whatsapp.ts'

const env = (o: Record<string, string>) => ({ get: (n: string) => o[n] })

describe('configEvolution', () => {
  it('exige URL, chave e instância; tira a barra final da URL', () => {
    expect(configEvolution(env({ EVOLUTION_API_URL: 'https://evo.exemplo.com/', EVOLUTION_API_KEY: 'k', EVOLUTION_INSTANCE: 'treino' }))).toEqual({ url: 'https://evo.exemplo.com', apiKey: 'k', instance: 'treino' })
    expect(configEvolution(env({ EVOLUTION_API_URL: 'https://x', EVOLUTION_API_KEY: 'k' }))).toBeNull()
    expect(configEvolution(env({}))).toBeNull()
  })
})

describe('numeroWhatsApp', () => {
  it('aceita celular/fixo com ou sem 55 e rejeita o resto', () => {
    expect(numeroWhatsApp('(21) 99999-0000')).toBe('5521999990000')
    expect(numeroWhatsApp('2133334444')).toBe('552133334444')
    expect(numeroWhatsApp('+55 21 99999-0000')).toBe('5521999990000')
    expect(numeroWhatsApp('12345')).toBeNull()
    expect(numeroWhatsApp('')).toBeNull()
    expect(numeroWhatsApp(null)).toBeNull()
  })
})

describe('mensagemDeTeste', () => {
  it('usa só o primeiro nome e não cita nenhum dado de aluno', () => {
    const m = mensagemDeTeste('André Vieira Scherer')
    expect(m).toContain('*André*')
    expect(m).not.toContain('Vieira')
    expect(mensagemDeTeste(null)).toContain('Olá')
  })
})

describe('enviarTexto', () => {
  const cfg = { url: 'https://evo.exemplo.com', apiKey: 'segredo', instance: 'treino pp' }
  it('chama sendText da instância com a chave no header e o número/texto no corpo', async () => {
    let chamada: { url: string; init: RequestInit } | null = null
    await enviarTexto(cfg, '5521999990000', 'oi', ((url: string, init: RequestInit) => ((chamada = { url, init }), Promise.resolve(new Response('{}', { status: 201 })))) as unknown as typeof fetch)
    expect(chamada!.url).toBe('https://evo.exemplo.com/message/sendText/treino%20pp')
    expect((chamada!.init.headers as Record<string, string>).apikey).toBe('segredo')
    expect(JSON.parse(chamada!.init.body as string)).toEqual({ number: '5521999990000', text: 'oi' })
  })
  it('erro da API vira Error sem repassar o corpo', async () => {
    await expect(enviarTexto(cfg, '5521999990000', 'oi', (() => Promise.resolve(new Response('detalhe interno', { status: 401 }))) as unknown as typeof fetch)).rejects.toThrow('evolution:401')
  })
})
