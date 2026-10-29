import { describe, expect, it } from 'vitest'
import { avisosDias, copiarDia, diasDasJanelas, janelasDosDias, modeloManhaETarde, parametrosDaConfig, PARAMETROS_PADRAO, resumoDisponibilidade, validarDias, validarParametros, type DiaDisponibilidade } from './disponibilidade'

const dia = (weekday: number, intervalos: [string, string][]): DiaDisponibilidade => ({ weekday, ativo: intervalos.length > 0, intervalos: intervalos.map(([inicio, fim]) => ({ inicio, fim })) })

describe('ida e volta com o banco', () => {
  it('os 7 dias na ordem segunda a domingo, horários sem segundos e ordenados', () => {
    const d = diasDasJanelas([
      { weekday: 1, start_time: '14:00:00', end_time: '18:00:00' },
      { weekday: 1, start_time: '07:00:00', end_time: '09:00:00' },
      { weekday: 0, start_time: '08:00:00', end_time: '10:00:00' },
    ])
    expect(d.map((x) => x.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(d[0]).toEqual({ weekday: 1, ativo: true, intervalos: [{ inicio: '07:00', fim: '09:00' }, { inicio: '14:00', fim: '18:00' }] })
    expect(d[1]).toEqual({ weekday: 2, ativo: false, intervalos: [] })
    expect(d[6].ativo).toBe(true)
  })
  it('só os dias ligados vão para o banco', () => {
    const d = [dia(1, [['07:00', '09:00']]), { ...dia(2, [['07:00', '09:00']]), ativo: false }]
    expect(janelasDosDias(d)).toEqual([{ weekday: 1, start_time: '07:00', end_time: '09:00' }])
  })
})

describe('validação', () => {
  it('fim antes do início, dia ligado vazio e sobreposição', () => {
    expect(validarDias([dia(1, [['07:00', '09:00'], ['14:00', '18:00']])])).toEqual([])
    expect(validarDias([dia(1, [['10:00', '09:00']])])[0]).toContain('o fim precisa ser depois do início')
    expect(validarDias([{ weekday: 2, ativo: true, intervalos: [] }])[0]).toBe('Terça: adicione um horário ou desligue o dia.')
    expect(validarDias([dia(3, [['07:00', '10:00'], ['09:00', '12:00']])])[0]).toContain('se sobrepõem')
    expect(validarDias([dia(3, [['07:00', '09:00'], ['09:00', '12:00']])])).toEqual([])
    expect(validarDias([{ weekday: 4, ativo: false, intervalos: [] }])).toEqual([])
  })
  it('mais de 4 horários no dia e hora vazia', () => {
    const cinco = dia(1, [['06:00', '07:00'], ['08:00', '09:00'], ['10:00', '11:00'], ['12:00', '13:00'], ['14:00', '15:00']])
    expect(validarDias([cinco])[0]).toContain('no máximo 4')
    expect(validarDias([{ weekday: 1, ativo: true, intervalos: [{ inicio: '', fim: '10:00' }] }])[0]).toContain('informe início e fim')
  })
  it('avisa quando o intervalo é menor que uma aula', () => {
    expect(avisosDias([dia(1, [['07:00', '07:30']])], 60)[0]).toContain('não gera vaga')
    expect(avisosDias([dia(1, [['07:00', '08:00']])], 60)).toEqual([])
  })
})

describe('resumo em texto', () => {
  it('agrupa dias seguidos iguais, como no Personal Perto', () => {
    const dias = [
      dia(1, [['07:00', '09:00'], ['14:00', '18:00']]),
      dia(2, [['07:00', '18:00']]),
      dia(3, [['07:00', '18:00']]),
      dia(4, [['07:00', '18:00']]),
      dia(5, [['07:00', '18:00']]),
      dia(6, [['07:00', '18:00']]),
      dia(0, []),
    ]
    expect(resumoDisponibilidade(dias)).toEqual(['Segunda: 07:00–09:00 e 14:00–18:00', 'Terça a sábado: 07:00–18:00', 'Domingo: indisponível'])
  })
  it('dois dias iguais viram "A e b"; tudo desligado vira uma linha só', () => {
    expect(resumoDisponibilidade([dia(1, [['07:00', '08:00']]), dia(2, [['07:00', '08:00']]), dia(3, [])])).toEqual(['Segunda e terça: 07:00–08:00', 'Quarta: indisponível'])
    expect(resumoDisponibilidade(diasDasJanelas([]))).toEqual(['Segunda a domingo: indisponível'])
  })
})

describe('atalhos', () => {
  it('copiar para os dias úteis não mexe em sábado e domingo e copia (não compartilha) os intervalos', () => {
    const base = diasDasJanelas([{ weekday: 1, start_time: '07:00', end_time: '12:00' }])
    const r = copiarDia(base, 1, 'uteis')
    expect(r.filter((d) => d.ativo).map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5])
    expect(r[1].intervalos).toEqual([{ inicio: '07:00', fim: '12:00' }])
    r[1].intervalos[0].fim = '10:00'
    expect(r[0].intervalos[0].fim).toBe('12:00')
    expect(copiarDia(base, 1, 'todos').every((d) => d.ativo)).toBe(true)
  })
  it('copiar um dia desligado desliga os outros', () => {
    const r = copiarDia(modeloManhaETarde(), 6, 'uteis')
    expect(r.filter((d) => d.ativo)).toHaveLength(0)
  })
  it('o modelo manhã e tarde liga segunda a sexta', () => {
    const m = modeloManhaETarde()
    expect(m.filter((d) => d.ativo).map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5])
    expect(validarDias(m)).toEqual([])
  })
})

describe('parâmetros', () => {
  it('padrão: 60 min, sem intervalo, 3 h de antecedência e 4 semanas', () => {
    expect(PARAMETROS_PADRAO).toEqual({ duracaoMin: 60, intervaloMin: 0, antecedenciaHoras: 3, horizonteSemanas: 4 })
    expect(parametrosDaConfig(null)).toEqual(PARAMETROS_PADRAO)
    expect(parametrosDaConfig({ duracao_padrao_min: 45, antecedencia_horas: null })).toEqual({ ...PARAMETROS_PADRAO, duracaoMin: 45 })
  })
  it('limites', () => {
    expect(validarParametros(PARAMETROS_PADRAO)).toEqual([])
    expect(validarParametros({ ...PARAMETROS_PADRAO, duracaoMin: 5 })).toHaveLength(1)
    expect(validarParametros({ ...PARAMETROS_PADRAO, antecedenciaHoras: 200, horizonteSemanas: 0 })).toHaveLength(2)
    expect(validarParametros({ ...PARAMETROS_PADRAO, intervaloMin: 1.5 })).toHaveLength(1)
  })
})
