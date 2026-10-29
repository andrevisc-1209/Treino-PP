import { ErroComRetry } from '@/components/ErroComRetry'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ListaSkeleton } from '@/components/Skeleton'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, ChevronLeft, ChevronRight, TriangleAlert, Users } from 'lucide-react'
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
import { agruparPorHorario, conflitosDeAluno, criarAbreviador } from './leituraDaAgenda'
import { direcaoDoDeslize, montarFaixa, rotuloAcessivelDoDia } from './faixaDeDias'
import { AulaCard } from './AulaCard'
import { decidirComecar } from './comecarAula'
import { NovaAulaAvulsaSheet } from './NovaAulaAvulsaSheet'
import { useAulasDoDia, useAulasNoIntervalo, useGerarAulasDiarias, type Aula } from './api'

type Modo = 'dia' | 'semana'

function VisaoDia({ dataISO, onAbrirAula, onComecar, onMarcarAula }: { dataISO: string; onAbrirAula: (a: Aula) => void; onComecar: (a: Aula) => void; onMarcarAula: () => void }) {
  const { data: aulas, isLoading, error, refetch } = useAulasDoDia(dataISO)
  const { data: alunos } = useAlunos()
  const semAlunos = alunos?.length === 0
  const gruposDoDia = useMemo(() => agruparPorHorario(aulas ?? []), [aulas])
  const conflitos = useMemo(() => conflitosDeAluno(aulas ?? []), [aulas])

  return (
    <div className="space-y-2">
      {isLoading && <ListaSkeleton />}
      {error && <ErroComRetry erro={error} onTentar={() => refetch()} />}
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
      {gruposDoDia.map((g) => (
        <div key={g.starts_at} className="space-y-2">
          {g.aulas.length > 1 && (
            <p className="flex items-center gap-1.5 pt-1 text-sm font-semibold text-slate-600">
              <Users size={14} aria-hidden /> {g.aulas.length} aulas neste horário
            </p>
          )}
          {g.aulas.map((a) => (
            <AulaCard key={a.id} aula={a} localResumido conflito={conflitos.get(a.id)} onClick={() => onAbrirAula(a)} onComecar={() => onComecar(a)} />
          ))}
        </div>
      ))}
    </div>
  )
}

