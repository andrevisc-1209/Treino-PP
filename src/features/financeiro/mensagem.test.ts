import { describe, expect, it } from 'vitest'
import { formatarBRL } from '@/lib/moeda'
import { montarMensagemFatura } from './mensagem'

describe('montarMensagemFatura', () => {
  it('monta a mensagem "por aula" e omite ajuste/pix/resumo quando não há dados', () => {
    const msg = montarMensagemFatura({
      primeiroNome: 'Carla',
      periodoLabel: '10/09 a 09/10',
      quantidadeAulas: 3,
      datasAulas: ['12/09', '19/09', '26/09'],
      modelo: 'por_aula',
      valorUnitario: 60,
      total: 180,
      ajuste: 0,
      ajusteDescricao: null,
      vencimentoLabel: '14/10',
      pixPayload: null,
      resumoTreino: null,
    })

    expect(msg).toContain('Olá, Carla! Segue o resumo de 10/09 a 09/10:')
    expect(msg).toContain('📅 Aulas: 3 (12/09, 19/09, 26/09)')
    expect(msg).toContain(`💰 3 × ${formatarBRL(60)} = ${formatarBRL(180)}`)
    expect(msg).not.toContain('Ajuste')
    expect(msg).not.toContain('Pix copia e cola')
    expect(msg).not.toContain('🏋️')
    expect(msg).toContain('Vencimento: 14/10')
  })

  it('modelo mensal usa "Mensalidade" e inclui ajuste e Pix quando presentes', () => {
    const msg = montarMensagemFatura({
      primeiroNome: 'João',
      periodoLabel: '01/09 a 30/09',
      quantidadeAulas: 8,
      datasAulas: [],
      modelo: 'mensal',
      valorUnitario: null,
      total: 350,
      ajuste: -50,
      ajusteDescricao: 'desconto combinado',
      vencimentoLabel: '05/10',
      pixPayload: '00020101...6304ABCD',
      resumoTreino: null,
    })

    expect(msg).toContain(`💰 Mensalidade: ${formatarBRL(350)}`)
    expect(msg).toContain(`Ajuste (desconto combinado): − ${formatarBRL(50)}`)
    expect(msg).toContain('Pix copia e cola:')
    expect(msg).toContain('00020101...6304ABCD')
  })

  it('inclui o resumo de treino só com os dados disponíveis', () => {
    const msg = montarMensagemFatura({
      primeiroNome: 'Ana',
      periodoLabel: '01/09 a 30/09',
      quantidadeAulas: 4,
      datasAulas: [],
      modelo: 'por_aula',
      valorUnitario: 50,
      total: 200,
      ajuste: 0,
      ajusteDescricao: null,
      vencimentoLabel: '05/10',
      pixPayload: null,
      resumoTreino: {
        quantidadeTreinos: 4,
        pseMedio: 6.5,
        exercicioDestaque: 'Supino Reto',
        cargaInicial: 40,
        cargaFinal: 50,
        variacaoPesoKg: -1.2,
      },
    })

    expect(msg).toContain('🏋️ Seu mês de treino: 4 treinos · PSE médio 6.5 · destaque: Supino Reto')
    expect(msg).toContain('40 → 50 kg · peso -1.2 kg')
  })
})
