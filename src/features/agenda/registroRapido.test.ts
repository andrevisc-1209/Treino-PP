import { describe, expect, it } from 'vitest'
import { mensagemDeAulaRegistrada, mensagemDeFaltaRegistrada, registroComUmToque } from './registroRapido'

const p = (id: string, status = 'previsto', nome = 'Maria Souza') => ({ id, aluno_id: `al-${id}`, status, aluno: { name: nome } })

describe('registro com um toque', () => {
  it('vale para aula com um único aluno previsto', () => {
    expect(registroComUmToque({ aula_participantes: [p('1')] })?.id).toBe('1')
  })
  it('aula em grupo abre a folha de ações', () => {
    expect(registroComUmToque({ aula_participantes: [p('1'), p('2')] })).toBeNull()
  })
  it('participante já registrado não entra, nem aula sem participante', () => {
    expect(registroComUmToque({ aula_participantes: [p('1', 'presente')] })).toBeNull()
    expect(registroComUmToque({ aula_participantes: [] })).toBeNull()
  })
})

describe('mensagens do registro', () => {
  it('usa só o primeiro nome', () => {
    expect(mensagemDeAulaRegistrada('Maria Souza')).toBe('Aula de Maria registrada.')
    expect(mensagemDeAulaRegistrada(null)).toBe('Aula de Aluno registrada.')
  })
  it('a falta diz se foi cobrada', () => {
    expect(mensagemDeFaltaRegistrada('Maria Souza', true)).toBe('Falta de Maria registrada e cobrada.')
    expect(mensagemDeFaltaRegistrada('Maria Souza', false)).toBe('Falta de Maria registrada, sem cobrança.')
  })
})
