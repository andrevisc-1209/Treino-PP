import { describe, expect, it } from 'vitest'
import { assinaturaValida, atualizacaoDoPreapproval, decidirWebhook, fimDoPeriodo, planoPorFrequencia, statusDoMP, tokenDeCartaoValido } from './mp.ts'

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

describe('tokenDeCartaoValido', () => {
  it('aceita só 32 hex', () => {
    expect(tokenDeCartaoValido('a'.repeat(32))).toBe(true)
    expect(tokenDeCartaoValido('abc')).toBe(false)
    expect(tokenDeCartaoValido('g'.repeat(32))).toBe(false)
    expect(tokenDeCartaoValido(undefined)).toBe(false)
  })
})

describe('atualizacaoDoPreapproval', () => {
  const id = '11111111-2222-3333-4444-555555555555'
  it('authorized -> ativa com plano e fim do período', () => {
    const r = atualizacaoDoPreapproval({ id: 'abc', status: 'authorized', external_reference: id, next_payment_date: '2026-11-01T00:00:00.000Z', auto_recurring: { frequency: 3 } })
    expect(r).toEqual({ professionalId: id, atualizacao: { status: 'ativa', mp_subscription_id: 'abc', plano: 'trimestral', assinatura_fim: '2026-11-06T00:00:00.000Z' } })
  })
  it('cancelled -> cancelada, sem tocar em plano/fim', () => {
    expect(atualizacaoDoPreapproval({ id: 'abc', status: 'cancelled', external_reference: id })?.atualizacao).toEqual({ status: 'cancelada', mp_subscription_id: 'abc' })
  })
  it('ignora pending, external_reference ausente ou que não é uuid', () => {
    expect(atualizacaoDoPreapproval({ id: 'a', status: 'pending', external_reference: id })).toBeNull()
    expect(atualizacaoDoPreapproval({ id: 'a', status: 'authorized' })).toBeNull()
    expect(atualizacaoDoPreapproval({ id: 'a', status: 'authorized', external_reference: 'x' })).toBeNull()
  })
})

describe('decidirWebhook', () => {
  it('assinatura válida processa em qualquer ambiente', () => {
    expect(decidirWebhook({ producao: true, temSegredo: true, assinaturaOk: true })).toBe('processar')
    expect(decidirWebhook({ producao: false, temSegredo: true, assinaturaOk: true })).toBe('processar')
  })
  it('produção: assinatura inválida/ausente rejeita; sem segredo também (falha fechada)', () => {
    expect(decidirWebhook({ producao: true, temSegredo: true, assinaturaOk: false })).toBe('rejeitar_assinatura')
    expect(decidirWebhook({ producao: true, temSegredo: false, assinaturaOk: false })).toBe('rejeitar_sem_segredo')
  })
  it('sandbox: assinatura ausente/inválida/sem segredo processa com aviso', () => {
    expect(decidirWebhook({ producao: false, temSegredo: true, assinaturaOk: false })).toBe('processar_com_aviso')
    expect(decidirWebhook({ producao: false, temSegredo: false, assinaturaOk: false })).toBe('processar_com_aviso')
  })
})
