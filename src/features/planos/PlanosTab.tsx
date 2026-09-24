import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Pencil, Plus, Power } from 'lucide-react'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { useAtualizarPlano, useCriarPlano, useDuplicarPlano, usePlanos, type Plano } from './api'

export function PlanosTab({ alunoId }: { alunoId: string }) {
  const { data: planos, isLoading, error } = usePlanos(alunoId)
  const criar = useCriarPlano(alunoId)
  const atualizar = useAtualizarPlano(alunoId)
  const duplicar = useDuplicarPlano(alunoId)

  const [editando, setEditando] = useState<Plano | 'novo' | null>(null)
  const [nome, setNome] = useState('')
  const [notas, setNotas] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const abrirNovo = () => {
    setNome('')
    setNotas('')
    setErro(null)
    setEditando('novo')
  }

  const abrirEditar = (p: Plano) => {
    setNome(p.name)
    setNotas(p.notes ?? '')
    setErro(null)
    setEditando(p)
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

  if (isLoading) return <p className="text-slate-500">Carregando…</p>
  if (error) return <p className="text-red-600">{(error as Error).message}</p>

  return (
    <div className="space-y-3">
      <Button onClick={abrirNovo} className="w-full">
        <Plus size={18} /> Novo plano
      </Button>

      {planos?.length === 0 && <p className="text-sm text-slate-500">Nenhum plano ainda.</p>}

      <ul className="space-y-2">
        {planos?.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Link to={`/alunos/${alunoId}/planos/${p.id}`} className="min-w-0 flex-1">
                <p className={`font-medium ${!p.active ? 'text-slate-400' : ''}`}>
                  {p.name}
                  {!p.active && <span className="ml-2 text-xs font-normal">(inativo)</span>}
                </p>
                <p className="text-sm text-slate-500">{p.plano_exercicios[0]?.count ?? 0} exercícios</p>
              </Link>
              <button
                onClick={() => abrirEditar(p)}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                aria-label={`Renomear ${p.name}`}
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => duplicar.mutate(p)}
                disabled={duplicar.isPending}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                aria-label={`Duplicar ${p.name}`}
              >
                <Copy size={18} />
              </button>
              <button
                onClick={() => atualizar.mutate({ id: p.id, active: !p.active })}
                disabled={atualizar.isPending}
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl active:bg-slate-100 ${p.active ? 'text-brand' : 'text-slate-400'}`}
                aria-label={p.active ? `Desativar ${p.name}` : `Ativar ${p.name}`}
              >
                <Power size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <BottomSheet open={!!editando} onClose={() => setEditando(null)} title={editando === 'novo' ? 'Novo plano' : 'Renomear plano'}>
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus placeholder="Treino A" />
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
