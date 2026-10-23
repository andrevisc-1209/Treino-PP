import { useState } from 'react'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { BottomSheet } from '@/components/ui'
import { cn } from '@/lib/utils'

/** Chips de valores rápidos (distância, tempo, descanso…). */
export function Chips({ valores, atual, unidade, onEscolher }: { valores: number[]; atual: number | undefined; unidade: string; onEscolher: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {valores.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={atual === v}
          onClick={() => onEscolher(v)}
          className={cn('min-h-9 rounded-full border px-3 text-xs font-medium', atual === v ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
        >
          {v}
          {unidade}
        </button>
      ))}
    </div>
  )
}

/** Zona de frequência cardíaca 1–5 (toque de novo para limpar). */
export function ZonasFc({ atual, onEscolher }: { atual: number | undefined; onEscolher: (z: 1 | 2 | 3 | 4 | 5 | undefined) => void }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">Zona de FC (opcional)</p>
      <div className="flex gap-1.5" role="group" aria-label="Zona de frequência cardíaca">
        {([1, 2, 3, 4, 5] as const).map((z) => (
          <button
            key={z}
            type="button"
            aria-pressed={atual === z}
            onClick={() => onEscolher(atual === z ? undefined : z)}
            className={cn('min-h-11 flex-1 rounded-xl border text-sm font-semibold', atual === z ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
          >
            Z{z}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Título do bloco + ↑ ↓ e remover. */
export function CabecalhoBloco({ titulo, indice, total, onMover, onRemover }: { titulo: string; indice: number; total: number; onMover: (d: -1 | 1) => void; onRemover: () => void }) {
  const n = indice + 1
  const botao = 'flex size-11 items-center justify-center rounded-xl active:bg-slate-100 disabled:opacity-30'
  return (
    <div className="flex items-center justify-between gap-1">
      <p className="min-w-0 truncate font-semibold">{titulo}</p>
      <div className="flex shrink-0">
        <button type="button" onClick={() => onMover(-1)} disabled={indice === 0} aria-label={`Subir ${titulo} (${n})`} className={cn(botao, 'text-slate-500')}>
          <ArrowUp size={18} />
        </button>
        <button type="button" onClick={() => onMover(1)} disabled={indice === total - 1} aria-label={`Descer ${titulo} (${n})`} className={cn(botao, 'text-slate-500')}>
          <ArrowDown size={18} />
        </button>
        <button type="button" onClick={onRemover} aria-label={`Remover ${titulo} (${n})`} className={cn(botao, 'text-red-600')}>
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

/** Exercício do personal listado na aba "Meus exercícios" do seletor. */
export type ExercicioDoSeletor = { id: string; nome: string; tipoId: string; rotuloTipo: string; detalhe: string }

/**
 * Escolha do tipo de treino (cards com nome e descrição). Com `meus`/`onEscolherExercicio`, ganha a aba
 * "Meus exercícios" (exercícios criados pelo personal para a modalidade), com filtro por tipo.
 */
export function SeletorTipoTreino({
  aberto,
  titulo,
  tipos,
  onEscolher,
  onClose,
  meus,
  onEscolherExercicio,
}: {
  aberto: boolean
  titulo: string
  tipos: { id: string; nome: string; descricao: string }[]
  onEscolher: (id: string) => void
  onClose: () => void
  meus?: ExercicioDoSeletor[]
  onEscolherExercicio?: (e: ExercicioDoSeletor) => void
}) {
  const [aba, setAba] = useState<'tipos' | 'meus'>('tipos')
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null)
  const comMeus = !!onEscolherExercicio
  const lista = (meus ?? []).filter((e) => !tipoFiltro || e.tipoId === tipoFiltro)
  const tiposPresentes = tipos.filter((t) => (meus ?? []).some((e) => e.tipoId === t.id))

  return (
    <BottomSheet open={aberto} onClose={onClose} title={titulo} mostrarFechar>
      {comMeus && (
        <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
          {(
            [
              ['tipos', 'Tipos do app', tipos.length],
              ['meus', 'Meus exercícios', meus?.length ?? 0],
            ] as const
          ).map(([id, rotulo, qtd]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={cn('min-h-11 flex-1 rounded-lg px-2 text-sm font-medium', aba === id ? 'bg-white shadow-sm' : 'text-slate-500')}
            >
              {rotulo} <span className="text-slate-600">({qtd})</span>
            </button>
          ))}
        </div>
      )}

      {aba === 'tipos' || !comMeus ? (
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {tipos.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onEscolher(t.id)} className="w-full rounded-2xl border border-slate-200 p-3 text-left active:bg-slate-50">
                <p className="font-medium">{t.nome}</p>
                <p className="text-sm text-slate-500">{t.descricao}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2">
          {tiposPresentes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por tipo">
              {[{ id: null, nome: 'Todos' }, ...tiposPresentes].map((t) => (
                <button
                  key={t.id ?? 'todos'}
                  type="button"
                  aria-pressed={tipoFiltro === t.id}
                  onClick={() => setTipoFiltro(t.id)}
                  className={cn('min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm font-medium', tipoFiltro === t.id ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
                >
                  {t.nome}
                </button>
              ))}
            </div>
          )}
          {(meus?.length ?? 0) === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Você ainda não criou exercícios para esta modalidade. Crie em Meus treinos › Exercícios.</p>
          ) : (
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
              {lista.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => onEscolherExercicio?.(e)} className="w-full rounded-2xl border border-slate-200 p-3 text-left active:bg-slate-50">
                    <p className="font-medium">{e.nome}</p>
                    <p className="text-sm text-slate-500">{e.detalhe}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
