import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Clock, Plus, RotateCcw, SkipForward, TriangleAlert } from 'lucide-react'
import { useAluno } from '@/features/alunos/api'
import { avisoSaude } from '@/features/alunos/format'
import { useExercicios, type Exercicio } from '@/features/exercicios/api'
import { cn } from '@/lib/utils'
import { formatarNumero } from '@/lib/format'
import { ScaleQuestion } from '@/components/ScaleQuestion'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { BotaoSairModoFoco } from '@/components/SairModoFoco'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { DescansoBar } from '@/components/DescansoBar'
import { mapearErroSupabase } from '@/lib/erros'
import {
  useAdicionarExercicioSessao,
  useAtualizarSessao,
  useRemoverExercicioSessao,
  useSalvarSerie,
  useSessao,
  useSessaoExercicios,
  useUltimosUsosExercicios,
  type SessaoExercicio,
  type SessaoSerie,
} from './api'
import { formatarUltimoUso } from './ultimoUso'
import { useFilaOffline } from './useFilaOffline'
import { DESCRITORES_NOTA, DESCRITORES_PSE } from './descritores'

const DESCANSO_PADRAO_SEGUNDOS = 60

function estaCompleto(item: SessaoExercicio): boolean {
  return item.sessao_series.length > 0 && item.sessao_series.every((s) => s.completed)
}

function formatarDuracao(segundos: number) {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function SerieRow({
  serie,
  salvando,
  pendente,
  onSalvar,
}: {
  serie: SessaoSerie
  salvando: boolean
  /** Marcada localmente mas ainda não confirmada pelo servidor (fila offline). */
  pendente: boolean
  onSalvar: (input: { reps: number | null; load_kg: number | null }) => void
}) {
  const [reps, setReps] = useState(serie.reps != null ? String(serie.reps) : '')
  const [load, setLoad] = useState(serie.load_kg != null ? String(serie.load_kg) : '')

  return (
    <div className="flex items-center gap-2">
      <span className="w-5 shrink-0 text-center text-sm text-slate-400">{serie.set_number}</span>
      <input
        type="number"
        inputMode="numeric"
        aria-label={`Repetições da série ${serie.set_number}`}
        placeholder="reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-center outline-none focus:border-brand"
      />
      <div className="relative w-full min-w-0">
        <input
          type="number"
          step="0.5"
          inputMode="decimal"
          aria-label={`Carga em kg da série ${serie.set_number}`}
          placeholder="0"
          value={load}
          onChange={(e) => setLoad(e.target.value)}
          className="min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 pr-8 text-center outline-none focus:border-brand"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">kg</span>
      </div>
      <button
        onClick={() => onSalvar({ reps: reps.trim() ? Number(reps) : null, load_kg: load.trim() ? Number(load) : null })}
        disabled={salvando}
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-50',
          pendente
            ? 'border-amber-400 bg-amber-50 text-amber-600'
            : serie.completed
              ? 'border-brand bg-brand text-white'
              : 'border-slate-300 bg-white text-slate-400',
        )}
        aria-label={pendente ? `Série ${serie.set_number} pendente de sincronizar` : `Salvar série ${serie.set_number}`}
      >
        {pendente ? <Clock size={18} /> : <Check size={18} />}
      </button>
    </div>
  )
}

