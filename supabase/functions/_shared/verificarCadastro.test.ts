import { describe, expect, it } from 'vitest'
import { escaparIlike, lerPedidoVerificacao } from './verificarCadastro.ts'

describe('lerPedidoVerificacao', () => {
  it('CPF válido (com ou sem máscara) vira só dígitos; inválido é recusado', () => {
    expect(lerPedidoVerificacao({ campo: 'cpf', valor: '529.982.247-25' })).toEqual({ campo: 'cpf', cpf: '52998224725' })
    expect(lerPedidoVerificacao({ campo: 'cpf', valor: '52998224726' })).toBeNull()
    expect(lerPedidoVerificacao({ campo: 'cpf', valor: '111.111.111-11' })).toBeNull()
  })
  it('e-mail é aparado e passa para minúsculas; malformado é recusado', () => {
    expect(lerPedidoVerificacao({ campo: 'email', valor: '  Ana@Exemplo.COM ' })).toEqual({ campo: 'email', email: 'ana@exemplo.com' })
    expect(lerPedidoVerificacao({ campo: 'email', valor: 'sem-arroba' })).toBeNull()
    expect(lerPedidoVerificacao({ campo: 'email', valor: 'a@b' })).toBeNull()
  })
  it('campo desconhecido ou corpo inválido: null', () => {
    expect(lerPedidoVerificacao({ campo: 'telefone', valor: '21999990000' })).toBeNull()
    expect(lerPedidoVerificacao(null)).toBeNull()
    expect(lerPedidoVerificacao('x')).toBeNull()
  })
})

describe('escaparIlike', () => {
  it('neutraliza curingas para a busca ser igualdade exata', () => {
    expect(escaparIlike('a_b%c\\d@x.com')).toBe('a\\_b\\%c\\\\d@x.com')
  })
})
