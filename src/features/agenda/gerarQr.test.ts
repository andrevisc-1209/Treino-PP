import { describe, expect, it } from 'vitest'
import { gerarQrDoLink } from './gerarQr'

describe('QR do link da agenda', () => {
  it('gera uma imagem PNG', async () => {
    const url = await gerarQrDoLink('https://treino.personalperto.com.br/agenda/andre')
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
    expect(url.length).toBeGreaterThan(500)
  })
})