function ExercicioBlock({
  item,
  sessionId,
  ultimoUso,
  estaPendente,
  enfileirarSerie,
  onPular,
  onSerieCompleta,
}: {
  item: SessaoExercicio
  sessionId: string
  ultimoUso: string | null
  estaPendente: (sessaoExercicioId: string, setNumber: number) => boolean
  enfileirarSerie: (item: { sessao_exercicio_id: string; set_number: number; reps: number | null; load_kg: number | null; completed: boolean }) => void
  onPular: (item: SessaoExercicio) => void
  onSerieCompleta: (restSeconds: number) => void
}) {
  const salvar = useSalvarSerie(sessionId)
  const [erroSerie, setErroSerie] = useState<number | null>(null)
  const [expandido, setExpandido] = useState(false)

  const salvarSerie = (setNumber: number, input: { reps: number | null; load_kg: number | null }) => {
    setErroSerie(null)
    const payload = { sessao_exercicio_id: item.id, set_number: setNumber, completed: true, ...input }
    const restSeconds = item.plano_exercicio?.rest_seconds ?? DESCANSO_PADRAO_SEGUNDOS

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enfileirarSerie(payload)
      onSerieCompleta(restSeconds)
      return
    }
    salvar.mutate(payload, {
      onSuccess: () => onSerieCompleta(restSeconds),
      onError: (e) => {
        const msg = (e as Error).message?.toLowerCase() ?? ''
        const pareceFalhaDeRede =
          msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed') || (typeof navigator !== 'undefined' && !navigator.onLine)
        if (pareceFalhaDeRede) {
          // Sinal ruim na academia é o caso comum aqui, não um erro "de verdade" —
          // enfileira e segue o treino sem travar o personal.
          enfileirarSerie(payload)
          onSerieCompleta(restSeconds)
        } else {
          setErroSerie(setNumber)
        }
      },
    })
  }

  const adicionarSerie = () => {
    const ultima = item.sessao_series[item.sessao_series.length - 1]
    salvar.mutate({
      sessao_exercicio_id: item.id,
      set_number: (ultima?.set_number ?? 0) + 1,
      reps: ultima?.reps ?? null,
      load_kg: ultima?.load_kg ?? null,
      completed: false,
    })
  }

  const completo =
    item.sessao_series.length > 0 && item.sessao_series.every((s) => s.completed || estaPendente(item.id, s.set_number))
  const ultimaSerie = item.sessao_series[item.sessao_series.length - 1]

  if (completo && !expandido) {
    return (
      <button
        onClick={() => setExpandido(true)}
        className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm active:bg-slate-50"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-500">{item.exercicio?.name ?? 'Exercício'}</p>
          <p className="flex items-center gap-1 text-sm text-emerald-700">
            <Check size={14} /> {item.sessao_series.length}/{item.sessao_series.length}
            {ultimaSerie?.reps != null && ` · ${ultimaSerie.reps}`}
            {ultimaSerie?.load_kg != null && ` × ${formatarNumero(ultimaSerie.load_kg)} kg`}
          </p>
        </div>
        <ChevronDown size={18} className="shrink-0 text-slate-400" />
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{item.exercicio?.name ?? 'Exercício'}</p>
            {completo && <Check size={16} className="shrink-0 text-emerald-600" />}
          </div>
          {item.exercicio?.muscle_group && <p className="text-sm text-slate-500">{item.exercicio.muscle_group}</p>}
          {ultimoUso && <p className="text-sm text-slate-400">{ultimoUso}</p>}
        </div>
        {completo ? (
          <button onClick={() => setExpandido(false)} className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-sm text-slate-500 active:bg-slate-100">
            Recolher
          </button>
        ) : (
          <button
            onClick={() => onPular(item)}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-sm text-slate-500 active:bg-slate-100"
          >
            <SkipForward size={16} /> Pular exercício
          </button>
        )}
      </div>

      <div className="space-y-2">
        {item.sessao_series.length > 0 && (
          <div className="flex items-center gap-2 px-0.5 text-xs font-medium text-slate-400">
            <span className="w-5 shrink-0 text-center">Série</span>
            <span className="w-full min-w-0 text-center">Reps</span>
            <span className="w-full min-w-0 text-center">Carga (kg)</span>
            <span className="size-11 shrink-0" />
          </div>
        )}
        {item.sessao_series.map((s) => (
          <div key={s.id}>
            <SerieRow
              serie={s}
              salvando={salvar.isPending && salvar.variables?.set_number === s.set_number}
              pendente={estaPendente(item.id, s.set_number)}
              onSalvar={(input) => salvarSerie(s.set_number, input)}
            />
            {erroSerie === s.set_number && (
              <p className="mt-1 flex items-center gap-2 text-xs text-red-600">
                <RotateCcw size={12} /> Falha ao salvar. Toque no check para tentar de novo.
              </p>
            )}
          </div>
        ))}
      </div>

      <button onClick={adicionarSerie} className="flex min-h-11 items-center gap-1 text-sm font-medium text-brand-dark">
        <Plus size={16} /> Adicionar série
      </button>
    </div>
  )
}

