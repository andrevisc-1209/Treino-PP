import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { ExerciciosEditor } from '@/components/ExerciciosEditor'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import {
  useAdicionarExercicioModelo,
  useAtualizarItemModelo,
  useAtualizarModelo,
  useModelo,
  useModeloExercicios,
  useRemoverItemModelo,
  useReordenarItemModelo,
} from './api'

export function ModeloEditorPage() {
  const { modeloId } = useParams<{ modeloId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  // Capturado uma única vez no primeiro render: o efeito abaixo limpa o parâmetro
  // da URL assim que monta, mas os dados (useModelo/useModeloExercicios) ainda
  // podem estar carregando — sem isso, o ExerciciosEditor só monta de verdade
  // depois, já sem o parâmetro, e o bottom sheet nunca abre sozinho.
  const [abrirAdicionarInicial] = useState(() => searchParams.get('adicionar') === '1')

  const { data: modelo, isLoading: modeloLoading } = useModelo(modeloId)
  const { data: itens, isLoading: itensLoading } = useModeloExercicios(modeloId)

  const adicionar = useAdicionarExercicioModelo(modeloId!)
  const atualizarItem = useAtualizarItemModelo(modeloId!)
  const removerItem = useRemoverItemModelo(modeloId!)
  const reordenar = useReordenarItemModelo(modeloId!)
  const atualizarModelo = useAtualizarModelo()

  const [editandoNome, setEditandoNome] = useState(false)
  const [nome, setNome] = useState('')
  const [notas, setNotas] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('adicionar') === '1') {
      const proximo = new URLSearchParams(searchParams)
      proximo.delete('adicionar')
      setSearchParams(proximo, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!modeloId) return <Navigate to="/meus-treinos/planejados" replace />
  if (modeloLoading) return <p className="p-4 text-slate-500">Carregando…</p>
  if (!modelo) return <p className="p-4 text-slate-500">Treino planejado não encontrado.</p>

  const abrirEditarNome = () => {
    setNome(modelo.name)
    setNotas(modelo.notes ?? '')
    setErro(null)
    setEditandoNome(true)
  }

  const salvarNome = () => {
    if (!nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    atualizarModelo.mutate(
      { id: modeloId, name: nome.trim(), notes: notas.trim() },
      { onSuccess: () => setEditandoNome(false), onError: (e) => setErro((e as Error).message) },
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/meus-treinos/planejados" className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{modelo.name}</h1>
          {modelo.notes && <p className="truncate text-sm text-slate-500">{modelo.notes}</p>}
        </div>
        <button
          onClick={abrirEditarNome}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
          aria-label="Editar nome e observações"
        >
          <Pencil size={18} />
        </button>
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
        abrirAdicionarInicial={abrirAdicionarInicial}
      />

      <BottomSheet open={editandoNome} onClose={() => setEditandoNome(false)} title="Editar treino planejado">
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </Field>
          <Field label="Observações">
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={salvarNome} className="w-full" disabled={atualizarModelo.isPending}>
            Salvar
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
