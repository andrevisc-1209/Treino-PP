import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { dataSP, horaSP, montarDataHoraSP } from '@/lib/datas'
import { useCancelarAula, useCheckIn, useMarcarFalta, useProfessionalConfig, useRemarcarAula, type Aula } from './api'

type Passo = 'menu' | 'iniciar' | 'checkin' | 'falta' | 'cancelar' | 'remarcar'

export function AulaAcoesSheet({ aula, onClose }: { aula: Aula | null; onClose: () => void }) {
  const navigate = useNavigate()
  const { data: config } = useProfessionalConfig()
  const checkIn = useCheckIn()
  const marcarFalta = useMarcarFalta()
  const cancelarAula = useCancelarAula()
  const remarcarAula = useRemarcarAula()

  const [passo, setPasso] = useState<Passo>('menu')
  const [alunoFalta, setAlunoFalta] = useState<{ id: string; name: string } | null>(null)
  const [cobrarFalta, setCobrarFalta] = useState(true)
  const [canceladoPor, setCanceladoPor] = useState<'aluno' | 'personal'>('aluno')
  const [cobrarCancel, setCobrarCancel] = useState(true)
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')

  const fechar = () => {
    setPasso('menu')
    setAlunoFalta(null)
    onClose()
  }

  if (!aula) return null

  const previstos = aula.aula_participantes.filter((p) => p.status === 'previsto')
  const podeAgir = aula.status === 'agendada' && previstos.length > 0

  const abrirFalta = (aluno: { id: string; name: string }) => {
    setAlunoFalta(aluno)
    setCobrarFalta(config?.cobrar_falta_padrao ?? true)
    setPasso('falta')
  }

  const confirmarFalta = () => {
    if (!alunoFalta) return
    marcarFalta.mutate({ aulaId: aula.id, alunoId: alunoFalta.id, cobrar: cobrarFalta }, { onSuccess: fechar })
  }

  const abrirCancelar = () => {
    setCanceladoPor('aluno')
    setCobrarCancel(config?.cobrar_cancel_padrao ?? false)
    setPasso('cancelar')
  }

  const confirmarCancelar = () => {
    cancelarAula.mutate({ aulaId: aula.id, canceladoPor, cobrar: cobrarCancel }, { onSuccess: fechar })
  }

  const abrirRemarcar = () => {
    setNovaData(dataSP(aula.starts_at))
    setNovaHora(horaSP(aula.starts_at))
    setPasso('remarcar')
  }

  const confirmarRemarcar = () => {
    if (!novaData || !novaHora) return
    remarcarAula.mutate({ aulaId: aula.id, startsAt: montarDataHoraSP(novaData, novaHora) }, { onSuccess: fechar })
  }

  const iniciarTreino = (alunoId: string) => {
    fechar()
    navigate(`/alunos/${alunoId}/sessoes/nova?aula=${aula.id}`)
  }

  const titulo =
    passo === 'menu'
      ? undefined
      : passo === 'iniciar'
        ? 'Iniciar treino de quem?'
        : passo === 'checkin'
          ? 'Check-in de quem?'
          : passo === 'falta'
            ? alunoFalta
              ? `Falta · ${alunoFalta.name}`
              : 'Falta de quem?'
            : passo === 'cancelar'
              ? 'Cancelar aula'
              : 'Remarcar aula'

  return (
    <BottomSheet open={!!aula} onClose={fechar} title={titulo}>
      {passo === 'menu' && (
        <div className="space-y-1">
          {!podeAgir && aula.status !== 'agendada' && (
            <p className="px-1 pb-2 text-sm text-slate-500">
              {aula.status === 'realizada' ? 'Esta aula já foi realizada.' : 'Esta aula foi cancelada.'}
            </p>
          )}
          {podeAgir && (
            <>
              <button
                onClick={() => (previstos.length === 1 ? iniciarTreino(previstos[0].aluno_id) : setPasso('iniciar'))}
                className="w-full rounded-xl px-3 py-3 text-left font-medium active:bg-slate-100"
              >
                ▶ Iniciar treino
              </button>
              <button onClick={() => setPasso('checkin')} className="w-full rounded-xl px-3 py-3 text-left font-medium active:bg-slate-100">
                ✓ Check-in sem treino
              </button>
              <button onClick={() => setPasso('falta')} className="w-full rounded-xl px-3 py-3 text-left font-medium active:bg-slate-100">
                Falta
              </button>
              <button onClick={abrirCancelar} className="w-full rounded-xl px-3 py-3 text-left font-medium text-red-600 active:bg-slate-100">
                Cancelar
              </button>
              <button onClick={abrirRemarcar} className="w-full rounded-xl px-3 py-3 text-left font-medium active:bg-slate-100">
                Remarcar
              </button>
            </>
          )}
        </div>
      )}

      {passo === 'iniciar' && (
        <ul className="space-y-1">
          {previstos.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => iniciarTreino(p.aluno_id)}
                className="w-full rounded-xl px-3 py-3 text-left font-medium active:bg-slate-100"
              >
                {p.aluno?.name ?? 'Aluno'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {passo === 'checkin' && (
        <div className="space-y-1">
          {previstos.length > 1 && (
            <button
              onClick={() => checkIn.mutate({ aulaId: aula.id }, { onSuccess: fechar })}
              disabled={checkIn.isPending}
              className="w-full rounded-xl px-3 py-3 text-left font-medium text-brand-dark active:bg-slate-100"
            >
              Marcar todos presentes
            </button>
          )}
          {previstos.map((p) => (
            <button
              key={p.id}
              onClick={() => checkIn.mutate({ aulaId: aula.id, alunoIds: [p.aluno_id] }, { onSuccess: fechar })}
              disabled={checkIn.isPending}
              className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
            >
              {p.aluno?.name ?? 'Aluno'}
            </button>
          ))}
        </div>
      )}

      {passo === 'falta' && !alunoFalta && (
        <ul className="space-y-1">
          {previstos.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => abrirFalta({ id: p.aluno_id, name: p.aluno?.name ?? 'Aluno' })}
                className="w-full rounded-xl px-3 py-3 text-left font-medium active:bg-slate-100"
              >
                {p.aluno?.name ?? 'Aluno'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {passo === 'falta' && alunoFalta && (
        <div className="space-y-4">
          <label className="flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3">
            <span className="font-medium">Cobrar esta aula</span>
            <input type="checkbox" checked={cobrarFalta} onChange={(e) => setCobrarFalta(e.target.checked)} className="size-5" />
          </label>
          <Button onClick={confirmarFalta} className="w-full" disabled={marcarFalta.isPending}>
            Confirmar falta
          </Button>
        </div>
      )}

      {passo === 'cancelar' && (
        <div className="space-y-4">
          <Field label="Quem cancelou?">
            <div className="flex gap-2">
              {(['aluno', 'personal'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCanceladoPor(v)}
                  className={
                    canceladoPor === v
                      ? 'min-h-11 flex-1 rounded-xl border border-brand bg-brand px-3 text-sm font-medium text-white'
                      : 'min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700'
                  }
                >
                  {v === 'aluno' ? 'Aluno' : 'Personal'}
                </button>
              ))}
            </div>
          </Field>
          {canceladoPor === 'aluno' && (
            <label className="flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3">
              <span className="font-medium">Cobrar</span>
              <input type="checkbox" checked={cobrarCancel} onChange={(e) => setCobrarCancel(e.target.checked)} className="size-5" />
            </label>
          )}
          <Button onClick={confirmarCancelar} className="w-full" disabled={cancelarAula.isPending}>
            Confirmar cancelamento
          </Button>
        </div>
      )}

      {passo === 'remarcar' && (
        <div className="space-y-4">
          <Field label="Data">
            <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
          </Field>
          <Field label="Hora">
            <Input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} />
          </Field>
          <Button onClick={confirmarRemarcar} className="w-full" disabled={remarcarAula.isPending}>
            Remarcar
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}
