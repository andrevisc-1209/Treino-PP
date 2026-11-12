import { describe, expect, it } from 'vitest'
import { adicionarLocal, lerLocais, removerLocal, resumoDosLocais, textoDoLocal, type LocalDeAtendimento } from './locaisAtendimento'

const L = (nome: string, endereco = 'Rua A, 1 - Rio'): LocalDeAtendimento => ({ nome, endereco, mapsLink: 'https://maps.google.com/x' })

describe('locais de atendimento', () => {
  it('lê só o formato conhecido', () => {
    expect(lerLocais(null)).toEqual([])
    expect(lerLocais('x')).toEqual([])
    expect(lerLocais([{ nome: '  Smart Fit  Laranjeiras ', endereco: 'R. X', mapsLink: 'http://x' }, { endereco: 'sem nome' }, 7])).toEqual([{ nome: 'Smart Fit Laranjeiras', endereco: 'R. X', mapsLink: '' }])
    expect(lerLocais(Array.from({ length: 9 }, (_, i) => ({ nome: `L${i}` }))).length).toBe(5)
  })
  it('adiciona sem repetir e respeita o limite de 5', () => {
    const a = adicionarLocal([], L('Academia X'))
    expect(a.ok && a.lista.length).toBe(1)
    expect(adicionarLocal(a.ok ? a.lista : [], L('academia x'))).toEqual({ ok: false, motivo: 'Esse local já está na lista.' })
    const cheia = ['A', 'B', 'C', 'D', 'E'].map((n) => L(n))
    expect(adicionarLocal(cheia, L('F'))).toEqual({ ok: false, motivo: 'Você pode ter até 5 locais. Remova um para adicionar outro.' })
    expect(adicionarLocal([], L('   '))).toEqual({ ok: false, motivo: 'Informe o nome do local.' })
  })
  it('remove pelo índice', () => {
    expect(removerLocal([L('A'), L('B'), L('C')], 1).map((l) => l.nome)).toEqual(['A', 'C'])
  })
  it('o resumo da página pública traz só os nomes, em até 100 caracteres, sem cortar nome', () => {
    expect(resumoDosLocais([])).toBeNull()
    expect(resumoDosLocais([L('Smart Fit Laranjeiras'), L('Bodytech Botafogo')])).toBe('Smart Fit Laranjeiras · Bodytech Botafogo')
    const longo = resumoDosLocais([L('A'.repeat(60)), L('B'.repeat(60))])!
    expect(longo).toBe('A'.repeat(60))
    expect(resumoDosLocais([L('x'.repeat(80))])!.length).toBe(80)
    expect(resumoDosLocais([L('Academia X', 'Rua Secreta 100, apto 5')])).not.toContain('Rua')
  })
  it('o texto do local da aula leva nome e endereço', () => {
    expect(textoDoLocal(L('Smart Fit', 'Rua A, 1 - Rio'))).toBe('Smart Fit — Rua A, 1 - Rio')
    expect(textoDoLocal(L('Rua A, 1', 'Rua A, 1 - Rio'))).toBe('Rua A, 1')
    expect(textoDoLocal(L('Parque', ''))).toBe('Parque')
  })
})
