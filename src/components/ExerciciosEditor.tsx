import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useExercicios, type Exercicio } from '@/features/exercicios/api'
import type { ItemInput } from '@/features/planos/api'
import { cn } from '@/lib/utils'
import { formatarNumero } from '@/lib/format'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { mostrarDesfazer } from '@/components/UndoToast'

export type ExercicioEditavel = {
  id: string
  exercicio_id: string
  sets: number
  reps: string
  target_load_kg: number | null
  rest_seconds: number | null
  notes: string | null
  order_index: number
  exercicio: { name: string } | null
}

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

export function ExerciciosEditor<T extends ExercicioEditavel>({
  itens,
  isLoading,
  onAdicionar,
  adicionarPending,
  onSalvarItem,
  salvarItemPending,
  onRemoverItem,
  removerItemPending,
  onReordenar,
  reordenarPending,
  abrirAdicionarInicial,
}: {
  itens: T[] | undefined
  isLoading: boolean
  onAdicionar: (input: ItemInput & { exercicio_id: string; order_index: number }, opts: { onSuccess: () => void; onError: (e: Error) => void }) => void
  adicionarPending: boolean
  onSalvarItem: (input: ItemInput & { id: string }, opts: { onSuccess: () => void; onError: (e: Error) => void }) => void
  salvarItemPending: boolean
  onRemoverItem: (id: string, opts: { onSuccess: () => void; onError: (e: Error) => void }) => void
  removerItemPending: boolean
  onReordenar: (a: T, b: T) => void
  reordenarPending: boolean
  /** Abre o bottom sheet de "Adicionar exercício" assim que o editor monta (fluxo de criação). */
  abrirAdicionarInicial?: boolean
}) {
  const { data: exercicios } = useExercicios()

  const [adicionando, setAdicionando] = useState(false)

  useEffect(() => {
    if (abrirAdicionarInicial) setAdicionando(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirAdicionarInicial])
  const [buscaEx, setBuscaEx] = useState('')
  const [grupoEx, setGrupoEx] = useState<string | null>(null)
  const [escolhido, setEscolhido] = useState<Exercicio | null>(null)
  const [novoForm, setNovoForm] = useState<ItemForm>(EMPTY_ITEM_FORM)

  const [editandoItem, setEditandoItem] = useState<T | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM_FORM)
  const [erro, setErro] = useState<string | null>(null)

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
    onAdicionar(
      { ...parseItemForm(novoForm), exercicio_id: escolhido.id, order_index: itens?.length ?? 0 },
      { onSuccess: fecharAdicionar, onError: (e) => setErro(e.message) },
    )
  }

  const abrirEditarItem = (item: T) => {
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
    onSalvarItem({ id: editandoItem.id, ...parseItemForm(itemForm) }, { onSuccess: () => setEditandoItem(null), onError: (e) => setErro(e.message) })
  }

  const removerAtual = () => {
    if (!editandoItem) return
    const item = editandoItem
    onRemoverItem(item.id, {
      onSuccess: () => {
        setEditandoItem(null)
        mostrarDesfazer(`${item.exercicio?.name ?? 'Exercício'} removido.`, () => {
          onAdicionar(
            {
              exercicio_id: item.exercicio_id,
              order_index: item.order_index,
              sets: item.sets,
              reps: item.reps,
              target_load_kg: item.target_load_kg,
              rest_seconds: item.rest_seconds,
              notes: item.notes,
            },
            { onSuccess: () => {}, onError: () => {} },
          )
        })
      },
      onError: (e) => setErro(e.message),
    })
  }

  const mover = (index: number, dir: -1 | 1) => {
    if (!itens) return
    const alvo = index + dir
    if (alvo < 0 || alvo >= itens.length) return
    onReordenar(itens[index], itens[alvo])
  }

  return (
    <>
      <ul className="mb-4 space-y-2">
        {itens?.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => mover(index, -1)}
                disabled={index === 0 || reordenarPending}
                className="flex size-11 items-center justify-center rounded-lg text-slate-500 disabled:opacity-30 active:bg-slate-100"
                aria-label="Mover para cima"
              >
                <ChevronUp size={18} />
              </button>
              <button
                onClick={() => mover(index, 1)}
                disabled={index === itens.length - 1 || reordenarPending}
                className="flex size-11 items-center justify-center rounded-lg text-slate-500 disabled:opacity-30 active:bg-slate-100"
                aria-label="Mover para baixo"
              >
                <ChevronDown size={18} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.exercicio?.name ?? 'Exercício removido'}</p>
              <p className="text-sm text-slate-500">
                {item.sets}x {item.reps}
                {item.target_load_kg != null && ` · ${formatarNumero(item.target_load_kg)}kg`}
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
        {!isLoading && itens?.length === 0 && <p className="text-sm text-slate-500">Nenhum exercício ainda.</p>}
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
                  <button onClick={() => setEscolhido(ex)} className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100">
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
              <Button onClick={confirmarAdicionar} className="flex-1" disabled={adicionarPending}>
                Adicionar
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
            <Button onClick={salvarItem} className="flex-1" disabled={salvarItemPending}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={removerAtual} disabled={removerItemPending} className="text-red-600" aria-label="Remover exercício">
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
