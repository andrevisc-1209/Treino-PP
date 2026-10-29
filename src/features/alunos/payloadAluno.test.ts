import { describe, expect, it } from 'vitest'
import { camposClinicos, camposGerais, COLUNAS_CLINICAS, semDadoClinico } from './payloadAluno'
import type { SalvarAlunoInput } from './api'

const base: SalvarAlunoInput = {
  name: 'Ana',
  objetivos: ['Emagrecer'],
  injury: false,
  injury_regions: [],
  surgery: false,
  surgery_regions: [],
  practices_sport: false,
  sports: [],
  lgpd_consent: false,
  hadActiveConsent: false,
}
const comSaude: SalvarAlunoInput = {
  ...base,
  lgpd_consent: true,
  height_cm: 170,
  injury: true,
  injury_regions: ['Joelho'],
  injury_notes: 'condromalácia',
  surgery: true,
  surgery_regions: ['Ombro'],
  surgery_notes: 'manguito',
  medications: 'losartana',
}

describe('CPF e endereço do aluno (para o contrato; não são dados de saúde)', () => {
  it('CPF vai só com os dígitos e endereço sem espaços nas pontas; vazio vira null', () => {
    const g = camposGerais({ ...base, cpf: '390.533.447-05', endereco: '  Rua A, 10  ' }, 'prof')
    expect(g.cpf).toBe('39053344705')
    expect(g.endereco).toBe('Rua A, 10')
    const vazio = camposGerais({ ...base, cpf: '', endereco: '   ' }, 'prof')
    expect(vazio.cpf).toBeNull()
    expect(vazio.endereco).toBeNull()
    expect(camposGerais(base, 'prof')).toMatchObject({ cpf: null, endereco: null })
  })
  it('ficam nos campos gerais, nunca nos clínicos (o banco só exige consentimento para os clínicos)', () => {
    expect(COLUNAS_CLINICAS).not.toContain('cpf')
    expect(COLUNAS_CLINICAS).not.toContain('endereco')
    expect(Object.keys(camposClinicos({ ...base, cpf: '39053344705', endereco: 'Rua A' }))).not.toContain('cpf')
  })
})

describe('payload do aluno: gerais x clínicos (o banco exige consentimento antes dos clínicos)', () => {
  it('o payload geral NUNCA carrega campo clínico', () => {
    const geral = camposGerais(comSaude, 'prof-1')
    for (const coluna of COLUNAS_CLINICAS) expect(coluna in geral).toBe(false)
    expect(geral).toMatchObject({ professional_id: 'prof-1', name: 'Ana' })
  })

  it('campos clínicos: lesão, cirurgia, medicamentos e altura (com consentimento)', () => {
    expect(camposClinicos(comSaude)).toEqual({
      injury: true,
      injury_regions: ['Joelho'],
      injury_notes: 'condromalácia',
      surgery: true,
      surgery_regions: ['Ombro'],
      surgery_notes: 'manguito',
      medications: 'losartana',
      height_cm: 170,
    })
  })

  it('sem lesão/cirurgia marcadas, regiões e notas são esvaziadas; altura não entra sem consentimento', () => {
    const c = camposClinicos({ ...comSaude, injury: false, surgery: false, lgpd_consent: false })
    expect(c).toMatchObject({ injury: false, injury_regions: [], injury_notes: null, surgery: false, surgery_regions: [], surgery_notes: null })
    expect('height_cm' in c).toBe(false)
  })

  it('semDadoClinico: aluno novo sem nada de saúde dispensa o UPDATE clínico', () => {
    expect(semDadoClinico(camposClinicos(base))).toBe(true)
    expect(semDadoClinico(camposClinicos({ ...base, lgpd_consent: true }))).toBe(true) // altura ausente = null
    expect(semDadoClinico(camposClinicos(comSaude))).toBe(false)
    expect(semDadoClinico(camposClinicos({ ...base, medications: 'x' }))).toBe(false)
    expect(semDadoClinico(camposClinicos({ ...base, lgpd_consent: true, height_cm: 180 }))).toBe(false)
  })

  it('prova alvo e esporte seguem as regras de sempre no payload geral', () => {
    const geral = camposGerais({ ...base, modalidade_foco: 'natacao', prova_alvo: '5k', nome_prova: 'x', practices_sport: true, sports: ['Corrida'], sport_name: 'Trail' }, 'p')
    expect(geral.prova_alvo).toBeNull()
    expect(geral.nome_prova).toBeNull()
    expect(geral.sports).toEqual(['Corrida'])
    const tri = camposGerais({ ...base, modalidade_foco: 'triathlon', prova_alvo: 'olimpico', nome_prova: '  Ironman  ' }, 'p')
    expect(tri.prova_alvo).toBe('olimpico')
    expect(tri.nome_prova).toBe('Ironman')
  })
})
