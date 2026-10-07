import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { ListaSkeleton } from '@/components/Skeleton'
import { cn } from '@/lib/utils'
import { mapearErroSupabase } from '@/lib/erros'
import { hojeSP, dataSP, nomeDiaCurto } from '@/lib/datas'
import { formatarDataBR, formatarNumero } from '@/lib/format'
import { descreverExecucao, MODALIDADES, MODALIDADES_CONFIG, type ModalidadeTipo } from '@/types/modalidades'
import { useExecucoes, type Execucao } from './api'
import { metricaPrincipal, pontosGrafico, rotuloDias, semanasSeguidasAtuais, textoMetrica } from './metricas'

function Cartao({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="mt-0.5 text-xl font-bold leading-tight">{valor}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function ItemLog({ e }: { e: Execucao }) {
  const [aberto, setAberto] = useState(false)
  const data = dataSP(e.concluido_em ?? e.created_at)
  const linhas = descreverExecucao(e.modalidade, e.detalhes_execucao)
  return (
    <li className="rounded-2xl bg-white shadow-sm">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="flex min-h-14 w-full items-start gap-2 p-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {nomeDiaCurto(data)}, {formatarDataBR(data)}
          </span>
          <span className="block text-sm text-slate-700">{textoMetrica(e.modalidade, e.detalhes_execucao)}</span>
          {e.notas_aluno && <span className="block text-xs italic text-slate-500">“{e.notas_aluno}”</span>}
        </span>
        <ChevronDown size={18} className={cn('mt-1 shrink-0 text-slate-400 transition-transform', aberto && 'rotate-180')} aria-hidden />
      </button>
      {aberto && (
        <div className="space-y-1 border-t border-slate-100 p-3 text-sm">
          {linhas.length === 0 ? <p className="text-slate-500">Nenhum resultado preenchido.</p> : linhas.map((l, i) => <p key={i}>{l}</p>)}
          <p className="pt-1 text-xs text-slate-500">{e.origem === 'link' ? 'Registrado pelo aluno (link)' : 'Registrado na aula presencial'}</p>
        </div>
      )}
    </li>
  )
}

/** Evolução do aluno por modalidade: resumo, gráfico da métrica principal e log das últimas execuções. */
export function PerformanceTab({ alunoId }: { alunoId: string }) {
  const { data: todas, isLoading, error } = useExecucoes(alunoId)
  const concluidas = useMemo(() => (todas ?? []).filter((e) => e.status === 'concluido'), [todas])
  const modalidades = useMemo(() => MODALIDADES.filter((m) => concluidas.some((e) => e.modalidade === m)), [concluidas])
  const [escolhida, setEscolhida] = useState<ModalidadeTipo | null>(null)
  // sem escolha: abre na modalidade da execução mais recente
  const modalidade = escolhida && modalidades.includes(escolhida) ? escolhida : (concluidas[0]?.modalidade ?? null)

  const daModalidade = useMemo(() => concluidas.filter((e) => e.modalidade === modalidade), [concluidas, modalidade])
  const pontos = useMemo(() => (modalidade ? pontosGrafico(daModalidade, modalidade) : []), [daModalidade, modalidade])

  if (isLoading) return <ListaSkeleton />
  if (error) return <p className="text-red-600">{mapearErroSupabase(error)}</p>
  if (!modalidade) return <p className="text-sm text-slate-500">Nenhuma execução registrada ainda.</p>

  // unidade e rótulo dependem só da modalidade
  const { unidade, rotulo } = metricaPrincipal(modalidade, undefined)
  const media = pontos.length > 0 ? pontos.reduce((a, p) => a + p.valor, 0) / pontos.length : null
  const ultima = daModalidade.find((e) => e.concluido_em)?.concluido_em ?? null
  const sequencia = semanasSeguidasAtuais(daModalidade.flatMap((e) => (e.concluido_em ? [e.concluido_em] : [])), hojeSP())
  const dados = pontos.map((p) => ({ data: dataSP(p.data), valor: p.valor }))
  const dataCurta = (v: string) => v.split('-').slice(1).reverse().join('/')

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Modalidade">
        {modalidades.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={m === modalidade}
            onClick={() => setEscolhida(m)}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium',
              m === modalidade ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
            )}
          >
            {MODALIDADES_CONFIG[m].emoji} {MODALIDADES_CONFIG[m].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Cartao titulo="Execuções concluídas" valor={String(daModalidade.length)} />
        <Cartao titulo="Última execução" valor={ultima ? rotuloDias(ultima) : '—'} />
        <Cartao titulo="Média" valor={media === null ? '—' : `${formatarNumero(media)} ${unidade}`} sub={media === null ? undefined : `em ${rotulo}`} />
        <Cartao titulo="Sequência atual" valor={`${sequencia} ${sequencia === 1 ? 'semana' : 'semanas'}`} />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-medium">Evolução — {rotulo}</p>
        {pontos.length === 0 ? (
          <p className="text-sm text-slate-500">Ainda sem resultado numérico registrado nesta modalidade.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dados} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="data" tickFormatter={dataCurta} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} minTickGap={24} />
              <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={40} />
              <Tooltip
                labelFormatter={(v) => formatarDataBR(String(v))}
                formatter={(v) => [`${formatarNumero(Number(v))} ${unidade}`, rotulo]}
              />
              {/* com um único ponto aparece só a bolinha, sem linha */}
              <Line type="monotone" dataKey="valor" stroke="#367c39" strokeWidth={2} dot={{ r: pontos.length === 1 ? 6 : 3, fill: '#367c39' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-600">Últimas execuções</h3>
        <ul className="space-y-2">
          {daModalidade.slice(0, 10).map((e) => (
            <ItemLog key={e.id} e={e} />
          ))}
        </ul>
      </div>
    </div>
  )
}
