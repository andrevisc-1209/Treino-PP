import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { hojeSP } from '@/lib/datas'
import { formatarNumero } from '@/lib/format'
import type { Execucao } from './api'
import { temVolume, totalKm, volumeSemanal } from './volume'

// uma cor por disciplina (distinguíveis entre si e do fundo branco)
const COR = { natacao: '#0284c7', ciclismo: '#d97706', corrida: '#367c39' }
const km = (v: number) => `${formatarNumero(Math.round(v * 10) / 10)} km`

/** Volume por disciplina nas últimas 8 semanas (km, em barras empilhadas) e totais da semana atual. */
export function VolumeSemanal({ execucoes }: { execucoes: Execucao[] }) {
  const semanas = useMemo(() => volumeSemanal(execucoes, hojeSP(), 8), [execucoes])
  const algumVolume = semanas.some((s) => temVolume(s.volume))
  const atual = semanas[semanas.length - 1].volume
  const dados = semanas.map((s) => ({
    semana: s.rotulo,
    Natação: Math.round(s.volume.natacaoKm * 100) / 100,
    Ciclismo: Math.round(s.volume.ciclismoKm * 100) / 100,
    Corrida: Math.round(s.volume.corridaKm * 100) / 100,
  }))

  if (!algumVolume) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold">Volume semanal</h3>
        <p className="text-sm text-slate-500">Nenhuma atividade registrada ainda.</p>
      </section>
    )
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Volume semanal por disciplina">
      <h3 className="text-sm font-semibold">Volume semanal (km)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="semana" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={36} />
          <Tooltip formatter={(v, nome) => [`${formatarNumero(Number(v))} km`, nome]} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Natação" stackId="v" fill={COR.natacao} />
          <Bar dataKey="Ciclismo" stackId="v" fill={COR.ciclismo} />
          <Bar dataKey="Corrida" stackId="v" fill={COR.corrida} />
        </BarChart>
      </ResponsiveContainer>

      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Esta semana</p>
        <dl className="space-y-0.5 text-sm">
          <div className="flex justify-between">
            <dt>🏊 Natação</dt>
            <dd className="font-medium tabular-nums">{km(atual.natacaoKm)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>🚴 Ciclismo</dt>
            <dd className="font-medium tabular-nums">{km(atual.ciclismoKm)}</dd>
          </div>
          {atual.ciclismoMin > 0 && (
            <div className="flex justify-between text-slate-600">
              <dt>🚴 Ciclismo indoor (sem distância)</dt>
              <dd className="tabular-nums">{formatarNumero(Math.round(atual.ciclismoMin))} min</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>🏃 Corrida</dt>
            <dd className="font-medium tabular-nums">{km(atual.corridaKm)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{km(totalKm(atual))}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
