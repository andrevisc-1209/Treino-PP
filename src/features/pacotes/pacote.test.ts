import { describe, expect, it } from 'vitest'
import { payloadPacote, formularioDoPacote } from './formulario'
import { contarTreinosADistancia } from './api'
import { pacoteEsgotado, aulasAnterioresParaContador, aulasRestantes, diasParaVencer, fimDoPacote, situacaoDoPacote, validarPacote, type Pacote } from './pacote'

const base: Pacote = { id: 'p1', aluno_id: 'a1', qtd_aulas: 10, valor: 800, validade_dias: 60, inicio: '2026-10-01', aulas_anteriores: 0, status: 'ativo', conta_distancia: false }

describe('prazo do pacote', () => {
  it('o dia de início conta como o dia 1', () => {
    expect(fimDoPacote({ inicio: '2026-10-01', validade_dias: 30 })).toBe('2026-10-30')
    expect(fimDoPacote({ inicio: '2026-10-01', validade_dias: 1 })).toBe('2026-10-01')
  })
  it('dias para vencer: 0 no último dia, negativo depois', () => {
    expect(diasParaVencer({ inicio: '2026-10-01', validade_dias: 30 }, '2026-10-30')).toBe(0)
    expect(diasParaVencer({ inicio: '2026-10-01', validade_dias: 30 }, '2026-10-25')).toBe(5)
    expect(diasParaVencer({ inicio: '2026-10-01', validade_dias: 30 }, '2026-10-31')).toBe(-1)
  })
})

describe('contador', () => {
  it('soma as aulas anteriores às presenças do app', () => {
    const s = situacaoDoPacote({ ...base, aulas_anteriores: 1 }, 1, '2026-10-10')
    expect(s.contador).toBe('2/10')
    expect(s.restantes).toBe(8)
    expect(s.aviso).toBeNull()
  })
  it('passou do total: segue como acabou e mostra o contador real', () => {
    const s = situacaoDoPacote(base, 12, '2026-10-10')
    expect(s.contador).toBe('12/10')
    expect(s.restantes).toBe(0)
    expect(s.aviso).toBe('Pacote acabou')
    expect(s.nivel).toBe('esgotado')
  })
  it('presença negativa não derruba o contador', () => {
    expect(aulasRestantes(base, -3)).toBe(10)
  })
})

describe('aviso do pacote', () => {
  const hoje = '2026-10-10'
  it('avisa com 3, 2 e 1 aula restante', () => {
    expect(situacaoDoPacote(base, 7, hoje).aviso).toBe('Faltam 3 aulas')
    expect(situacaoDoPacote(base, 8, hoje).aviso).toBe('Faltam 2 aulas')
    expect(situacaoDoPacote(base, 9, hoje).aviso).toBe('Falta 1 aula')
    expect(situacaoDoPacote(base, 6, hoje).aviso).toBeNull()
  })
  it('acabou: zero aulas restantes', () => {
    const s = situacaoDoPacote(base, 10, hoje)
    expect(s.aviso).toBe('Pacote acabou')
    expect(s.nivel).toBe('esgotado')
  })
  it('prazo perto: 7 dias ou menos', () => {
    const p = { ...base, inicio: '2026-10-01', validade_dias: 17 } // fim 17/10
    expect(situacaoDoPacote(p, 0, '2026-10-10').aviso).toBe('Pacote vence em 7 dias')
    expect(situacaoDoPacote(p, 0, '2026-10-09').aviso).toBeNull()
    expect(situacaoDoPacote(p, 0, '2026-10-16').aviso).toBe('Pacote vence amanhã')
    expect(situacaoDoPacote(p, 0, '2026-10-17').aviso).toBe('Pacote vence hoje')
  })
  it('vencido pesa mais que "faltam aulas"', () => {
    const p = { ...base, inicio: '2026-10-01', validade_dias: 5 }
    const s = situacaoDoPacote(p, 8, '2026-10-20')
    expect(s.aviso).toBe('Pacote vencido')
    expect(s.nivel).toBe('esgotado')
  })
  it('poucas aulas pesam mais que prazo perto', () => {
    const p = { ...base, inicio: '2026-10-01', validade_dias: 12 }
    expect(situacaoDoPacote(p, 8, '2026-10-10').aviso).toBe('Faltam 2 aulas')
  })
  it('pacote de 2 aulas já nasce com aviso (faltam 2)', () => {
    expect(situacaoDoPacote({ ...base, qtd_aulas: 2 }, 0, '2026-10-02').aviso).toBe('Faltam 2 aulas')
  })
})

