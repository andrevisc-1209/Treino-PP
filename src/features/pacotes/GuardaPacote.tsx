import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PackageX } from 'lucide-react'
import { PaginaSkeleton } from '@/components/Skeleton'
import { useAluno } from '@/features/alunos/api'
import { usePacotesAtivos } from './api'
import { pacoteEsgotado, situacaoDoPacote } from './pacote'
import { hojeSP } from '@/lib/datas'

/**
 * Trava de início de treino: se o pacote do aluno já está no total (10/10), em vez de abrir o treino mostra o aviso com o
 * atalho para renovar. Em caso de erro ao ler o pacote (sinal ruim na academia) deixa passar: a trava nunca impede o atendimento.
 */
export function GuardaPacote({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const { data: pacotes, isLoading } = usePacotesAtivos()
  const { data: aluno } = useAluno(id)
  if (!id) return children
  if (isLoading) return <PaginaSkeleton />
  const atual = pacotes?.get(id)
  if (!atual || !pacoteEsgotado(atual.pacote, atual.presencas)) return children
  const situacao = situacaoDoPacote(atual.pacote, atual.presencas, hojeSP())
  const nome = aluno?.name ?? 'O aluno'
  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm" role="alert">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-700">
          <PackageX size={24} aria-hidden />
        </span>
        <h1 className="text-xl font-bold">Pacote acabou</h1>
        <p className="text-slate-600">
          {nome} usou todas as aulas do pacote ({situacao.contador}). Renove o pacote para começar um novo ciclo e seguir com as aulas.
        </p>
        <div className="flex flex-col gap-2">
          <Link to={`/alunos/${id}?renovar=1`} className="flex min-h-12 items-center justify-center rounded-xl bg-brand font-medium text-white active:bg-brand-hover">
            Renovar pacote
          </Link>
          <Link to={`/alunos/${id}`} className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white font-medium text-slate-700 active:bg-slate-50">
            Voltar
          </Link>
        </div>
      </div>
    </div>
  )
}
