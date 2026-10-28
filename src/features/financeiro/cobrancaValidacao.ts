import type { CobrancaFormValor } from './CobrancaForm'
import { hojeSP } from '@/lib/datas'
import { validarDistancia } from './distancia'
import { validarPacote } from '@/features/pacotes/pacote'

/**
 * Valida o formulário de cobrança com os MESMOS limites do banco (aluno_cobranca): valor > 0, dia do ciclo de 1 a 28 e
 * vencimento de 0 a 30 dias. Sem isso o cadastro do aluno chegava ao banco com valor fora do limite e a cobrança era perdida
 * (o aluno era salvo, mas o erro ficava escondido na etapa 2, enquanto o usuário já estava na etapa 3).
 * Devolve a mensagem do primeiro problema, ou null se está tudo certo.
 */
export function validarCobranca(v: CobrancaFormValor, minimoFeitasPacote = 0, comPagamento = true): string | null {
  const valor = Number(v.valorTexto.replace(',', '.'))
  if (!v.valorTexto.trim() || Number.isNaN(valor) || valor <= 0) return 'Informe um valor maior que zero'

  // pacote não tem ciclo nem vencimento: vale o que o banco exige em aluno_pacotes
  if (v.modelo === 'pacote') {
    const erroPacote = validarPacote({ qtdTexto: v.qtdPacoteTexto, validadeTexto: v.validadePacoteTexto, feitasTexto: v.feitasPacoteTexto }, minimoFeitasPacote)
    if (erroPacote || !comPagamento) return erroPacote
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.pagamentoDataTexto)) return v.pacoteRecebido ? 'Informe a data do recebimento' : 'Informe o vencimento'
    if (v.pacoteRecebido && v.pagamentoDataTexto > hojeSP()) return 'A data do recebimento não pode ser futura'
    return null
  }

  const dia = Number(v.diaCicloTexto)
  if (!v.diaCicloTexto.trim() || !Number.isInteger(dia) || dia < 1 || dia > 28) return 'Dia do ciclo deve ser entre 1 e 28'

  // vazio = 0 (vence no dia do fechamento), como o app sempre fez
  const venc = v.diasVencimentoTexto.trim() === '' ? 0 : Number(v.diasVencimentoTexto)
  if (!Number.isInteger(venc) || venc < 0 || venc > 30) return 'Vencimento deve ser de 0 a 30 dias após o fechamento'

  return validarDistancia(v)
}
