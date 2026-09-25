import { Check, MapPin, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatarHoraInicioFim } from '@/lib/datas'
import type { Aula, ParticipanteStatus } from './api'

function SeloStatus({ status }: { status: ParticipanteStatus }) {
  if (status === 'presente') return <Check size={12} className="text-emerald-600" />
  if (status === 'falta') return <X size={12} className="text-red-600" />
  if (status === 'cancelou') return <X size={12} className="text-slate-400" />
  return null
}

export function AulaCard({ aula, destaque, onClick }: { aula: Aula; destaque?: boolean; onClick: () => void }) {
  const nomes = aula.aula_participantes.map((p) => p.aluno?.name).filter((n): n is string => !!n)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl p-4 text-left shadow-sm transition active:bg-slate-50',
        destaque ? 'bg-brand/10 ring-2 ring-brand' : 'bg-white',
        aula.status === 'cancelada' && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{formatarHoraInicioFim(aula.starts_at, aula.duration_min)}</p>
        {aula.status === 'realizada' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Realizada</span>}
        {aula.status === 'cancelada' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Cancelada</span>}
      </div>

      <div className="mt-1 flex flex-wrap gap-1.5">
        {aula.aula_participantes.map((p) => (
          <span
            key={p.id}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
          >
            <SeloStatus status={p.status} />
            {p.aluno?.name ?? 'Aluno'}
          </span>
        ))}
        {nomes.length === 0 && <span className="text-sm text-slate-400">Sem participantes</span>}
      </div>

      {aula.local && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
          <MapPin size={14} /> {aula.local}
        </p>
      )}
    </button>
  )
}
