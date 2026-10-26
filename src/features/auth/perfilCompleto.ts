import type { PerfilProfissional } from './api'

/**
 * O perfil está completo quando há nome, CPF e telefone (o mesmo critério do retorno do Google). Cidade/UF ficam de fora de
 * propósito: contas antigas sem localização não podem ser barradas de repente; para elas segue o aviso suave em Configurações.
 * Quem cria conta pelo e-mail só informa nome, e-mail e senha: CPF, telefone e CEP vêm logo depois, nesta mesma regra.
 */
export function perfilCompleto(p: Pick<PerfilProfissional, 'name' | 'cpf' | 'phone'>): boolean {
  return !!p.name.trim() && !!(p.cpf ?? '').trim() && !!(p.phone ?? '').trim()
}
