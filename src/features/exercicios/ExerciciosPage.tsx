import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { ExerciciosTabs } from '@/components/ExerciciosTabs'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mapearErroSupabase } from '@/lib/erros'
import { useAtualizarExercicio, useCriarExercicio, useExcluirExercicio, useExercicios, type Exercicio } from './api'

type FormState = { name: string; muscle_group: string; equipment: string; description: string }
const EMPTY_FORM: FormState = { name: '', muscle_group: '', equipment: '', description: '' }

export function ExerciciosPage() {
  const { session } = useAuth()
  const { data: exercicios, isLoading, error } = useExercicios()
  const criar = useCriarExercicio()
  const atualizar = useAtualizarExercicio()
  const excluir = useExcluirExercicio()

  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState<string | null>(null)
  const [editando, setEditando] = useState<Exercicio | null>(null)
  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [erro, setErro] = useState<string | null>(null)

  const grupos = useMemo(() => {
    const set = new Set<string>()
    exercicios?.forEach((e) => e.muscle_group && set.add(e.muscle_group))
    return Array.from(set).sort()
  }, [exercicios])

  const filtrados = exercicios?.filter((e) => {
    if (grupo && e.muscle_group !== grupo) return false
    if (busca.trim() && !e.name.toLowerCase().includes(busca.trim().toLowerCase())) return false
    return true
  })

  const abrirCriar = () => {
    setForm(EMPTY_FORM)
    setErro(null)
    setCriando(true)
  }

  const abrirEditar = (ex: Exercicio) => {
    setForm({
      name: ex.name,
      muscle_group: ex.muscle_group ?? '',
      equipment: ex.equipment ?? '',
      description: ex.description ?? '',
    })
    setErro(null)
    setEditando(ex)
  }

  const fechar = () => {
    setCriando(false)
    setEditando(null)
  }

  const salvar = () => {
    if (!form.name.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    const input = {
      name: form.name.trim(),
      muscle_group: form.muscle_group.trim(),
      equipment: form.equipment.trim(),
      description: form.description.trim(),
    }
    if (editando) {
      atualizar.mutate({ id: editando.id, ...input }, { onSuccess: fechar, onError: (e) => setErro((e as Error).message) })
    } else {
      criar.mutate(input, { onSuccess: fechar, onError: (e) => setErro((e as Error).message) })
    }
  }

  const excluirAtual = async () => {
    if (!editando) return
    const ok = await confirmarAcao({ titulo: 'Excluir exercício', mensagem: `Excluir "${editando.name}"?`, textoConfirmar: 'Excluir', destrutivo: true })
    if (!ok) return
    excluir.mutate(editando.id, { onSuccess: fechar, onError: (e) => setErro((e as Error).message) })
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercícios</h1>
        <Button onClick={abrirCriar} aria-label="Novo exercício" className="px-3">
          <Plus size={20} />
        </Button>
      </header>

      <ExerciciosTabs />

      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar exercício" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setGrupo(null)}
          className={cn(
            'min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm font-medium',
            grupo === null ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-600',
          )}
        >
          Todos
        </button>
        {grupos.map((g) => (
          <button
            key={g}
            onClick={() => setGrupo(g === grupo ? null : g)}
            className={cn(
              'min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm font-medium',
              grupo === g ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-600',
            )}
          >
            {g}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-slate-500">Carregando…</p>}
      {error && <p className="text-red-600">{mapearErroSupabase(error)}</p>}
      {filtrados?.length === 0 && <p className="text-slate-500">Nenhum exercício encontrado.</p>}

      <ul className="space-y-2">
        {filtrados?.map((ex) => {
          const meu = ex.professional_id === session?.user.id
          return (
            <li key={ex.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{ex.name}</p>
                  {meu && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-dark">Meu</span>}
                </div>
                <p className="text-sm text-slate-500">{[ex.muscle_group, ex.equipment].filter(Boolean).join(' · ') || '—'}</p>
              </div>
              {meu && (
                <button
                  onClick={() => abrirEditar(ex)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                  aria-label={`Editar ${ex.name}`}
                >
                  <Pencil size={18} />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <BottomSheet open={criando || !!editando} onClose={fechar} title={editando ? 'Editar exercício' : 'Novo exercício'}>
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label="Grupo muscular">
            <Input value={form.muscle_group} onChange={(e) => setForm({ ...form, muscle_group: e.target.value })} />
          </Field>
          <Field label="Equipamento">
            <Input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <Button onClick={salvar} className="flex-1" disabled={criar.isPending || atualizar.isPending}>
              Salvar
            </Button>
            {editando && (
              <Button
                variant="ghost"
                onClick={excluirAtual}
                disabled={excluir.isPending}
                className="text-red-600"
                aria-label="Excluir exercício"
              >
                <Trash2 size={18} />
              </Button>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
