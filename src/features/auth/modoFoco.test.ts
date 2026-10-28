import { describe, expect, it } from 'vitest'
import { emModoFoco } from './modoFoco'

describe('emModoFoco', () => {
  it('esconde a navegação e o banner de trial no cadastro, na edição, na sessão e ao excluir a conta', () => {
    for (const rota of ['/alunos/novo', '/alunos/abc/editar', '/alunos/abc/sessoes/nova', '/alunos/abc/sessoes/123/finalizar', '/configuracoes/excluir-conta']) expect(emModoFoco(rota)).toBe(true)
  })
  it('mantém nas demais telas', () => {
    for (const rota of ['/', '/alunos', '/alunos/importar', '/alunos/abc', '/configuracoes', '/ajuda']) expect(emModoFoco(rota)).toBe(false)
  })
})
