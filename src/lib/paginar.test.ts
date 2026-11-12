import { describe, expect, it, vi } from 'vitest'
import { buscarTodasAsPaginas } from './paginar'

const fonte = (n: number) => Array.from({ length: n }, (_, i) => i)
const pagina = (todas: number[]) => vi.fn((de: number, ate: number) => Promise.resolve({ data: todas.slice(de, ate + 1), error: null }))

describe('buscarTodasAsPaginas', () => {
  it('junta todas as páginas (2500 linhas com páginas de 1000 = 3 idas)', async () => {
    const f = pagina(fonte(2500))
    const r = await buscarTodasAsPaginas(f, 1000)
    expect(r).toHaveLength(2500)
    expect(r[0]).toBe(0)
    expect(r[2499]).toBe(2499)
    expect(f).toHaveBeenCalledTimes(3)
    expect(f).toHaveBeenNthCalledWith(2, 1000, 1999)
  })
  it('resposta menor que a página: uma ida só', async () => {
    const f = pagina(fonte(10))
    expect(await buscarTodasAsPaginas(f, 1000)).toHaveLength(10)
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('exatamente uma página cheia: pede a seguinte para ter certeza (vem vazia)', async () => {
    const f = pagina(fonte(1000))
    expect(await buscarTodasAsPaginas(f, 1000)).toHaveLength(1000)
    expect(f).toHaveBeenCalledTimes(2)
  })
  it('erro em qualquer página sobe (nunca devolve lista pela metade)', async () => {
    const f = vi.fn().mockResolvedValueOnce({ data: fonte(1000), error: null }).mockResolvedValueOnce({ data: null, error: new Error('rede') })
    await expect(buscarTodasAsPaginas(f, 1000)).rejects.toThrow('rede')
  })
  it('data nula sem erro = vazio', async () => {
    expect(await buscarTodasAsPaginas(() => Promise.resolve({ data: null, error: null }))).toEqual([])
  })
})
