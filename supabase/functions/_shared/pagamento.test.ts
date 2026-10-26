import { describe, expect, it } from 'vitest'
import { aplicarPagamento, linhaLivroPagamento, type DepsPagamento } from './pagamento.ts'
import type { AssinaturaAtual, PagamentoMP } from './mp.ts'

const uid = '123e4567-e89b-42d3-a456-426614174000'
const agora = new Date('2026-10-06T12:00:00.000Z')
const DIA = 86_400_000

const pag = (id: number, extra: Partial<PagamentoMP> = {}): PagamentoMP => ({
  id,
  status: 'approved',
  transaction_amount: 15,
  metadata: { user_id: uid, plan_slug: 'mensal' }, // mensal = 30 dias
  ...extra,
})

/** Banco de mentira: assinatura do personal + tabela pagamentos_processados. */
function bancoFalso(inicial: AssinaturaAtual = { status: 'trial', assinatura_fim: null, mp_payment_id: null }) {
  const db = { assinatura: inicial as NonNullable<AssinaturaAtual>, processados: new Set<string>(), falhaAoGravar: false, linhas: 1 }
  const deps: DepsPagamento = {
    reivindicar: async (id) => {
      if (db.processados.has(id)) return false
      db.processados.add(id)
      return true
    },
    desfazer: async (id) => {
      db.processados.delete(id)
    },
    gravar: async (_prof, atualizacao) => {
      if (db.falhaAoGravar) throw new Error('banco fora')
      if (db.linhas === 0) return 0
      db.assinatura = { ...db.assinatura, ...(atualizacao as Partial<NonNullable<AssinaturaAtual>>) }
      return 1
    },
  }
  /** Simula uma entrega do webhook: lê a assinatura atual e aplica o pagamento. */
  const entregar = (p: PagamentoMP) => aplicarPagamento(deps, p, { ...db.assinatura }, agora)
  return { db, deps, entregar }
}

describe('aplicarPagamento — idempotência', () => {
  it('primeira entrega credita o período do plano', async () => {
    const { db, entregar } = bancoFalso()
    const r = await entregar(pag(1))
    expect(r.tipo).toBe('creditado')
    expect(db.assinatura).toMatchObject({ status: 'ativa', plano: 'mensal', mp_payment_id: '1', assinatura_fim: new Date(agora.getTime() + 30 * DIA).toISOString() })
    expect(db.processados.has('1')).toBe(true)
  })

  it('reentrega do MESMO payment_id não credita de novo', async () => {
    const { db, entregar } = bancoFalso()
    await entregar(pag(1))
    const fimDepoisDaPrimeira = db.assinatura.assinatura_fim
    const r = await entregar(pag(1))
    expect(r.tipo).toBe('ignorado') // o último pagamento é o 1 (regra antiga de decidirPagamento)
    expect(db.assinatura.assinatura_fim).toBe(fimDepoisDaPrimeira)
  })

  it('reentrega FORA DE ORDEM (A, B, A) não credita A duas vezes — o buraco que existia', async () => {
    const { db, entregar } = bancoFalso()
    await entregar(pag(1)) // A: +30 dias
    await entregar(pag(2)) // B: +30 dias (total 60)
    const fimAB = db.assinatura.assinatura_fim
    expect(fimAB).toBe(new Date(agora.getTime() + 60 * DIA).toISOString())

    const r = await entregar(pag(1)) // A reentregue: o último é B, então decidirPagamento sozinho creditaria de novo
    expect(r.tipo).toBe('ja_processado')
    expect(db.assinatura.assinatura_fim).toBe(fimAB)
    expect(db.assinatura.mp_payment_id).toBe('2') // não volta para o A

    await entregar(pag(2))
    expect(db.assinatura.assinatura_fim).toBe(fimAB)
  })

  it('duas entregas simultâneas do mesmo pagamento: só uma credita', async () => {
    const { db, deps } = bancoFalso()
    const atual = { ...db.assinatura }
    const [a, b] = await Promise.all([aplicarPagamento(deps, pag(7), atual, agora), aplicarPagamento(deps, pag(7), atual, agora)])
    expect([a.tipo, b.tipo].sort()).toEqual(['creditado', 'ja_processado'])
  })

  it('falha ao creditar DESFAZ a reivindicação e propaga o erro (o MP reenvia e o pagamento não se perde)', async () => {
    const { db, entregar } = bancoFalso()
    db.falhaAoGravar = true
    await expect(entregar(pag(3))).rejects.toThrow('banco fora')
    expect(db.processados.has('3')).toBe(false)
    db.falhaAoGravar = false
    const r = await entregar(pag(3)) // reenvio do MP
    expect(r.tipo).toBe('creditado')
    expect(db.assinatura.mp_payment_id).toBe('3')
  })

  it('sem assinatura para atualizar: não deixa o pagamento marcado como processado', async () => {
    const { db, entregar } = bancoFalso()
    db.linhas = 0
    const r = await entregar(pag(4))
    expect(r).toMatchObject({ tipo: 'creditado', linhas: 0 })
    expect(db.processados.has('4')).toBe(false)
  })

  it('pagamento não aprovado, plano inválido ou valor menor não reivindica nada', async () => {
    const { db, entregar } = bancoFalso()
    expect((await entregar(pag(5, { status: 'pending' }))).tipo).toBe('ignorado')
    expect((await entregar(pag(6, { metadata: { user_id: uid, plan_slug: 'ouro' } }))).tipo).toBe('ignorado')
    expect((await entregar(pag(8, { transaction_amount: 1 }))).tipo).toBe('ignorado')
    expect(db.processados.size).toBe(0)
  })

  it('estorno do pagamento vigente cancela (sem reivindicação); de pagamento antigo é ignorado', async () => {
    const { db, entregar } = bancoFalso()
    await entregar(pag(1))
    const antes = db.processados.size
    const ant = await entregar(pag(99, { status: 'refunded' }))
    expect(ant.tipo).toBe('ignorado')
    const r = await entregar(pag(1, { status: 'refunded' }))
    expect(r).toMatchObject({ tipo: 'cancelado', linhas: 1 })
    expect(db.assinatura.status).toBe('cancelada')
    expect(db.processados.size).toBe(antes)
  })
})

describe('linhaLivroPagamento', () => {
  const base = { id: 98765, transaction_amount: 39, date_approved: '2026-10-05T10:00:00.000-03:00', metadata: { plan_slug: 'trimestral' } }
  it('monta a linha com o valor realmente pago e a data de aprovação', () => {
    expect(linhaLivroPagamento(base, uid, agora)).toEqual({ payment_id: '98765', professional_id: uid, plano: 'trimestral', valor: 39, pago_em: '2026-10-05T13:00:00.000Z' })
  })
  it('sem data de aprovação usa o relógio recebido', () => {
    expect(linhaLivroPagamento({ ...base, date_approved: undefined }, uid, agora)?.pago_em).toBe(agora.toISOString())
  })
  it('plano inválido ou valor ausente/zerado: null (nada vai para o livro)', () => {
    expect(linhaLivroPagamento({ ...base, metadata: { plan_slug: 'anual' } }, uid, agora)).toBeNull()
    expect(linhaLivroPagamento({ ...base, transaction_amount: 0 }, uid, agora)).toBeNull()
    expect(linhaLivroPagamento({ ...base, transaction_amount: undefined }, uid, agora)).toBeNull()
  })
})
