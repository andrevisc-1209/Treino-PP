import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { useAtualizarModelo, useCriarModelo, useDuplicarModelo, useExcluirModelo, useModelos, type Modelo } from './api'

export function ModelosPage() {
  const { data: modelos, isLoading, error } = useModelos()
  const criar = useCriarModelo()
  const atualizar = useAtualizarModelo()
  const duplicar = useDuplicarModelo()
  const excluir = useExcluirModelo()

  const [editando, setEditando] = useState<Modelo | 'novo' | null>(null)
  const [nome, setNome] = useState('')
  const [notas, setNotas] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const abrirNovo = () => {
    setNome('')
    setNotas('')
    setErro(null)
    setEditando('novo')
  }

  const abrirEditar = (m: Modelo) => {
    setNome(m.name)
    setNotas(m.notes ?? '')
    setErro(null)
    setEditando(m)
  }

  const salvar = () => {
    if (!nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    if (editando === 'novo') {
      criar.mutate({ name: nome.trim(), notes: notas.trim() }, { onSuccess: () => setEditando(null), onError: (e) => setErro((e as Error).message) })
    } else if (editando) {
      atualizar.mutate(
        { id: editando.id, name: nome.trim(), notes: notas.trim() },
        { onSuccess: () => setEditando(null), onError: (e) => setErro((e as Error).message) },
      )
    }
  }

  const excluirModelo = (m: Modelo) => {
    if (!confirm(`Excluir o modelo "${m.name}"? Os planos já criados a partir dele não são afetados.`)) return
    excluir.mutate(m.id)
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Modelos de treino</h1>
        <Button onClick={abrirNovo} aria-label="Novo modelo" className="px-3">
          <Plus size={20} />
        </Button>
      </header>

      {isLoading && <p className="text-slate-500">Carregando…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
      {modelos?.length === 0 && <p className="text-sm text-slate-500">Nenhum modelo ainda. Crie treinos prontos para aplicar aos alunos.</p>}

      <ul className="space-y-2">
        {modelos?.map((m) => {
          const ordenados = [...m.modelo_exercicios].sort((a, b) => a.order_index - b.order_index)
          const previa = ordenados
            .slice(0, 3)
            .map((i) => i.exercicio?.name)
            .filter(Boolean)
            .join(', ')
          return (
            <li key={m.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Link to={`/modelos/${m.id}`} className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-slate-500">
                    {m.modelo_exercicios.length} exercícios{previa && ` · ${previa}`}
                  </p>
                </Link>
                <button
                  onClick={() => abrirEditar(m)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                  aria-label={`Renomear ${m.name}`}
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => duplicar.mutate(m)}
                  disabled={duplicar.isPending}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                  aria-label={`Duplicar ${m.name}`}
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={() => excluirModelo(m)}
                  disabled={excluir.isPending}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-red-600 active:bg-slate-100"
                  aria-label={`Excluir ${m.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <BottomSheet open={!!editando} onClose={() => setEditando(null)} title={editando === 'novo' ? 'Novo modelo' : 'Renomear modelo'}>
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus placeholder="Full body A" />
          </Field>
          <Field label="Observações">
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={salvar} className="w-full" disabled={criar.isPending || atualizar.isPending}>
            Salvar
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
