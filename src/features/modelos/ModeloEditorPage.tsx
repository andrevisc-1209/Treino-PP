import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ExerciciosEditor } from '@/components/ExerciciosEditor'
import {
  useAdicionarExercicioModelo,
  useAtualizarItemModelo,
  useModelo,
  useModeloExercicios,
  useRemoverItemModelo,
  useReordenarItemModelo,
} from './api'

export function ModeloEditorPage() {
  const { modeloId } = useParams<{ modeloId: string }>()
  const { data: modelo, isLoading: modeloLoading } = useModelo(modeloId)
  const { data: itens, isLoading: itensLoading } = useModeloExercicios(modeloId)

  const adicionar = useAdicionarExercicioModelo(modeloId!)
  const atualizarItem = useAtualizarItemModelo(modeloId!)
  const removerItem = useRemoverItemModelo(modeloId!)
  const reordenar = useReordenarItemModelo(modeloId!)

  if (!modeloId) return <Navigate to="/modelos" replace />
  if (modeloLoading) return <p className="p-4 text-slate-500">Carregando…</p>
  if (!modelo) return <p className="p-4 text-slate-500">Treino pronto não encontrado.</p>

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/modelos" className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{modelo.name}</h1>
          {modelo.notes && <p className="truncate text-sm text-slate-500">{modelo.notes}</p>}
        </div>
      </header>

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
