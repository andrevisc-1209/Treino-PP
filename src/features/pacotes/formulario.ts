import type { CobrancaFormValor } from '@/features/financeiro/CobrancaForm'
import type { PagamentoPacote, SalvarPacoteInput } from './api'
import { aulasAnterioresParaContador, type Pacote } from './pacote'

/** Formulário de cobrança → dados do pacote. `presencasNoApp` = presenças que o app já contou (0 num pacote novo). */
export function payloadPacote(v: CobrancaFormValor, alunoId: string, presencasNoApp = 0): SalvarPacoteInput {
  const feitas = v.feitasPacoteTexto.trim() === '' ? 0 : Number(v.feitasPacoteTexto)
  return {
    aluno_id: alunoId,
    qtd_aulas: Number(v.qtdPacoteTexto),
    valor: Number(v.valorTexto.replace(',', '.')),
    validade_dias: Number(v.validadePacoteTexto),
    aulas_anteriores: aulasAnterioresParaContador(feitas, presencasNoApp),
    conta_distancia: v.pacoteContaDistancia,
  }
}

/** Pacote ativo → formulário de edição (as aulas "já feitas" mostram o contador atual). */
export function formularioDoPacote(p: Pacote, usadas: number, base: CobrancaFormValor): CobrancaFormValor {
  return {
    ...base,
    modelo: 'pacote',
    valorTexto: String(p.valor),
    qtdPacoteTexto: String(p.qtd_aulas),
    validadePacoteTexto: String(p.validade_dias),
    feitasPacoteTexto: String(usadas),
    pacoteContaDistancia: p.conta_distancia,
  }
}

/** Pagamento escolhido no formulário (só vale na venda de um pacote novo). */
export function pagamentoDoFormulario(v: CobrancaFormValor): PagamentoPacote {
  return { recebido: v.pacoteRecebido, data: v.pagamentoDataTexto, forma: v.formaPagamento }
}
