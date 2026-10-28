import { AlarmClock, MapPin, Play, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatarHoraInicioFim } from '@/lib/datas'
import { BotaoWhatsApp } from '@/components/BotaoWhatsApp'
import type { Aula } from './api'
import { localCurto, type SituacaoDaAula } from './proximaAula'

const ROTULO: Record<SituacaoDaAula, string> = { proxima: 'Próxima aula', em_andamento: 'Em andamento', atrasada: 'Atrasada · sem registro' }

/** Aula em foco na tela Hoje: o que o personal precisa para atender agora (quando, quem, onde) e o botão Começar. */
export function ProximaAulaCard({
  aula,
  situacao,
  outrasNoHorario,
  onClick,
  onComecar,
}: {
  aula: Aula
  situacao: SituacaoDaAula
  /** outras aulas agendadas no mesmo horário (aviso neutro: pode ser dupla, grupo ou alunos em paralelo) */
  outrasNoHorario: number
  onClick: () => void
  onComecar: () => void
}) {
  const unico = aula.aula_participantes.length === 1 ? aula.aula_participantes[0] : null
  const podeComecar = aula.aula_participantes.some((p) => p.status === 'previsto')
  const local = localCurto(aula.local)
  const atrasada = situacao === 'atrasada'

  return (
    <section
      aria-label={ROTULO[situacao]}
      className={cn('mb-4 rounded-2xl p-4 shadow-sm ring-2', atrasada ? 'bg-amber-50 ring-amber-500' : 'bg-brand/10 ring-brand')}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide', atrasada ? 'text-amber-800' : 'text-brand-hover')}>
          {atrasada ? <TriangleAlert size={14} aria-hidden /> : <AlarmClock size={14} aria-hidden />}
          {ROTULO[situacao]}
        </p>
        {unico && <BotaoWhatsApp telefone={unico.aluno?.phone} label={`WhatsApp de ${unico.aluno?.name}`} size={18} />}
      </div>

      <button type="button" onClick={onClick} className="mt-1 block min-h-11 w-full text-left">
        <span className="block text-2xl font-bold">{formatarHoraInicioFim(aula.starts_at, aula.duration_min)}</span>
        <span className="mt-1 block text-base font-semibold">{aula.aula_participantes.map((p) => p.aluno?.name ?? 'Aluno').join(', ') || 'Sem participantes'}</span>
        {local && (
          <span className="mt-1 flex items-center gap-1 text-sm text-slate-600">
            <MapPin size={14} aria-hidden /> {local}
          </span>
        )}
      </button>

      {outrasNoHorario > 0 && (
        <p className="mt-2 text-sm text-slate-700">
          + {outrasNoHorario} {outrasNoHorario === 1 ? 'aula' : 'aulas'} neste horário
        </p>
      )}

      {podeComecar && (
        <button type="button" onClick={onComecar} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white active:bg-brand-hover">
          <Play size={18} aria-hidden /> Começar
        </button>
      )}
    </section>
  )
}