function Execucao({ sessionId, alunoId }: { sessionId: string; alunoId: string }) {
  const navigate = useNavigate()
  const { data: aluno } = useAluno(alunoId)
  const { data: sessao } = useSessao(sessionId)
  const { data: itens, isLoading } = useSessaoExercicios(sessionId)
  const { data: ultimosUsos } = useUltimosUsosExercicios(alunoId)
  const { data: exercicios } = useExercicios()
  const adicionarExercicio = useAdicionarExercicioSessao(sessionId)
  const removerExercicio = useRemoverExercicioSessao(sessionId)
  const fila = useFilaOffline(sessionId)
  const [avisoFilaAberto, setAvisoFilaAberto] = useState(false)

  const [segundos, setSegundos] = useState(0)
  useEffect(() => {
    if (!sessao) return
    const inicio = new Date(sessao.created_at).getTime()
    const tick = () => setSegundos(Math.max(0, Math.floor((Date.now() - inicio) / 1000)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [sessao])

  // Barra de descanso: dispara ao marcar uma série, conta pra baixo até 0 e vibra.
  const [descanso, setDescanso] = useState<{ segundos: number } | null>(null)
  useEffect(() => {
    if (descanso === null) return
    if (descanso.segundos <= 0) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
      setDescanso(null)
      return
    }
    const t = setTimeout(() => setDescanso((d) => (d ? { segundos: d.segundos - 1 } : null)), 1000)
    return () => clearTimeout(t)
  }, [descanso])

  const iniciarDescanso = (restSeconds: number) => setDescanso({ segundos: restSeconds })

  // Rola o próximo exercício pendente pra vista assim que um exercício vira "completo".
  const feitosAnterioresRef = useRef<Set<string>>(new Set())
  const refsPorItem = useRef<Record<string, HTMLDivElement | null>>({})
  useEffect(() => {
    if (!itens) return
    const feitosAtuais = new Set(itens.filter(estaCompleto).map((i) => i.id))
    const ficouCompleto = [...feitosAtuais].some((id) => !feitosAnterioresRef.current.has(id))
    if (ficouCompleto) {
      const proximoPendente = itens.find((i) => !feitosAtuais.has(i.id))
      if (proximoPendente) {
        refsPorItem.current[proximoPendente.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    feitosAnterioresRef.current = feitosAtuais
  }, [itens])

  const [adicionando, setAdicionando] = useState(false)
  const [busca, setBusca] = useState('')

  const exerciciosFiltrados = exercicios?.filter((e) => !busca.trim() || e.name.toLowerCase().includes(busca.trim().toLowerCase()))

  const escolherExercicio = (ex: Exercicio) => {
    adicionarExercicio.mutate({ exercicio_id: ex.id, order_index: itens?.length ?? 0 }, { onSuccess: () => setAdicionando(false) })
    setAdicionando(false)
    setBusca('')
  }

  const pular = async (item: SessaoExercicio) => {
    const ok = await confirmarAcao({
      titulo: 'Pular exercício',
      mensagem: `Pular ${item.exercicio?.name}? Ele será removido desta sessão.`,
      textoConfirmar: 'Pular',
      destrutivo: true,
    })
    if (!ok) return
    removerExercicio.mutate(item.id)
  }

  const clicarFinalizar = () => {
    if (fila.fila.length > 0) {
      setAvisoFilaAberto(true)
      return
    }
    navigate(`/alunos/${alunoId}/sessoes/${sessionId}/finalizar`)
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <span className="text-sm text-slate-500">Tempo de treino</span>
        <span className="font-mono text-xl font-semibold">{formatarDuracao(segundos)}</span>
      </div>

      {aluno && avisoSaude(aluno) && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <span>{avisoSaude(aluno)}</span>
        </div>
      )}

      {isLoading && <p className="text-slate-500">Carregando…</p>}

      {itens?.map((item) => (
        <div key={item.id} ref={(el) => { refsPorItem.current[item.id] = el }}>
          <ExercicioBlock
            item={item}
            sessionId={sessionId}
            ultimoUso={formatarUltimoUso(ultimosUsos?.get(item.exercicio_id))}
            estaPendente={fila.estaPendente}
            enfileirarSerie={fila.enfileirarSerie}
            onPular={pular}
            onSerieCompleta={iniciarDescanso}
          />
        </div>
      ))}

      <Button variant="ghost" className="w-full border border-dashed border-slate-300" onClick={() => setAdicionando(true)}>
        <Plus size={18} /> Adicionar exercício
      </Button>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="mx-auto max-w-2xl space-y-3">
          {descanso && (
            <DescansoBar
              segundosRestantes={descanso.segundos}
              onMenos15={() => setDescanso((d) => (d ? { segundos: Math.max(0, d.segundos - 15) } : d))}
              onMais15={() => setDescanso((d) => (d ? { segundos: d.segundos + 15 } : d))}
              onPular={() => setDescanso(null)}
            />
          )}
          {fila.fila.length > 0 && (
            <button
              onClick={() => setAvisoFilaAberto(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
            >
              <Clock size={16} />
              {fila.fila.length} {fila.fila.length === 1 ? 'série ainda não sincronizada' : 'séries ainda não sincronizadas'}
            </button>
          )}
          <Button className="w-full" onClick={clicarFinalizar}>
            Finalizar treino
          </Button>
        </div>
      </div>

      <BottomSheet open={avisoFilaAberto} onClose={() => setAvisoFilaAberto(false)} title="Séries pendentes">
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              {fila.fila.length} {fila.fila.length === 1 ? 'série ainda não foi sincronizada' : 'séries ainda não foram sincronizadas'} — provavelmente por
              falta de sinal. Elas ficam guardadas neste aparelho e não se perdem, mas é melhor esperar sincronizar antes de finalizar.
            </span>
          </div>
          <Button onClick={() => fila.sincronizar()} className="w-full" disabled={fila.sincronizando}>
            {fila.sincronizando ? 'Sincronizando…' : 'Tentar agora'}
          </Button>
          <Button variant="ghost" onClick={() => setAvisoFilaAberto(false)} className="w-full">
            Continuar treinando
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={adicionando} onClose={() => setAdicionando(false)} title="Adicionar exercício">
        <div className="space-y-3">
          <Field label="Buscar">
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
          </Field>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {exerciciosFiltrados?.map((ex) => (
              <li key={ex.id}>
                <button onClick={() => escolherExercicio(ex)} className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100">
                  <p className="font-medium">{ex.name}</p>
                  <p className="text-sm text-slate-500">{ex.muscle_group ?? '—'}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </BottomSheet>
    </div>
  )
}

function DetalheSessao({ sessionId, alunoId }: { sessionId: string; alunoId: string }) {
  const { data: sessao } = useSessao(sessionId)
  const { data: itens } = useSessaoExercicios(sessionId)
  const atualizar = useAtualizarSessao(sessionId, alunoId)

  const [editando, setEditando] = useState(false)
  const [pse, setPse] = useState<number | null>(sessao?.post_pse ?? null)
  const [duracao, setDuracao] = useState(sessao?.duration_minutes != null ? String(sessao.duration_minutes) : '')
  const [nota, setNota] = useState<number | null>(sessao?.prof_rating ?? null)
  const [observacao, setObservacao] = useState(sessao?.prof_notes ?? '')
  const [erro, setErro] = useState<string | null>(null)

  if (!sessao) return null

  const cargaInterna = sessao.post_pse != null && sessao.duration_minutes != null ? sessao.post_pse * sessao.duration_minutes : null

  const abrirEdicao = () => {
    setPse(sessao.post_pse)
    setDuracao(sessao.duration_minutes != null ? String(sessao.duration_minutes) : '')
    setNota(sessao.prof_rating)
    setObservacao(sessao.prof_notes ?? '')
    setErro(null)
    setEditando(true)
  }

  const salvar = () => {
    atualizar.mutate(
      {
        post_pse: pse,
        duration_minutes: duracao.trim() ? Number(duracao) : null,
        prof_rating: nota,
        prof_notes: observacao.trim() || null,
      },
      { onSuccess: () => setEditando(false), onError: (e) => setErro((e as Error).message) },
    )
  }

  const cancelarSessao = async () => {
    const ok = await confirmarAcao({ titulo: 'Cancelar sessão', mensagem: 'Cancelar esta sessão?', textoConfirmar: 'Cancelar sessão', destrutivo: true })
    if (!ok) return
    atualizar.mutate({ status: 'cancelada' })
  }

  return (
    <div className="space-y-4">
      {sessao.status === 'cancelada' && (
        <div className="rounded-xl bg-slate-100 p-3 text-center text-sm font-medium text-slate-500">Sessão cancelada</div>
      )}

      <div className="flex items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <p className="font-semibold">{sessao.plano_nome ?? 'Treino livre'}</p>
        {sessao.plano_nome != null && sessao.plano_id == null && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">plano excluído</span>
        )}
      </div>

      <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Pré-treino</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500">Sono</dt>
          <dd>{sessao.pre_sleep ?? '—'}</dd>
          <dt className="text-slate-500">Estresse</dt>
          <dd>{sessao.pre_stress ?? '—'}</dd>
          <dt className="text-slate-500">Fadiga</dt>
          <dd>{sessao.pre_fatigue ?? '—'}</dd>
          <dt className="text-slate-500">Dor muscular</dt>
          <dd>{sessao.pre_muscle_pain ?? '—'}</dd>
        </dl>
      </div>

      {itens?.map((item) => (
        <div key={item.id} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-semibold">{item.exercicio?.name}</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {item.sessao_series.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>Série {s.set_number}</span>
                <span>
                  {s.reps ?? '—'} reps · {s.load_kg ?? '—'} kg
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Pós-treino e avaliação</h2>
          {!editando && (
            <Button variant="ghost" onClick={abrirEdicao}>
              Editar
            </Button>
          )}
        </div>

        {!editando ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">PSE</dt>
            <dd>{sessao.post_pse ?? '—'}</dd>
            <dt className="text-slate-500">Duração</dt>
            <dd>{sessao.duration_minutes != null ? `${sessao.duration_minutes} min` : '—'}</dd>
            <dt className="text-slate-500">Carga interna</dt>
            <dd>{cargaInterna != null ? `${cargaInterna} UA` : '—'}</dd>
            <dt className="text-slate-500">Nota do professor</dt>
            <dd>{sessao.prof_rating ?? '—'}</dd>
            <dt className="col-span-2 text-slate-500">Observação</dt>
            <dd className="col-span-2">{sessao.prof_notes ?? '—'}</dd>
          </dl>
        ) : (
          <div className="space-y-4">
            <ScaleQuestion titulo="PSE" descritores={DESCRITORES_PSE} polaridade="negativa" value={pse} onChange={setPse} />
            <Field label="Duração (minutos)">
              <Input type="number" inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
            </Field>
            <ScaleQuestion titulo="Avaliação do professor" descritores={DESCRITORES_NOTA} polaridade="positiva" value={nota} onChange={setNota} />
            <Field label="Observação">
              <textarea
                className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </Field>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <div className="flex gap-2">
              <Button onClick={salvar} className="flex-1" disabled={atualizar.isPending}>
                Salvar
              </Button>
              <Button variant="ghost" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      {sessao.status === 'concluida' && (
        <Button variant="ghost" className="w-full text-red-600" onClick={cancelarSessao}>
          Cancelar sessão
        </Button>
      )}
    </div>
  )
}

export function SessaoPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>()
  const { data: sessao, isLoading, error } = useSessao(sessionId)

  const titulo = useMemo(() => {
    if (!sessao) return 'Treino'
    if (sessao.status === 'em_andamento') return 'Treino em andamento'
    if (sessao.status === 'cancelada') return 'Treino cancelado'
    return 'Treino concluído'
  }, [sessao])

  if (!id || !sessionId) return <Navigate to="/" replace />
  if (isLoading) return <p className="p-4 text-slate-500">Carregando…</p>
  if (error) return <p className="p-4 text-red-600">{mapearErroSupabase(error)}</p>
  if (!sessao) return <p className="p-4 text-slate-500">Sessão não encontrada.</p>

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        {sessao.status === 'em_andamento' ? (
          <BotaoSairModoFoco to={`/alunos/${id}`} />
        ) : (
          <Link to={`/alunos/${id}`} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
        )}
        <h1 className="text-xl font-bold">{titulo}</h1>
      </header>

      {sessao.status === 'em_andamento' ? <Execucao sessionId={sessionId} alunoId={id} /> : <DetalheSessao sessionId={sessionId} alunoId={id} />}
    </div>
  )
}
