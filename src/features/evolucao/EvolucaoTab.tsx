import { useMemo, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { usePesos } from '@/features/alunos/api'
import { cn } from '@/lib/utils'
import { useSessoesDetalhadas } from './api'
import {
  bemEstar,
  cargaInterna,
  cargaPorSemana,
  evolucaoExercicio,
  exerciciosExecutados,
  filtrarPorPeriodo,
  formatarDataCurta,
  formatarNumero,
  pseMedia,
  tendenciaCargaSemanal,
  variacaoPeso,
  type Periodo,
} from './calc'

const COR = {
  bemEstar: '#2a78d6',
  sono: '#2a78d6',
  estresseInv: '#eb6834',
  fadigaInv: '#1baf7a',
  dorInv: '#eda100',
  cargaInterna: '#008300',
  maiorCarga: '#4a3aa7',
  rm1: '#e34948',
  volume: '#1baf7a',
  peso: '#e87ba4',
}

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'tudo', label: 'Tudo' },
]

function EixoData({ dataKey }: { dataKey: string }) {
  return (
    <XAxis
      dataKey={dataKey}
      tickFormatter={formatarDataCurta}
      tickLine={false}
      axisLine={false}
      tick={{ fontSize: 11, fill: '#64748b' }}
      minTickGap={24}
    />
  )
}

function EixoValor() {
  return <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={32} />
}

function GradeLeve() {
  return <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
}

function tooltipFormatter(nomes: Record<string, string>) {
  return (valor: unknown, nome: unknown) => [
    typeof valor === 'number' ? formatarNumero(valor) : String(valor ?? ''),
    nomes[String(nome)] ?? String(nome),
  ]
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>
}

function CardResumo({ label, valor, sub }: { label: string; valor: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold">{valor}</p>
      {sub}
    </div>
  )
}