function VisaoSemana({ inicioSemana, onAbrirAula, onAbrirDia }: { inicioSemana: string; onAbrirAula: (a: Aula) => void; onAbrirDia: (dataISO: string) => void }) {
  const { inicio, fim } = limitesDaSemanaSP(inicioSemana)
  const { data: aulas, isLoading, error, refetch } = useAulasNoIntervalo(inicio, fim)

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

  const abreviar = useMemo(() => criarAbreviador((aulas ?? []).flatMap((a) => a.aula_participantes.map((p) => p.aluno?.name ?? ''))), [aulas])
  const conflitos = useMemo(() => conflitosDeAluno(aulas ?? []), [aulas])

  if (isLoading) return <ListaSkeleton />
  if (error) return <ErroComRetry erro={error} onTentar={() => refetch()} />

  return (
    <>
      {/* Celular: lista agrupada por dia */}
      <div className="space-y-4 md:hidden">
        {dias.map((d) => {
          const doDia = porDia.get(d) ?? []
          return (
            <div key={d}>
              <button
                type="button"
                onClick={() => onAbrirDia(d)}
                aria-label={`Abrir o dia ${formatarDataCompleta(d)}`}
                className="mb-1 flex min-h-11 w-full items-center justify-between rounded-xl text-sm font-semibold text-slate-600 active:bg-slate-100"
              >
                <span>
                  {nomeDiaCurto(d)}, {formatarDataCurta(d)} · {doDia.length} {doDia.length === 1 ? 'aula' : 'aulas'}
                </span>
                <ChevronRight size={16} className="text-slate-400" aria-hidden />
              </button>
              {doDia.length === 0 ? (
                <p className="text-sm text-slate-500">—</p>
              ) : (
                <div className="space-y-2">
                  {doDia.map((a) => (
                    <AulaCard key={a.id} aula={a} localResumido conflito={conflitos.get(a.id)} onClick={() => onAbrirAula(a)} />
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
              <button
                type="button"
                onClick={() => onAbrirDia(d)}
                aria-label={`Abrir o dia ${formatarDataCompleta(d)}`}
                className="min-h-11 w-full rounded-xl text-center text-xs font-semibold text-slate-500 active:bg-slate-100"
              >
                {nomeDiaCurto(d)}
                <br />
                {formatarDataCurta(d)}
              </button>
              <div className="space-y-1.5">
                {doDia.map((a) => (
                  <button type="button"
                    key={a.id}
                    onClick={() => onAbrirAula(a)}
                    aria-label={`${formatarHoraInicioFim(a.starts_at, a.duration_min)}, ${a.aula_participantes.map((p) => p.aluno?.name).filter(Boolean).join(', ') || 'sem participantes'}`}
                    className={cn(
                      'w-full rounded-xl p-2 text-left text-xs shadow-sm active:bg-slate-50',
                      a.status === 'cancelada' ? 'bg-slate-100 opacity-60' : 'bg-white',
                    )}
                  >
                    <p className="font-semibold">{formatarHoraInicioFim(a.starts_at, a.duration_min)}</p>
                    <p className="line-clamp-2 text-slate-600">
                      {a.aula_participantes.map((p) => (p.aluno?.name ? abreviar(p.aluno.name) : '')).filter(Boolean).join(', ') || 'Sem participantes'}
                    </p>
                    {conflitos.has(a.id) && (
                      <p className="mt-0.5 flex items-center gap-1 font-medium text-amber-900">
                        <TriangleAlert size={12} aria-hidden /> Conflito
                      </p>
                    )}
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

/** Faixa dos 7 dias da semana (visão Dia): toque escolhe o dia; arrastar para o lado troca de semana; ponto = tem aula. */
function FaixaDeDias({ dataAtual, onEscolher, onSemana }: { dataAtual: string; onEscolher: (iso: string) => void; onSemana: (direcao: 1 | -1) => void }) {
  const hoje = hojeSP()
  const inicioSemana = inicioDaSemanaSP(dataAtual)
  const { inicio, fim } = limitesDaSemanaSP(inicioSemana)
  const { data: aulas } = useAulasNoIntervalo(inicio, fim)
  const [toqueX, setToqueX] = useState<number | null>(null)

  const contagem = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of aulas ?? []) {
      if (a.status === 'cancelada') continue
      const d = dataSP(a.starts_at)
      m.set(d, (m.get(d) ?? 0) + 1)
    }
    return m
  }, [aulas])
  const dias = montarFaixa(inicioSemana, hoje, dataAtual, contagem)

  return (
    <div
      className="mb-3 grid grid-cols-7 gap-1"
      role="group"
      aria-label="Dias da semana"
      onTouchStart={(e) => setToqueX(e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (toqueX === null) return
        const dir = direcaoDoDeslize((e.changedTouches[0]?.clientX ?? toqueX) - toqueX)
        setToqueX(null)
        if (dir !== 0) onSemana(dir)
      }}
    >
      {dias.map((d) => (
        <button
          key={d.iso}
          type="button"
          onClick={() => onEscolher(d.iso)}
          aria-pressed={d.selecionado}
          aria-current={d.hoje ? 'date' : undefined}
          aria-label={rotuloAcessivelDoDia(d, formatarDataCompleta(d.iso))}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center rounded-xl border text-xs font-medium transition',
            d.selecionado ? 'border-brand bg-brand text-white' : d.hoje ? 'border-brand bg-white text-brand-hover' : 'border-slate-200 bg-white text-slate-700',
          )}
        >
          <span>{d.sigla}</span>
          <span className="text-base font-semibold leading-tight">{d.numero}</span>
          <span className={cn('mt-0.5 size-1.5 rounded-full', d.aulas > 0 ? (d.selecionado ? 'bg-white' : 'bg-brand') : 'bg-transparent')} aria-hidden />
        </button>
      ))}
    </div>
  )
}

export function AgendaPage() {
  useGerarAulasDiarias()
  const qc = useQueryClient()
  const [modo, setModo] = useState<Modo>('dia')
  const [dataAtual, setDataAtual] = useState(hojeSP())
  const [aulaAberta, setAulaAberta] = useState<Aula | null>(null)
  const [novaAulaAberta, setNovaAulaAberta] = useState(false)
  const [passoInicial, setPassoInicial] = useState<'menu' | 'iniciar'>('menu')
  const navigate = useNavigate()

  const abrirMenu = (a: Aula) => {
    setPassoInicial('menu')
    setAulaAberta(a)
  }
  const comecar = (a: Aula) => {
    const decisao = decidirComecar(a)
    if (decisao.tipo === 'navegar') navigate(decisao.to)
    else if (decisao.tipo === 'escolher') {
      setPassoInicial('iniciar')
      setAulaAberta(a)
    } else abrirMenu(a)
  }

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
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <Link to="/agenda/disponibilidade" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-hover underline">
            Minha disponibilidade
          </Link>
        </div>
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

      {modo === 'dia' && <FaixaDeDias dataAtual={dataAtual} onEscolher={setDataAtual} onSemana={(dir) => setDataAtual((d) => somarDias(d, dir * 7))} />}

      {modo === 'dia' && <p className="mb-3 font-semibold">{formatarDataCompleta(dataAtual)}</p>}

      {modo === 'dia' ? (
        <VisaoDia dataISO={dataAtual} onAbrirAula={abrirMenu} onComecar={comecar} onMarcarAula={() => setNovaAulaAberta(true)} />
      ) : (
        <VisaoSemana
          inicioSemana={inicioSemana}
          onAbrirAula={abrirMenu}
          onAbrirDia={(d) => {
            setDataAtual(d)
            setModo('dia')
          }}
        />
      )}

      <Fab onClick={() => setNovaAulaAberta(true)} label="Nova aula" />
      <AulaAcoesSheet aula={aulaAberta} onClose={() => setAulaAberta(null)} passoInicial={passoInicial} />
      <NovaAulaAvulsaSheet open={novaAulaAberta} onClose={() => setNovaAulaAberta(false)} dataInicial={dataAtual} />
    </div>
    </PuxarParaAtualizar>
  )
}