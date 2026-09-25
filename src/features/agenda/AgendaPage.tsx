import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  dataSP,
  formatarDataCompleta,
  formatarDataCurta,
  formatarHoraInicioFim,
  hojeSP,
  inicioDaSemanaSP,
  limitesDaSemanaSP,
  nomeDiaCurto,
  somarDias,
} from '@/lib/datas'
import { AulaAcoesSheet } from './AulaAcoesSheet'
import { AulaCard } from './AulaCard'
import { NovaAulaAvulsaSheet } from './NovaAulaAvulsaSheet'
import { useAulasDoDia, useAulasNoIntervalo, useGerarAulasDiarias, type Aula } from './api'

type Modo = 'dia' | 'semana'

function VisaoDia({ dataISO, onAbrirAula }: { dataISO: string; onAbrirAula: (a: Aula) => void }) {
  const { data: aulas, isLoading } = useAulasDoDia(dataISO)

  return (
    <div className="space-y-2">
      {isLoading && <p className="text-slate-500">Carregando…</p>}
      {aulas?.length === 0 && <p className="text-sm text-slate-500">Nenhuma aula neste dia.</p>}
      {aulas?.map((a) => (
        <AulaCard key={a.id} aula={a} onClick={() => onAbrirAula(a)} />
      ))}
    </div>
  )
}

function VisaoSemana({ inicioSemana, onAbrirAula }: { inicioSemana: string; onAbrirAula: (a: Aula) => void }) {
  const { inicio, fim } = limitesDaSemanaSP(inicioSemana)
  const { data: aulas, isLoading } = useAulasNoIntervalo(inicio, fim)

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i)), [inicioSemana])

  const porDia = useMemo(() => {
    const map = new Map<string, Aula[]>()
    for (const d of dias) map.set(d, [])
    for (const a of aulas ?? []) {
      const d = dataSP(a.starts_at)
      map.get(d)?.push(a)
    }
    return map
  }, [aulas, dias])

  if (isLoading) return <p className="text-slate-500">Carregando…</p>

  return (
    <>
      {/* Celular: lista agrupada por dia */}
      <div className="space-y-4 md:hidden">
        {dias.map((d) => {
          const doDia = porDia.get(d) ?? []
          return (
            <div key={d}>
              <p className="mb-2 text-sm font-semibold text-slate-500">
                {nomeDiaCurto(d)}, {formatarDataCurta(d)} · {doDia.length} {doDia.length === 1 ? 'aula' : 'aulas'}
              </p>
              {doDia.length === 0 ? (
                <p className="text-sm text-slate-400">—</p>
              ) : (
                <div className="space-y-2">
                  {doDia.map((a) => (
                    <AulaCard key={a.id} aula={a} onClick={() => onAbrirAula(a)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tablet: grade de 7 colunas */}
      <div className="hidden gap-2 md:grid md:grid-cols-7">
        {dias.map((d) => {
          const doDia = porDia.get(d) ?? []
          return (
            <div key={d} className="space-y-2">
              <p className="text-center text-xs font-semibold text-slate-500">
                {nomeDiaCurto(d)}
                <br />
                {formatarDataCurta(d)}
              </p>
              <div className="space-y-1.5">
                {doDia.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onAbrirAula(a)}
                    className={cn(
                      'w-full rounded-xl p-2 text-left text-xs shadow-sm active:bg-slate-50',
                      a.status === 'cancelada' ? 'bg-slate-100 opacity-60' : 'bg-white',
                    )}
                  >
                    <p className="font-semibold">{formatarHoraInicioFim(a.starts_at, a.duration_min)}</p>
                    <p className="truncate text-slate-500">
                      {a.aula_participantes.map((p) => p.aluno?.name).filter(Boolean).join(', ') || 'Sem participantes'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function AgendaPage() {
  useGerarAulasDiarias()
  const [modo, setModo] = useState<Modo>('dia')
  const [dataAtual, setDataAtual] = useState(hojeSP())
  const [aulaAberta, setAulaAberta] = useState<Aula | null>(null)
  const [novaAulaAberta, setNovaAulaAberta] = useState(false)

  const inicioSemana = inicioDaSemanaSP(dataAtual)

  const irParaHoje = () => setDataAtual(hojeSP())
  const navegar = (direcao: 1 | -1) => setDataAtual((d) => somarDias(d, direcao * (modo === 'dia' ? 1 : 7)))

  return (
    <div className="mx-auto max-w-2xl p-4 md:max-w-4xl">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Button onClick={() => setNovaAulaAberta(true)} className="px-3">
          <Plus size={20} />
        </Button>
      </header>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(['dia', 'semana'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={cn(
                'min-h-9 rounded-lg px-3 text-sm font-medium capitalize transition',
                modo === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navegar(-1)} className="flex size-9 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Anterior">
            <ChevronLeft size={18} />
          </button>
          <button onClick={irParaHoje} className="min-h-9 rounded-xl px-3 text-sm font-medium text-brand-dark active:bg-slate-100">
            Hoje
          </button>
          <button onClick={() => navegar(1)} className="flex size-9 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Próximo">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {modo === 'dia' && <p className="mb-3 font-semibold">{formatarDataCompleta(dataAtual)}</p>}

      {modo === 'dia' ? (
        <VisaoDia dataISO={dataAtual} onAbrirAula={setAulaAberta} />
      ) : (
        <VisaoSemana inicioSemana={inicioSemana} onAbrirAula={setAulaAberta} />
      )}

      <AulaAcoesSheet aula={aulaAberta} onClose={() => setAulaAberta(null)} />
      <NovaAulaAvulsaSheet open={novaAulaAberta} onClose={() => setNovaAulaAberta(false)} dataInicial={dataAtual} />
    </div>
  )
}
