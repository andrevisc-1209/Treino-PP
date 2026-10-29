import { describe, expect, it } from 'vitest'
import { diasParaEspera, mensagemDaEspera, normalizarEspera, rotuloTurnoEspera, vagasQueCasam } from './espera'

const v = (dataISO: string, inicio: string) => ({ dataISO, inicio, fim: inicio })

describe('lista de espera', () => {
  it('oferece os próximos 14 dias a partir de hoje', () => {
    const dias = diasParaEspera('2026-10-30')
    expect(dias).toHaveLength(14)
    expect(dias[0].dataISO).toBe('2026-10-30')
    expect(dias[13].dataISO).toBe('2026-11-12')
    expect(dias[0].rotulo).toBe('Sexta, 30 de outubro')
  })
  it('turno em palavras', () => {
    expect(rotuloTurnoEspera('manha')).toBe('Manhã')
    expect(rotuloTurnoEspera('qualquer')).toBe('Qualquer horário')
  })
  it('só casa vaga do mesmo dia e do turno pedido', () => {
    const vagas = [v('2026-10-30', '07:00'), v('2026-10-30', '14:00'), v('2026-10-31', '07:00'), v('2026-10-30', '19:00')]
    expect(vagasQueCasam({ data: '2026-10-30', turno: 'manha' }, vagas).map((x) => x.inicio)).toEqual(['07:00'])
    expect(vagasQueCasam({ data: '2026-10-30', turno: 'qualquer' }, vagas).map((x) => x.inicio)).toEqual(['07:00', '14:00', '19:00'])
    expect(vagasQueCasam({ data: '2026-10-30', turno: 'noite' }, vagas).map((x) => x.inicio)).toEqual(['19:00'])
    expect(vagasQueCasam({ data: '2026-11-05', turno: 'qualquer' }, vagas)).toEqual([])
  })
  it('mensagem com primeiro nome e até 3 horários, sem dado de saúde', () => {
    const um = mensagemDaEspera({ nome: 'Maria Souza', personalNome: 'André', data: '2026-10-30', vagas: [{ inicio: '07:00' }] })
    expect(um).toContain('Oi, Maria!')
    expect(um).toContain('às 07:00')
    expect(um).not.toContain('Souza')
    const varios = mensagemDaEspera({ nome: 'Maria', personalNome: '', data: '2026-10-30', vagas: [{ inicio: '07:00' }, { inicio: '08:00' }, { inicio: '09:00' }, { inicio: '10:00' }] })
    expect(varios).toContain('às 07:00, 08:00 ou 09:00')
    expect(varios).not.toContain('10:00')
  })
  it('normaliza a linha do banco (turno desconhecido vira qualquer)', () => {
    const [e] = normalizarEspera([{ id: 'x', visitante_nome: 'Ana', visitante_telefone: '5521999990000', data: '2026-10-30', turno: 'madrugada', chamado_em: null, created_at: '2026-10-29T10:00:00Z' }])
    expect(e.turno).toBe('qualquer')
    expect(normalizarEspera(null)).toEqual([])
  })
})
