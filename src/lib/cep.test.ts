import { describe, expect, it } from 'vitest'
import { buscarCep, cepCompleto, ErroCep, mascararCep, soDigitosCep } from './cep'

const resposta = (corpo: unknown, status = 200) => (() => Promise.resolve(new Response(JSON.stringify(corpo), { status }))) as unknown as typeof fetch

describe('máscara', () => {
  it('00000-000', () => {
    expect(mascararCep('01310')).toBe('01310')
    expect(mascararCep('013100')).toBe('01310-0')
    expect(mascararCep('01310100')).toBe('01310-100')
    expect(mascararCep('01310-100 abc 999')).toBe('01310-100')
    expect(soDigitosCep('01.310-100')).toBe('01310100')
    expect(cepCompleto('01310-100')).toBe(true)
    expect(cepCompleto('01310-10')).toBe(false)
  })
})

describe('buscarCep', () => {
  it('preenche bairro, cidade e UF', async () => {
    const r = await buscarCep('01310-100', resposta({ cep: '01310-100', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }))
    expect(r).toEqual({ bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' })
  })
  it('chama a URL do ViaCEP só com os dígitos', async () => {
    let url = ''
    await buscarCep('01310-100', ((u: string) => ((url = u), Promise.resolve(new Response(JSON.stringify({ localidade: 'X', uf: 'SP' }))))) as unknown as typeof fetch)
    expect(url).toBe('https://viacep.com.br/ws/01310100/json/')
  })
  it('bairro vazio (cidade de CEP único) não é erro', async () => {
    expect((await buscarCep('12345678', resposta({ bairro: '', localidade: 'Cidade Pequena', uf: 'MG' }))).bairro).toBe('')
  })
  it('CEP incompleto, 400 → inválido', async () => {
    await expect(buscarCep('123', resposta({}))).rejects.toMatchObject({ tipo: 'invalido' })
    await expect(buscarCep('12345678', resposta({}, 400))).rejects.toMatchObject({ tipo: 'invalido' })
  })
  it('{"erro": true} (ou "true") → não encontrado', async () => {
    await expect(buscarCep('99999999', resposta({ erro: true }))).rejects.toMatchObject({ tipo: 'nao_encontrado' })
    await expect(buscarCep('99999999', resposta({ erro: 'true' }))).rejects.toBeInstanceOf(ErroCep)
  })
  it('falha de rede / 500 / JSON quebrado → rede', async () => {
    await expect(buscarCep('12345678', (() => Promise.reject(new Error('x'))) as unknown as typeof fetch)).rejects.toMatchObject({ tipo: 'rede' })
    await expect(buscarCep('12345678', resposta({}, 500))).rejects.toMatchObject({ tipo: 'rede' })
    await expect(buscarCep('12345678', (() => Promise.resolve(new Response('<html>', { status: 200 }))) as unknown as typeof fetch)).rejects.toMatchObject({ tipo: 'rede' })
  })
  it('UF fora da lista → não encontrado', async () => {
    await expect(buscarCep('12345678', resposta({ localidade: 'X', uf: 'ZZ' }))).rejects.toMatchObject({ tipo: 'nao_encontrado' })
  })
})
