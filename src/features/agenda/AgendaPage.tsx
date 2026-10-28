import { useMemo, useState } from 'react'
import { ListaSkeleton } from '@/components/Skeleton'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { EstadoVazio } from '@/components/EstadoVazio'
import { useAlunos } from '@/features/alunos/api'
import { ROTA_IMPORTAR } from '@/features/alunos/importar/via'
import { Fab } from '@/components/ui'
import { LinkConfiguracoes } from '@/components/LinkConfiguracoes'
import { PuxarParaAtualizar } from '@/components/PuxarParaAtualizar'
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
  rotuloDiaAgenda,
  rotuloSemanaAgenda,
  somarDias,
} from '@/lib/datas'
import { AulaAcoesSheet } from './AulaAcoesSheet'
import { AulaCard } from './AulaCard'
import { NovaAulaAvulsaSheet } from './NovaAulaAvulsaSheet'
import { useAulasDoDia, useAulasNoIntervalo, useGerarAulasDiarias, type Aula } from './api'

type Modo = 'dia' | 'semana'

function VisaoDia({ dataISO, onAbrirAula, onMarcarAula }: { dataISO: string; onAbrirAula: (a: Aula) => void; onMarcarAula: () => void }) {
  const { data: aulas, isLoading } = useAulasDoDia(dataISO)
  const { data: alunos } = useAlunos()
  const semAlunos = alunos?.length === 0

  return (
    <div className="space-y-2">
      {isLoading && <ListaSkeleton />}
      {aulas?.length === 0 && semAlunos && (
        <EstadoVazio
          icone={<CalendarPlus size={24} />}
          titulo="Sua agenda começa aqui"
          texto="Cadastre um aluno e marque sua primeira aula. Você poderá organizar seus horários por dia ou semana."
          acao={{ rotulo: 'Adicionar meus alunos', to: ROTA_IMPORTAR }}
        />
      )}
      {aulas?.length === 0 && !semAlunos && (
        <EstadoVazio icone={<CalendarPlus size={24} />} titulo="Nenhuma aula neste dia" acao={{ rotulo: 'Marcar aula', onClick: onMarcarAula }} />
      )}
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

  if (isLoading) return <ListaSkeleton />

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
                <p className="text-sm text-slate-500">—</p>
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
                  <button type="button"
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
  const qc = useQueryClient()
  const [modo, setModo] = useState<Modo>('dia')
  const [dataAtual, setDataAtual] = useState(hojeSP())
  const [aulaAberta, setAulaAberta] = useState<Aula | null>(null)
  const [novaAulaAberta, setNovaAulaAberta] = useState(false)

  const inicioSemana = inicioDaSemanaSP(dataAtual)

  const irParaHoje = () => setDataAtual(hojeSP())
  const hoje = hojeSP()
  const ehHoje = modo === 'dia' ? dataAtual === hoje : inicioSemana === inicioDaSemanaSP(hoje)
  const rotulo = modo === 'dia' ? rotuloDiaAgenda(dataAtual, hoje) : rotuloSemanaAgenda(inicioSemana, hoje)
  const navegar = (direcao: 1 | -1) => setDataAtual((d) => somarDias(d, direcao * (modo === 'dia' ? 1 : 7)))

  return (
    <PuxarParaAtualizar onAtualizar={() => qc.invalidateQueries()}>
    <div className="mx-auto max-w-2xl p-4 pb-24 md:max-w-4xl">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <LinkConfiguracoes />
      </header>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(['dia', 'semana'] as const).map((m) => (
            <button type="button"
              key={m}
              onClick={() => setModo(m)}
              className={cn(
                'min-h-11 rounded-lg px-4 text-sm font-medium capitalize transition',
                modo === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => navegar(-1)} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Anterior">
            <ChevronLeft size={18} />
          </button>
          <button type="button"
            onClick={irParaHoje}
            aria-label={ehHoje ? 'Hoje' : `${rotulo} — voltar para hoje`}
            className="min-h-11 min-w-24 whitespace-nowrap rounded-xl px-2 text-sm font-medium text-brand-hover active:bg-slate-100"
          >
            {rotulo}
          </button>
          <button type="button" onClick={() => navegar(1)} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Próximo">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {modo === 'dia' && <p className="mb-3 font-semibold">{formatarDataCompleta(dataAtual)}</p>}

      {modo === 'dia' ? (
        <VisaoDia dataISO={dataAtual} onAbrirAula={setAulaAberta} onMarcarAula={() => setNovaAulaAberta(true)} />
      ) : (
        <VisaoSemana inicioSemana={inicioSemana} onAbrirAula={setAulaAberta} />
      )}

      <Fab onClick={() => setNovaAulaAberta(true)} label="Nova aula" />
      <AulaAcoesSheet aula={aulaAberta} onClose={() => setAulaAberta(null)} />
      <NovaAulaAvulsaSheet open={novaAulaAberta} onClose={() => setNovaAulaAberta(false)} dataInicial={dataAtual} />
    </div>
    </PuxarParaAtualizar>
  )
}