export function EvolucaoTab({ alunoId }: { alunoId: string }) {
  const { data: sessoesTodas, isLoading } = useSessoesDetalhadas(alunoId)
  const { data: pesosTodos } = usePesos(alunoId)
  const [periodo, setPeriodo] = useState<Periodo>('30')
  const [bemEstarDetalhado, setBemEstarDetalhado] = useState(false)
  const [exercicioId, setExercicioId] = useState<string | null>(null)

  const sessoes = useMemo(() => filtrarPorPeriodo(sessoesTodas ?? [], periodo, (s) => s.session_date), [sessoesTodas, periodo])
  const pesos = useMemo(() => filtrarPorPeriodo(pesosTodos ?? [], periodo, (p) => p.measured_at), [pesosTodos, periodo])

  const dadosBemEstar = useMemo(
    () =>
      sessoes
        .map((s) => ({
          session_date: s.session_date,
          bemEstar: bemEstar(s),
          sono: s.pre_sleep,
          estresseInv: s.pre_stress != null ? 10 - s.pre_stress : null,
          fadigaInv: s.pre_fatigue != null ? 10 - s.pre_fatigue : null,
          dorInv: s.pre_muscle_pain != null ? 10 - s.pre_muscle_pain : null,
        }))
        .filter((d) => d.bemEstar != null),
    [sessoes],
  )

  const dadosCargaSessao = useMemo(
    () =>
      sessoes
        .map((s) => ({ session_date: s.session_date, cargaInterna: cargaInterna(s) }))
        .filter((d): d is { session_date: string; cargaInterna: number } => d.cargaInterna != null),
    [sessoes],
  )
  const dadosCargaSemana = useMemo(() => cargaPorSemana(sessoes), [sessoes])

  const exercicios = useMemo(() => exerciciosExecutados(sessoesTodas ?? []), [sessoesTodas])
  const dadosExercicio = useMemo(
    () => (exercicioId ? evolucaoExercicio(sessoes, exercicioId) : []),
    [sessoes, exercicioId],
  )

  const dadosPeso = useMemo(
    () => [...pesos].sort((a, b) => a.measured_at.localeCompare(b.measured_at)).map((p) => ({ data: p.measured_at, peso: p.weight_kg })),
    [pesos],
  )

  const { atual, mediaAnterior } = useMemo(() => tendenciaCargaSemanal(sessoesTodas ?? []), [sessoesTodas])
  const tendenciaSubindo = atual > mediaAnterior
  const pse = pseMedia(sessoes)
  const deltaPeso = variacaoPeso(pesos)

  if (isLoading) return <p className="text-slate-500">Carregando…</p>

  if ((sessoesTodas?.length ?? 0) === 0 && (pesosTodos?.length ?? 0) === 0) {
    return <EmptyMsg>Registre 2 treinos para ver a evolução.</EmptyMsg>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={cn(
              'min-h-9 flex-1 rounded-lg text-sm font-medium transition',
              periodo === p.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CardResumo label="Treinos no período" valor={String(sessoes.length)} />
        <CardResumo label="PSE médio" valor={pse != null ? formatarNumero(pse) : '—'} />
        <CardResumo
          label="Carga interna (7 dias)"
          valor={formatarNumero(atual)}
          sub={
            mediaAnterior > 0 ? (
              <p className={cn('flex items-center gap-1 text-xs', tendenciaSubindo ? 'text-emerald-600' : 'text-red-600')}>
                {tendenciaSubindo ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                vs média {formatarNumero(mediaAnterior)}
              </p>
            ) : undefined
          }
        />
        <CardResumo label="Variação de peso" valor={deltaPeso != null ? `${deltaPeso > 0 ? '+' : ''}${formatarNumero(deltaPeso)} kg` : '—'} />
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Prontidão pré-treino</h2>
          <button onClick={() => setBemEstarDetalhado((v) => !v)} className="text-sm font-medium text-brand-dark">
            {bemEstarDetalhado ? 'Ver índice' : 'Ver detalhes'}
          </button>
        </div>
        {dadosBemEstar.length === 0 ? (
          <EmptyMsg>Registre 2 treinos para ver a evolução.</EmptyMsg>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dadosBemEstar} margin={{ left: -20 }}>
              <GradeLeve />
              <EixoData dataKey="session_date" />
              <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={32} />
              <Tooltip
                labelFormatter={(v) => formatarDataCurta(String(v))}
                formatter={tooltipFormatter({
                  bemEstar: 'Bem-estar',
                  sono: 'Sono',
                  estresseInv: 'Estresse (invertido)',
                  fadigaInv: 'Fadiga (invertida)',
                  dorInv: 'Dor (invertida)',
                })}
              />
              {!bemEstarDetalhado && <Line type="monotone" dataKey="bemEstar" stroke={COR.bemEstar} strokeWidth={2} dot={{ r: 3 }} />}
              {bemEstarDetalhado && (
                <>
                  <Line type="monotone" dataKey="sono" stroke={COR.sono} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="estresseInv" stroke={COR.estresseInv} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="fadigaInv" stroke={COR.fadigaInv} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="dorInv" stroke={COR.dorInv} strokeWidth={2} dot={{ r: 3 }} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
        {bemEstarDetalhado && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: COR.sono }} />Sono</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: COR.estresseInv }} />Estresse</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: COR.fadigaInv }} />Fadiga</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: COR.dorInv }} />Dor</span>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Carga interna por sessão</h2>
        {dadosCargaSessao.length === 0 ? (
          <EmptyMsg>Registre 2 treinos para ver a evolução.</EmptyMsg>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosCargaSessao} margin={{ left: -20 }}>
              <GradeLeve />
              <EixoData dataKey="session_date" />
              <EixoValor />
              <Tooltip labelFormatter={(v) => formatarDataCurta(String(v))} formatter={tooltipFormatter({ cargaInterna: 'Carga (UA)' })} />
              <Bar dataKey="cargaInterna" fill={COR.cargaInterna} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Carga interna por semana</h2>
        {dadosCargaSemana.length === 0 ? (
          <EmptyMsg>Registre 2 treinos para ver a evolução.</EmptyMsg>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosCargaSemana} margin={{ left: -20 }}>
              <GradeLeve />
              <EixoData dataKey="semana" />
              <EixoValor />
              <Tooltip labelFormatter={(v) => `Semana de ${formatarDataCurta(String(v))}`} formatter={tooltipFormatter({ total: 'Carga (UA)' })} />
              <Bar dataKey="total" fill={COR.cargaInterna} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Evolução de carga por exercício</h2>
        {exercicios.length === 0 ? (
          <EmptyMsg>Nenhum exercício registrado ainda.</EmptyMsg>
        ) : (
          <>
            <select
              value={exercicioId ?? ''}
              onChange={(e) => setExercicioId(e.target.value || null)}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-brand"
            >
              <option value="">Escolha um exercício</option>
              {exercicios.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>

            {exercicioId && dadosExercicio.length < 2 && <EmptyMsg>Registre 2 treinos com esse exercício para ver a evolução.</EmptyMsg>}

            {exercicioId && dadosExercicio.length >= 2 && (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dadosExercicio} margin={{ left: -20 }}>
                    <GradeLeve />
                    <EixoData dataKey="session_date" />
                    <EixoValor />
                    <Tooltip
                      labelFormatter={(v) => formatarDataCurta(String(v))}
                      formatter={tooltipFormatter({ maiorCarga: 'Maior carga (kg)', rm1: '1RM estimado (kg)' })}
                    />
                    <Line type="monotone" dataKey="maiorCarga" stroke={COR.maiorCarga} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="rm1" stroke={COR.rm1} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-x-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: COR.maiorCarga }} />Maior carga</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: COR.rm1 }} />1RM estimado</span>
                </div>

                <h3 className="pt-2 text-sm font-semibold text-slate-700">Volume da sessão</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={dadosExercicio} margin={{ left: -20 }}>
                    <GradeLeve />
                    <EixoData dataKey="session_date" />
                    <EixoValor />
                    <Tooltip labelFormatter={(v) => formatarDataCurta(String(v))} formatter={tooltipFormatter({ volume: 'Volume (kg)' })} />
                    <Bar dataKey="volume" fill={COR.volume} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </>
        )}
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Peso corporal</h2>
        {dadosPeso.length < 2 ? (
          <EmptyMsg>Registre 2 pesos para ver a evolução.</EmptyMsg>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dadosPeso} margin={{ left: -20 }}>
              <GradeLeve />
              <EixoData dataKey="data" />
              <EixoValor />
              <Tooltip labelFormatter={(v) => formatarDataCurta(String(v))} formatter={tooltipFormatter({ peso: 'Peso (kg)' })} />
              <Line type="monotone" dataKey="peso" stroke={COR.peso} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
