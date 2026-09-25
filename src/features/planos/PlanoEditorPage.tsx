import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { useAluno } from '@/features/alunos/api'
import { avisoSaude } from '@/features/alunos/format'
import { ExerciciosEditor } from '@/components/ExerciciosEditor'
import { useAdicionarExercicio, useAtualizarItem, usePlano, usePlanoExercicios, useRemoverItem, useReordenarItem } from './api'

export function PlanoEditorPage() {
  const { id, planoId } = useParams<{ id: string; planoId: string }>()
  const { data: aluno } = useAluno(id)
  const { data: plano, isLoading: planoLoading } = usePlano(planoId)
  const { data: itens, isLoading: itensLoading } = usePlanoExercicios(planoId)

  const adicionar = useAdicionarExercicio(planoId!)
  const atualizarItem = useAtualizarItem(planoId!)
  const removerItem = useRemoverItem(planoId!)
  const reordenar = useReordenarItem(planoId!)

  if (!id || !planoId) return <Navigate to="/" replace />
  if (planoLoading) return <p className="p-4 text-slate-500">Carregando…</p>
  if (!plano) return <p className="p-4 text-slate-500">Plano não encontrado.</p>

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to={`/alunos/${id}`} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{plano.name}</h1>
          {plano.notes && <p className="truncate text-sm text-slate-500">{plano.notes}</p>}
        </div>
      </header>

      {aluno && avisoSaude(aluno) && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <span>{avisoSaude(aluno)}</span>
        </div>
      )}

      <ExerciciosEditor
        itens={itens}
        isLoading={itensLoading}
        onAdicionar={(input, opts) => adicionar.mutate(input, opts)}
        adicionarPending={adicionar.isPending}
        onSalvarItem={(input, opts) => atualizarItem.mutate(input, opts)}
        salvarItemPending={atualizarItem.isPending}
        onRemoverItem={(id, opts) => removerItem.mutate(id, opts)}
        removerItemPending={removerItem.isPending}
        onReordenar={(a, b) => reordenar.mutate({ a, b })}
        reordenarPending={reordenar.isPending}
      />
    </div>
  )
}
