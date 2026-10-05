import { describe, expect, it } from 'vitest'
import { assinaturaValida, fimDoPeriodo, planoPorFrequencia, statusDoMP } from './mp.ts'

async function assinar(secret: string, manifest: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(manifest)))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

describe('statusDoMP', () => {
  it('mapeia os status do MP para os da tabela', () => {
    expect(statusDoMP('authorized')).toBe('ativa')
    expect(statusDoMP('cancelled')).toBe('cancelada')
    expect(statusDoMP('paused')).toBe('expirada')
    expect(statusDoMP('pending')).toBeNull()
  })
})

describe('planoPorFrequencia', () => {
  it('descobre o plano pela periodicidade em meses', () => {
    expect(planoPorFrequencia(1)).toBe('mensal')
    expect(planoPorFrequencia(3)).toBe('trimestral')
    expect(planoPorFrequencia(6)).toBe('semestral')
    expect(planoPorFrequencia(12)).toBeNull()
  })
})

describe('fimDoPeriodo', () => {
  it('soma a folga à próxima cobrança', () => {
    expect(fimDoPeriodo('2026-11-01T00:00:00.000Z', 5)).toBe('2026-11-06T00:00:00.000Z')
    expect(fimDoPeriodo(undefined)).toBeNull()
    expect(fimDoPeriodo('lixo')).toBeNull()
  })
})

describe('assinaturaValida', () => {
  it('aceita assinatura correta e rejeita adulterada', async () => {
    const v1 = await assinar('segredo', 'id:abc123;request-id:req-1;ts:1700000000;')
    const base = { secret: 'segredo', xRequestId: 'req-1', dataId: 'ABC123' }
    expect(await assinaturaValida({ ...base, xSignature: `ts=1700000000,v1=${v1}` })).toBe(true)
    expect(await assinaturaValida({ ...base, xSignature: `ts=1700000000,v1=${v1.replace(/.$/, '0')}` })).toBe(false)
    expect(await assinaturaValida({ ...base, secret: 'outro', xSignature: `ts=1700000000,v1=${v1}` })).toBe(false)
    expect(await assinaturaValida({ ...base, xSignature: null })).toBe(false)
  })
})
