import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2, TriangleAlert } from 'lucide-react'
import { useAluno } from '@/features/alunos/api'
import { useExercicios, type Exercicio } from '@/features/exercicios/api'
import { cn } from '@/lib/utils'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import {
  useAdicionarExercicio,
  useAtualizarItem,
  usePlano,
  usePlanoExercicios,
  useRemoverItem,
  useReordenarItem,
  type ItemInput,
  type PlanoExercicioItem,
} from './api'

type ItemForm = { sets: string; reps: string; target_load_kg: string; rest_seconds: string; notes: string }
const EMPTY_ITEM_FORM: ItemForm = { sets: '3', reps: '10', target_load_kg: '', rest_seconds: '60', notes: '' }

function parseItemForm(f: ItemForm): ItemInput {
  return {
    sets: Math.max(1, Number(f.sets) || 1),
    reps: f.reps.trim() || '10',
    target_load_kg: f.target_load_kg.trim() ? Number(f.target_load_kg) : null,
    rest_seconds: f.rest_seconds.trim() ? Number(f.rest_seconds) : null,
    notes: f.notes.trim() || null,
  }
}

export function PlanoEditorPage() {
  const { id, planoId } = useParams<{ id: string; planoId: string }>()
  const { data: aluno } = useAluno(id)
  const { data: plano, isLoading: planoLoading } = usePlano(planoId)
  const { data: itens, isLoading: itensLoading } = usePlanoExercicios(planoId)
  const { data: exercicios } = useExercicios()

  const adicionar = useAdicionarExercicio(planoId!)
  const atualizarItem = useAtualizarItem(planoId!)
  const removerItem = useRemoverItem(planoId!)
  const reordenar = useReordenarItem(planoId!)

  const [adicionando, setAdicionando] = useState(false)
  const [buscaEx, setBuscaEx] = useState('')
  const [grupoEx, setGrupoEx] = useState<string | null>(null)
  const [escolhido, setEscolhido] = useState<Exercicio | null>(null)
  const [novoForm, setNovoForm] = useState<ItemForm>(EMPTY_ITEM_FORM)

  const [editandoItem, setEditandoItem] = useState<PlanoExercicioItem | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM_FORM)
  const [erro, setErro] = useState<string | null>(null)

  if (!id || !planoId) return <Navigate to="/" replace />
  if (planoLoading || itensLoading) return <p className="p-4 text-slate-500">Carregando…</p>
  if (!plano) return <p className="p-4 text-slate-500">Plano não encontrado.</p>

  const gruposEx = Array.from(new Set(exercicios?.map((e) => e.muscle_group).filter((g): g is string => !!g))).sort()
  const exercitiosFiltrados = exercicios?.filter((e) => {
    if (grupoEx && e.muscle_group !== grupoEx) return false
    if (buscaEx.trim() && !e.name.toLowerCase().includes(buscaEx.trim().toLowerCase())) return false
    return true
  })

  const fecharAdicionar = () => {
    setAdicionando(false)
    setEscolhido(null)
    setBuscaEx('')
    setGrupoEx(null)
    setErro(null)
  }

  const confirmarAdicionar = () => {
    if (!escolhido) return
    adicionar.mutate(
      { ...parseItemForm(novoForm), exercicio_id: escolhido.id, order_index: itens?.length ?? 0 },
      { onSuccess: fecharAdicionar, onError: (e) => setErro((e as Error).message) },
    )
  }

  const abrirEditarItem = (item: PlanoExercicioItem) => {
    setItemForm({
      sets: String(item.sets),
      reps: item.reps,
      target_load_kg: item.target_load_kg != null ? String(item.target_load_kg) : '',
      rest_seconds: item.rest_seconds != null ? String(item.rest_seconds) : '',
      notes: item.notes ?? '',
    })
    setErro(null)
    setEditandoItem(item)
  }

  const salvarItem = () => {
    if (!editandoItem) return
    atualizarItem.mutate(
      { id: editandoItem.id, ...parseItemForm(itemForm) },
      { onSuccess: () => setEditandoItem(null), onError: (e) => setErro((e as Error).message) },
    )
  }

  const removerAtual = () => {
    if (!editandoItem) return
    if (!confirm(`Remover ${editandoItem.exercicio?.name} deste plano?`)) return
    removerItem.mutate(editandoItem.id, { onSuccess: () => setEditandoItem(null), onError: (e) => setErro((e as Error).message) })
  }

  const mover = (index: number, dir: -1 | 1) => {
    if (!itens) return
    const alvo = index + dir
    if (alvo < 0 || alvo >= itens.length) return
    reordenar.mutate({ a: itens[index], b: itens[alvo] })
  }

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

      {aluno?.injury && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <span>Lesão registrada: {aluno.injury_notes}</span>
        </div>
      )}

      <ul className="mb-4 space-y-2">
        {itens?.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => mover(index, -1)}
                disabled={index === 0 || reordenar.isPending}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 disabled:opacity-30 active:bg-slate-100"
                aria-label="Mover para cima"
              >
                <ChevronUp size={18} />
              </button>
              <button
                onClick={() => mover(index, 1)}
                disabled={index === itens.length - 1 || reordenar.isPending}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 disabled:opacity-30 active:bg-slate-100"
                aria-label="Mover para baixo"
              >
                <ChevronDown size={18} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.exercicio?.name ?? 'Exercício removido'}</p>
              <p className="text-sm text-slate-500">
                {item.sets}x {item.reps}
                {item.target_load_kg != null && ` · ${item.target_load_kg}kg`}
                {item.rest_seconds != null && ` · ${item.rest_seconds}s descanso`}
              </p>
              {item.notes && <p className="text-sm text-slate-400">{item.notes}</p>}
            </div>
            <button
              onClick={() => abrirEditarItem(item)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
              aria-label={`Editar ${item.exercicio?.name}`}
            >
              <Pencil size={18} />
            </button>
          </li>
        ))}
        {itens?.length === 0 && <p className="text-sm text-slate-500">Nenhum exercício neste plano ainda.</p>}
      </ul>

      <Button
        onClick={() => {
          setNovoForm(EMPTY_ITEM_FORM)
          setErro(null)
          setAdicionando(true)
        }}
        className="w-full"
      >
        <Plus size={18} /> Adicionar exercício
      </Button>

      <BottomSheet open={adicionando} onClose={fecharAdicionar} title={escolhido ? escolhido.name : 'Escolher exercício'}>
        {!escolhido ? (
          <div className="space-y-3">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Buscar exercício" value={buscaEx} onChange={(e) => setBuscaEx(e.target.value)} className="pl-10" autoFocus />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setGrupoEx(null)}
                className={cn(
                  'min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm font-medium',
                  grupoEx === null ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-600',
                )}
              >
                Todos
              </button>
              {gruposEx.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrupoEx(g === grupoEx ? null : g)}
                  className={cn(
                    'min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm font-medium',
                    grupoEx === g ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-600',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {exercitiosFiltrados?.map((ex) => (
                <li key={ex.id}>
                  <button
                    onClick={() => setEscolhido(ex)}
                    className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
                  >
                    <p className="font-medium">{ex.name}</p>
                    <p className="text-sm text-slate-500">{[ex.muscle_group, ex.equipment].filter(Boolean).join(' · ') || '—'}</p>
                  </button>
                </li>
              ))}
              {exercitiosFiltrados?.length === 0 && <p className="p-3 text-sm text-slate-500">Nenhum exercício encontrado.</p>}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Field label="Séries">
                <Input type="number" inputMode="numeric" value={novoForm.sets} onChange={(e) => setNovoForm({ ...novoForm, sets: e.target.value })} />
              </Field>
              <Field label="Repetições">
                <Input value={novoForm.reps} onChange={(e) => setNovoForm({ ...novoForm, reps: e.target.value })} placeholder="10, 8-12…" />
              </Field>
            </div>
            <div className="flex gap-2">
              <Field label="Carga alvo (kg)">
                <Input
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  value={novoForm.target_load_kg}
                  onChange={(e) => setNovoForm({ ...novoForm, target_load_kg: e.target.value })}
                />
              </Field>
              <Field label="Descanso (s)">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={novoForm.rest_seconds}
                  onChange={(e) => setNovoForm({ ...novoForm, rest_seconds: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Observação">
              <Input value={novoForm.notes} onChange={(e) => setNovoForm({ ...novoForm, notes: e.target.value })} />
            </Field>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <div className="flex gap-2">
              <Button onClick={confirmarAdicionar} className="flex-1" disabled={adicionar.isPending}>
                Adicionar ao plano
              </Button>
              <Button variant="ghost" onClick={() => setEscolhido(null)}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!editandoItem} onClose={() => setEditandoItem(null)} title={editandoItem?.exercicio?.name}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Field label="Séries">
              <Input type="number" inputMode="numeric" value={itemForm.sets} onChange={(e) => setItemForm({ ...itemForm, sets: e.target.value })} />
            </Field>
            <Field label="Repetições">
              <Input value={itemForm.reps} onChange={(e) => setItemForm({ ...itemForm, reps: e.target.value })} placeholder="10, 8-12…" />
            </Field>
          </div>
          <div className="flex gap-2">
            <Field label="Carga alvo (kg)">
              <Input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={itemForm.target_load_kg}
                onChange={(e) => setItemForm({ ...itemForm, target_load_kg: e.target.value })}
              />
            </Field>
            <Field label="Descanso (s)">
              <Input
                type="number"
                inputMode="numeric"
                value={itemForm.rest_seconds}
                onChange={(e) => setItemForm({ ...itemForm, rest_seconds: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Observação">
            <Input value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <Button onClick={salvarItem} className="flex-1" disabled={atualizarItem.isPending}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={removerAtual} disabled={removerItem.isPending} className="text-red-600" aria-label="Remover exercício">
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
