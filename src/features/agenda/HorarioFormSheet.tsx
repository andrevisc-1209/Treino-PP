import { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { cn, desambiguarPorNome } from '@/lib/utils'
import { ORDEM_SEMANA_SEG_DOM, nomeDiaCurtoPorWeekday } from '@/lib/datas'
import { horariosFixosSobrepoe } from './conflitos'
import type { HorarioFixoLinha } from './horarioGrupo'

export type HorarioFormValor = {
  weekdays: number[]
  start_time: string
  duration_min: number
  local: string
  coParticipantesIds: string[]
}

const VAZIO: HorarioFormValor = { weekdays: [], start_time: '07:00', duration_min: 60, local: '', coParticipantesIds: [] }

export function HorarioFormSheet({
  open,
  onClose,
  title,
  outrosAlunos,
  valorInicial,
  diasEditaveis = true,
  outrosHorarios,
  onSalvar,
  salvando,
  erroExterno,
}: {
  open: boolean
  onClose: () => void
  title: string
  outrosAlunos: { id: string; name: string; birth_date?: string | null; phone?: string | null }[]
  valorInicial?: HorarioFormValor
  diasEditaveis?: boolean
  /** horários já existentes do personal, para aviso de conflito (não bloqueante) */
  outrosHorarios?: HorarioFixoLinha[]
  onSalvar: (valor: HorarioFormValor) => void
  salvando?: boolean
  erroExterno?: string | null
}) {
  const [valor, setValor] = useState<HorarioFormValor>(valorInicial ?? VAZIO)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValor(valorInicial ?? VAZIO)
      setErro(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleDia = (weekday: number) => {
    if (!diasEditaveis) return
    setValor((v) => ({ ...v, weekdays: v.weekdays.includes(weekday) ? v.weekdays.filter((w) => w !== weekday) : [...v.weekdays, weekday] }))
  }

  const toggleAluno = (id: string) => {
    setValor((v) => ({ ...v, coParticipantesIds: v.coParticipantesIds.includes(id) ? v.coParticipantesIds.filter((x) => x !== id) : [...v.coParticipantesIds, id] }))
  }

  const desambiguarOutrosAlunos = desambiguarPorNome(outrosAlunos)

  const conflito = (outrosHorarios ?? []).find((h) =>
    valor.weekdays.some((weekday) => horariosFixosSobrepoe({ weekday, start_time: valor.start_time, duration_min: valor.duration_min }, h)),
  )

  const salvar = () => {
    if (valor.weekdays.length === 0) {
      setErro('Selecione ao menos um dia da semana')
      return
    }
    if (!valor.start_time) {
      setErro('Informe a hora de início')
      return
    }
    setErro(null)
    onSalvar(valor)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <Field label="Dias da semana">
          <div className="flex flex-wrap gap-2">
            {ORDEM_SEMANA_SEG_DOM.map((weekday) => (
              <button
                key={weekday}
                type="button"
                disabled={!diasEditaveis}
                onClick={() => toggleDia(weekday)}
                className={cn(
                  'min-h-11 min-w-11 rounded-xl border px-3 text-sm font-medium disabled:opacity-60',
                  valor.weekdays.includes(weekday) ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                )}
              >
                {nomeDiaCurtoPorWeekday(weekday)}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-2">
          <Field label="Hora de início">
            <Input type="time" value={valor.start_time} onChange={(e) => setValor((v) => ({ ...v, start_time: e.target.value }))} />
          </Field>
          <Field label="Duração (min)">
            <Input
              type="number"
              inputMode="numeric"
              value={valor.duration_min}
              onChange={(e) => setValor((v) => ({ ...v, duration_min: Number(e.target.value) || 0 }))}
            />
          </Field>
        </div>

        <Field label="Local">
          <Input value={valor.local} onChange={(e) => setValor((v) => ({ ...v, local: e.target.value }))} placeholder="Opcional" />
        </Field>

        {outrosAlunos.length > 0 && (
          <Field label="Treina junto com">
            <div className="flex flex-wrap gap-2">
              {outrosAlunos.map((a) => {
                const desambiguar = desambiguarOutrosAlunos(a)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAluno(a.id)}
                    className={cn(
                      'min-h-9 rounded-full border px-3 text-sm font-medium',
                      valor.coParticipantesIds.includes(a.id) ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                    )}
                  >
                    {a.name}
                    {desambiguar && <span className="opacity-70"> · {desambiguar}</span>}
                  </button>
                )
              })}
            </div>
          </Field>
        )}

        {conflito && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span>
              Conflita com outro horário fixo às {conflito.start_time} ({conflito.aluno_nomes.join(', ') || 'sem alunos'}).
            </span>
          </div>
        )}

        {(erro || erroExterno) && <p className="text-sm text-red-600">{erro ?? erroExterno}</p>}
        <Button onClick={salvar} className="w-full" disabled={salvando}>
          Salvar
        </Button>
      </div>
    </BottomSheet>
  )
}
