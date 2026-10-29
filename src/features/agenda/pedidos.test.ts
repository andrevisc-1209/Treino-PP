import { describe, expect, it } from 'vitest'
import { alunoDoTelefone, alunosParecidos, buscarAlunosPorNome, digitosNacionais, mensagemDeAprovacao, mensagemDeRecusa, normalizarPedidos, outrosDoMesmoHorario, telefoneDoPedido, textoDoHorario, type PedidoAgenda } from './pedidos'

const pedido = (o: Partial<PedidoAgenda> = {}): PedidoAgenda => ({
  id: 'p1', visitante_nome: 'Maria Souza', visitante_telefone: '5521999990000', mensagem: null, inicio: '2026-10-30T10:00:00Z', duracao_min: 60, status: 'pendente', aluno_id: null, created_at: '2026-10-29T12:00:00Z', ...o,
})

describe('telefone do pedido', () => {
  it('tira o 55 e formata', () => {
    expect(digitosNacionais('5521999990000')).toBe('21999990000')
    expect(digitosNacionais('(21) 99999-0000')).toBe('21999990000')
    expect(digitosNacionais(null)).toBe('')
    expect(telefoneDoPedido('5521999990000')).toBe('(21) 99999-0000')
  })
  it('acha o aluno que já tem o telefone, em qualquer formato', () => {
    const alunos = [{ id: 'a', phone: '(21) 98888-0000' }, { id: 'b', phone: '+55 21 99999-0000' }, { id: 'c', phone: null }]
    expect(alunoDoTelefone(alunos, '5521999990000')?.id).toBe('b')
    expect(alunoDoTelefone(alunos, '5511977770000')).toBeNull()
    expect(alunoDoTelefone(alunos, '123')).toBeNull()
    expect(alunoDoTelefone([], '5521999990000')).toBeNull()
  })
})

describe('achar o aluno pelo nome', () => {
  const alunos = [{ name: 'André Scherer' }, { name: 'Andrea Lima' }, { name: 'Maria Souza' }, { name: 'João André Costa' }, { name: 'Ana' }]
  it('busca sem acento nem maiúsculas, em ordem alfabética', () => {
    expect(buscarAlunosPorNome(alunos, 'andre').map((a) => a.name)).toEqual(['André Scherer', 'Andrea Lima', 'João André Costa'])
    expect(buscarAlunosPorNome(alunos, 'andré s').map((a) => a.name)).toEqual(['André Scherer'])
    expect(buscarAlunosPorNome(alunos, 'SOUZA').map((a) => a.name)).toEqual(['Maria Souza'])
    expect(buscarAlunosPorNome(alunos, '').map((a) => a.name)).toEqual(['Ana', 'André Scherer', 'Andrea Lima', 'João André Costa', 'Maria Souza'])
    expect(buscarAlunosPorNome(alunos, 'zzz')).toEqual([])
  })
  it('sugere parecidos pelo nome: o mais provável primeiro, no máximo 3, e nada para nome sem relação', () => {
    expect(alunosParecidos(alunos, 'Andre Scherer').map((a) => a.name)[0]).toBe('André Scherer')
    expect(alunosParecidos(alunos, 'maria').map((a) => a.name)).toEqual(['Maria Souza'])
    expect(alunosParecidos(alunos, 'Carlos Oliveira')).toEqual([])
    expect(alunosParecidos(alunos, '')).toEqual([])
    expect(alunosParecidos([...alunos, { name: 'André Dias' }, { name: 'André Neto' }], 'André').length).toBeLessThanOrEqual(3)
  })
})

describe('mensagens de WhatsApp', () => {
  it('aprovação e recusa com só o primeiro nome, o dia e a hora', () => {
    const o = { visitanteNome: 'Maria Souza', personalNome: 'André Scherer', inicioISO: '2026-10-30T10:00:00Z' }
    expect(textoDoHorario(o.inicioISO)).toBe('Sexta, 30 de outubro, às 07:00')
    expect(mensagemDeAprovacao(o)).toBe('Oi, Maria! Confirmado: sexta, 30 de outubro, às 07:00. Te espero! — André Scherer')
    expect(mensagemDeRecusa(o)).toBe('Oi, Maria! Obrigado pelo interesse. Não consegui confirmar sexta, 30 de outubro, às 07:00. Quer que eu te passe outros horários? — André Scherer')
    expect(mensagemDeAprovacao({ ...o, personalNome: ' ' })).not.toContain('—')
  })
})

describe('outros pedidos do mesmo horário', () => {
  it('só os pendentes no mesmo instante, menos o próprio', () => {
    const a = pedido()
    const lista = [a, pedido({ id: 'p2' }), pedido({ id: 'p3', inicio: '2026-10-30T11:00:00Z' }), pedido({ id: 'p4', status: 'recusado' })]
    expect(outrosDoMesmoHorario(lista, a).map((x) => x.id)).toEqual(['p2'])
  })
})

describe('normalizar', () => {
  it('aceita nulo e completa os campos', () => {
    expect(normalizarPedidos(null)).toEqual([])
    expect(normalizarPedidos([{ id: 'x', visitante_nome: 'A', visitante_telefone: '5521999990000', inicio: '2026-10-30T10:00:00Z', status: 'pendente', created_at: '2026-10-29T12:00:00Z' }])[0]).toMatchObject({ mensagem: null, aluno_id: null, duracao_min: 60 })
  })
})