describe('validarPacote', () => {
  const ok = { qtdTexto: '10', validadeTexto: '60', feitasTexto: '' }
  it('aceita um pacote normal', () => {
    expect(validarPacote(ok)).toBeNull()
    expect(validarPacote({ ...ok, feitasTexto: '2' })).toBeNull()
  })
  it('recusa quantidade e prazo fora dos limites do banco', () => {
    expect(validarPacote({ ...ok, qtdTexto: '' })).toMatch(/Quantidade/)
    expect(validarPacote({ ...ok, qtdTexto: '0' })).toMatch(/Quantidade/)
    expect(validarPacote({ ...ok, qtdTexto: '501' })).toMatch(/Quantidade/)
    expect(validarPacote({ ...ok, qtdTexto: '2,5' })).toMatch(/Quantidade/)
    expect(validarPacote({ ...ok, validadeTexto: '0' })).toMatch(/Prazo/)
    expect(validarPacote({ ...ok, validadeTexto: '731' })).toMatch(/Prazo/)
  })
  it('aulas já feitas: entre 0 e a quantidade, e nunca abaixo do que o app registrou', () => {
    expect(validarPacote({ ...ok, feitasTexto: '-1' })).toMatch(/0 ou mais/)
    expect(validarPacote({ ...ok, feitasTexto: '11' })).toMatch(/passar/)
    expect(validarPacote({ ...ok, feitasTexto: '1' }, 3)).toMatch(/já registrou 3 aulas/)
    expect(validarPacote({ ...ok, feitasTexto: '3' }, 3)).toBeNull()
  })
})

describe('aulasAnterioresParaContador', () => {
  it('"esta é a 2/10" com nenhuma presença no app grava 2', () => {
    expect(aulasAnterioresParaContador(2, 0)).toBe(2)
  })
  it('desconta o que o app já registrou', () => {
    expect(aulasAnterioresParaContador(5, 3)).toBe(2)
    expect(aulasAnterioresParaContador(3, 3)).toBe(0)
  })
})

describe('formulário do pacote', () => {
  const form = { modelo: 'pacote' as const, valorTexto: '800,50', diaCicloTexto: '', diasVencimentoTexto: '', cobrarDistancia: false, valorDistanciaTexto: '', qtdPacoteTexto: '10', validadePacoteTexto: '60', feitasPacoteTexto: '2', pacoteContaDistancia: false, pacoteRecebido: false, pagamentoDataTexto: '2026-10-28', formaPagamento: 'pix' as const }
  it('monta os dados do pacote novo', () => {
    expect(payloadPacote(form, 'a1')).toEqual({ aluno_id: 'a1', qtd_aulas: 10, valor: 800.5, validade_dias: 60, aulas_anteriores: 2, conta_distancia: false })
  })
  it('na edição desconta as presenças já contadas pelo app', () => {
    expect(payloadPacote({ ...form, feitasPacoteTexto: '5' }, 'a1', 3).aulas_anteriores).toBe(2)
  })
  it('campo vazio de aulas feitas vale 0', () => {
    expect(payloadPacote({ ...form, feitasPacoteTexto: '' }, 'a1').aulas_anteriores).toBe(0)
  })
  it('ida e volta: o pacote ativo vira o formulário com o contador atual', () => {
    const f = formularioDoPacote(base, 4, form)
    expect(f).toMatchObject({ modelo: 'pacote', valorTexto: '800', qtdPacoteTexto: '10', validadePacoteTexto: '60', feitasPacoteTexto: '4' })
  })
})

describe('pacoteEsgotado (a trava da próxima aula)', () => {
  it('só trava quando as aulas acabaram', () => {
    expect(pacoteEsgotado(base, 9)).toBe(false)
    expect(pacoteEsgotado(base, 10)).toBe(true)
    expect(pacoteEsgotado(base, 12)).toBe(true)
  })
  it('conta as aulas anteriores informadas pelo personal', () => {
    expect(pacoteEsgotado({ ...base, aulas_anteriores: 4 }, 5)).toBe(false)
    expect(pacoteEsgotado({ ...base, aulas_anteriores: 4 }, 6)).toBe(true)
  })
  it('prazo vencido sozinho não trava (só avisa)', () => {
    expect(pacoteEsgotado(base, 0)).toBe(false)
  })
})

describe('treino à distância no pacote (decisão do personal)', () => {
  it('a opção vai e volta pelo formulário', () => {
    const f = formularioDoPacote({ ...base, conta_distancia: true }, 0, { modelo: 'pacote', valorTexto: '', diaCicloTexto: '', diasVencimentoTexto: '', cobrarDistancia: false, valorDistanciaTexto: '', qtdPacoteTexto: '', validadePacoteTexto: '', feitasPacoteTexto: '', pacoteContaDistancia: false, pacoteRecebido: false, pagamentoDataTexto: '2026-10-28', formaPagamento: 'pix' })
    expect(f.pacoteContaDistancia).toBe(true)
    expect(payloadPacote(f, 'a1').conta_distancia).toBe(true)
  })
})

describe('contarTreinosADistancia', () => {
  const execs = [
    { aluno_id: 'a1', concluido_em: '2026-09-30T12:00:00Z' }, // antes do início
    { aluno_id: 'a1', concluido_em: '2026-10-05T12:00:00Z' },
    { aluno_id: 'a1', concluido_em: '2026-10-09T12:00:00Z' },
    { aluno_id: 'a2', concluido_em: '2026-10-09T12:00:00Z' },
  ]
  it('só conta quando o personal ligou a opção, desde o início do pacote', () => {
    const ligado = { ...base, aluno_id: 'a1', conta_distancia: true }
    const desligado = { ...base, aluno_id: 'a2', conta_distancia: false }
    const mapa = contarTreinosADistancia([ligado, desligado], execs)
    expect(mapa.get('a1')).toBe(2)
    expect(mapa.has('a2')).toBe(false)
  })
})
