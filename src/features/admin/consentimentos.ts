import type { ConsentimentosPersonal } from './api'

export type FiltroConsentimento = '' | 'confirmados' | 'pendentes' | 'negados' | 'nao_solicitados'

export const FILTROS_CONSENTIMENTO: { valor: FiltroConsentimento; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'confirmados', rotulo: 'Confirmado' },
  { valor: 'pendentes', rotulo: 'Pendente' },
  { valor: 'negados', rotulo: 'Negado' },
  { valor: 'nao_solicitados', rotulo: 'Não solicitado' },
]

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Busca por nome/e-mail do personal; o filtro de status mantém só quem tem ao menos um aluno naquele status. */
export function filtrarConsentimentosAdmin(
  linhas: ConsentimentosPersonal[],
  { busca, status }: { busca: string; status: FiltroConsentimento },
): ConsentimentosPersonal[] {
  const termo = semAcento(busca.trim())
  return linhas.filter(
    (l) =>
      (!termo || semAcento(l.nome).includes(termo) || semAcento(l.email ?? '').includes(termo)) && (status === '' || l[status] > 0),
  )
}

export function totaisConsentimento(linhas: ConsentimentosPersonal[]) {
  return linhas.reduce(
    (t, l) => ({
      alunos: t.alunos + l.total_alunos,
      confirmados: t.confirmados + l.confirmados,
      pendentes: t.pendentes + l.pendentes,
      negados: t.negados + l.negados,
      nao_solicitados: t.nao_solicitados + l.nao_solicitados,
    }),
    { alunos: 0, confirmados: 0, pendentes: 0, negados: 0, nao_solicitados: 0 },
  )
}
