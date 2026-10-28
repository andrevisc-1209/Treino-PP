import { Check, MapPin, Play, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatarHoraInicioFim } from '@/lib/datas'
import { BotaoWhatsApp } from '@/components/BotaoWhatsApp'
import type { Aula, ParticipanteStatus } from './api'
import { localCurto } from './proximaAula'

function SeloStatus({ status }: { status: ParticipanteStatus }) {
  if (status === 'presente') return <Check size={12} className="text-brand" />
  if (status === 'falta') return <X size={12} className="text-red-600" />
  if (status === 'cancelou') return <X size={12} className="text-slate-400" />
  return null
}

export function AulaCard({
  aula,
  destaque,
  atrasada,
  localResumido,
  conflito,
  onClick,
  onComecar,
}: {
  aula: Aula
  destaque?: boolean
  /** ainda agendada, mas o horário já passou: pede registro (check-in, falta ou cancelamento) */
  atrasada?: boolean
  /** só "Lugar · Bairro" em vez do endereço inteiro (Hoje); o endereço completo continua na Agenda */
  localResumido?: boolean
  /** alunos que estão previstos em outra aula que se cruza com esta (conflito real, não aula em dupla) */
  conflito?: string[]
  onClick: () => void
  /** "▶ Começar" — só aparece pra aula ainda agendada com algum participante previsto. */
  onComecar?: () => void
}) {
  const nomes = aula.aula_participantes.map((p) => p.aluno?.name).filter((n): n is string => !!n)
  const participanteUnico = aula.aula_participantes.length === 1 ? aula.aula_participantes[0] : null
  const podeComecar = aula.status === 'agendada' && aula.aula_participantes.some((p) => p.status === 'previsto')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      className={cn(
        'w-full cursor-pointer rounded-2xl p-4 text-left shadow-sm transition active:bg-slate-50',
        destaque ? 'bg-brand/10 ring-2 ring-brand' : 'bg-white',
        (aula.status === 'cancelada' || aula.status === 'realizada') && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{formatarHoraInicioFim(aula.starts_at, aula.duration_min)}</p>
        <div className="flex items-center gap-1">
          {atrasada && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              <TriangleAlert size={12} aria-hidden /> Atrasada
            </span>
          )}
          {aula.status === 'realizada' && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-hover">Realizada</span>}
          {aula.status === 'cancelada' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Cancelada</span>}
          {participanteUnico && <BotaoWhatsApp telefone={participanteUnico.aluno?.phone} label={`WhatsApp de ${participanteUnico.aluno?.name}`} size={16} comTexto />}
        </div>
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
        {nomes.length === 0 && <span className="text-sm text-slate-500">Sem participantes</span>}
      </div>

      {conflito && conflito.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-sm font-medium text-amber-900">
          <TriangleAlert size={14} aria-hidden /> Conflito: {conflito.join(', ')} em outra aula neste horário
        </p>
      )}

      {aula.local && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
          <MapPin size={14} /> {localResumido ? localCurto(aula.local) : aula.local}
        </p>
      )}

      {podeComecar && onComecar && (
        <button type="button"
          onClick={(e) => {
            e.stopPropagation()
            onComecar()
          }}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand font-medium text-white active:bg-brand-hover"
        >
          <Play size={18} /> Começar
        </button>
      )}
    </div>
  )
}
