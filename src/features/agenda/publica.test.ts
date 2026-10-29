import { describe, expect, it } from 'vitest'
import { agruparPorDia, agruparPorTurno, cartaoDoDia, esperaLonga, iniciais, linkDaAgendaPublica, lerConsulta, mensagemDeErroDoPedido, tempoDeEspera, turnoDaHora, validarPedidoNoCliente } from './publica'

describe('agrupar as vagas por dia', () => {
  it('ordena por data e hora e junta o mesmo dia', () => {
    const r = agruparPorDia([
      { dataISO: '2026-10-31', inicio: '09:00', fim: '10:00' },
      { dataISO: '2026-10-30', inicio: '14:00', fim: '15:00' },
      { dataISO: '2026-10-30', inicio: '07:00', fim: '08:00' },
    ])
    expect(r.map((d) => [d.dataISO, d.vagas.map((v) => v.inicio)])).toEqual([['2026-10-30', ['07:00', '14:00']], ['2026-10-31', ['09:00']]])
    expect(agruparPorDia([])).toEqual([])
  })
})

describe('ler a resposta da função', () => {
  it('formato conhecido', () => {
    expect(lerConsulta({ estado: 'ok', nome_personal: 'André', cidade: 'Rio/RJ', duracao_min: 45, vagas: [{ dataISO: '2026-10-30', inicio: '07:00', fim: '07:45' }] })).toEqual({
      estado: 'ok',
      nome_personal: 'André',
      cidade: 'Rio/RJ',
      apresentacao: null,
      duracao_min: 45,
      vagas: [{ dataISO: '2026-10-30', inicio: '07:00', fim: '07:45' }],
    })
  })
  it('apresentação: aparada e limitada a 160 caracteres; vazia vira nulo', () => {
    const base = { estado: 'ok', vagas: [] }
    expect(lerConsulta({ ...base, apresentacao: '  Personal há 8 anos  ' })).toMatchObject({ apresentacao: 'Personal há 8 anos' })
    expect(lerConsulta({ ...base, apresentacao: 'x'.repeat(300) })).toMatchObject({ apresentacao: 'x'.repeat(160) })
    expect(lerConsulta({ ...base, apresentacao: '   ' })).toMatchObject({ apresentacao: null })
  })
  it('qualquer coisa fora do formato vira indisponível; vagas malformadas são descartadas', () => {
    for (const ruim of [null, undefined, 'x', {}, { estado: 'indisponivel' }, { estado: 'ok' }, { estado: 'ok', vagas: 'x' }]) expect(lerConsulta(ruim)).toEqual({ estado: 'indisponivel' })
    expect(lerConsulta({ estado: 'ok', vagas: [{ dataISO: 1 }, null, { dataISO: '2026-10-30', inicio: '07:00', fim: '08:00' }] })).toMatchObject({ vagas: [{ dataISO: '2026-10-30' }] })
  })
  it('link público', () => {
    expect(linkDaAgendaPublica('andre-scherer-4f2k')).toBe('https://treino.personalperto.com.br/agenda/andre-scherer-4f2k')
  })
})

describe('turnos e cartões de dia', () => {
  it('manhã até 11:59, tarde até 17:59, noite depois', () => {
    expect(['06:00', '11:59', '12:00', '17:59', '18:00', '21:30'].map(turnoDaHora)).toEqual(['manha', 'manha', 'tarde', 'tarde', 'noite', 'noite'])
  })
  it('separa o dia em turnos, só os que têm horário', () => {
    const v = (inicio: string) => ({ dataISO: '2026-10-30', inicio, fim: '99:99' })
    const g = agruparPorTurno([v('17:00'), v('08:00'), v('15:00'), v('11:00')])
    expect(g.map((x) => [x.rotulo, x.vagas.map((y) => y.inicio)])).toEqual([['Manhã', ['08:00', '11:00']], ['Tarde', ['15:00', '17:00']]])
    expect(agruparPorTurno([])).toEqual([])
  })
  it('cartão do dia: sigla, número e quantidade de vagas', () => {
    expect(cartaoDoDia({ dataISO: '2026-10-30', vagas: [{ dataISO: '2026-10-30', inicio: '08:00', fim: '09:00' }] })).toEqual({ sigla: 'SEX', numero: '30', vagas: '1 vaga' })
    expect(cartaoDoDia({ dataISO: '2026-11-02', vagas: [1, 2].map((i) => ({ dataISO: '2026-11-02', inicio: `0${i}:00`, fim: '' })) })).toEqual({ sigla: 'SEG', numero: '2', vagas: '2 vagas' })
  })
  it('iniciais do avatar', () => {
    expect(iniciais('André Scherer')).toBe('AS')
    expect(iniciais('  maria ')).toBe('M')
    expect(iniciais('Ana Paula de Souza')).toBe('AS')
    expect(iniciais('')).toBe('')
    expect(iniciais(null)).toBe('')
  })
})

describe('validação e mensagens do pedido', () => {
  const ok = { nome: 'Maria Souza', telefone: '(21) 99999-0000', consentimento: true, temHorario: true }
  it('tudo certo não gera erro', () => {
    expect(validarPedidoNoCliente(ok)).toEqual({})
  })
  it('um erro por campo, com o texto para mostrar embaixo dele', () => {
    expect(validarPedidoNoCliente({ nome: 'A', telefone: '123', consentimento: false, temHorario: false })).toEqual({
      horario: 'Escolha um horário.',
      nome: 'Informe seu nome.',
      telefone: 'Informe um número de WhatsApp válido com DDD.',
      consentimento: 'Marque a autorização para o contato por WhatsApp.',
    })
    expect(validarPedidoNoCliente({ ...ok, telefone: '(21) 89999-0000' }).telefone).toBeDefined()
  })
  it('cada falha do envio tem a sua mensagem, e só a vaga ocupada pede outro horário', () => {
    expect(mensagemDeErroDoPedido(409, null)).toMatchObject({ vagaOcupada: true })
    expect(mensagemDeErroDoPedido(429, null).texto).toContain('Muitos pedidos')
    expect(mensagemDeErroDoPedido(503, null).texto).toContain('continuam preenchidos')
    expect(mensagemDeErroDoPedido(400, 'Informe seu nome.').texto).toBe('Informe seu nome.')
    expect(mensagemDeErroDoPedido(undefined, null).texto).toContain('conexão')
    expect(mensagemDeErroDoPedido(500, null)).toMatchObject({ vagaOcupada: false })
    for (const s of [400, 429, 500, 503, undefined]) expect(mensagemDeErroDoPedido(s, null).vagaOcupada).toBe(false)
  })
})

describe('espera dos pedidos', () => {
  const agora = new Date('2026-10-30T15:00:00Z')
  it('agora, minutos, horas e dias', () => {
    expect(tempoDeEspera('2026-10-30T14:59:30Z', agora)).toBe('agora')
    expect(tempoDeEspera('2026-10-30T14:20:00Z', agora)).toBe('há 40 min')
    expect(tempoDeEspera('2026-10-30T13:00:00Z', agora)).toBe('há 2 h')
    expect(tempoDeEspera('2026-10-29T12:00:00Z', agora)).toBe('há 1 dia')
    expect(tempoDeEspera('2026-10-27T12:00:00Z', agora)).toBe('há 3 dias')
  })
  it('espera longa só passando de 24 horas', () => {
    expect(esperaLonga('2026-10-29T15:00:00Z', agora)).toBe(false)
    expect(esperaLonga('2026-10-29T14:59:00Z', agora)).toBe(true)
  })
})
