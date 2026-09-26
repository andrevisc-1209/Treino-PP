import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { BotaoWhatsApp } from '@/components/BotaoWhatsApp'
import { dividirValor } from '@/features/financeiro/calc'
import { formatarBRL } from '@/lib/moeda'
import { dataSP, horaSP, montarDataHoraSP } from '@/lib/datas'
import { useCancelarAula, useCheckIn, useMarcarFalta, useProfessionalConfig, useRemarcarAula, valorPorAulaDoAluno, type Aula } from './api'

type Passo = 'menu' | 'iniciar' | 'checkin' | 'falta' | 'cancelar' | 'remarcar'

export function AulaAcoesSheet({
  aula,
  onClose,
  passoInicial = 'menu',
}: {
  aula: Aula | null
  onClose: () => void
  /** Abre a sheet já num passo específico (ex.: "▶ Começar" numa aula em grupo pula o menu e vai direto pra escolher o aluno). */
  passoInicial?: Passo
}) {
  const navigate = useNavigate()
  const { data: config } = useProfessionalConfig()
  const checkIn = useCheckIn()
  const marcarFalta = useMarcarFalta()
  const cancelarAula = useCancelarAula()
  const remarcarAula = useRemarcarAula()

  const [passo, setPasso] = useState<Passo>(passoInicial)
  const [alunoFalta, setAlunoFalta] = useState<{ id: string; name: string } | null>(null)
  const [cobrarFalta, setCobrarFalta] = useState(true)
  const [canceladoPor, setCanceladoPor] = useState<'aluno' | 'personal'>('aluno')
  const [cobrarCancel, setCobrarCancel] = useState(true)
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [valoresGrupo, setValoresGrupo] = useState<Record<string, string>>({})
  const [dividirTotal, setDividirTotal] = useState(false)
  const [totalDividir, setTotalDividir] = useState('')

  useEffect(() => {
    if (aula) setPasso(passoInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aula?.id])

  const fechar = () => {
    setPasso('menu')
    setAlunoFalta(null)
    setDividirTotal(false)
    setTotalDividir('')
    onClose()
  }

  const previstos = aula?.aula_participantes.filter((p) => p.status === 'previsto') ?? []
  const podeAgir = aula?.status === 'agendada' && previstos.length > 0

  useEffect(() => {
    if (passo !== 'checkin' || previstos.length <= 1 || !aula) return
    let cancelado = false
    Promise.all(previstos.map((p) => valorPorAulaDoAluno(p.aluno_id))).then((valores) => {
      if (cancelado) return
      const iniciais: Record<string, string> = {}
      previstos.forEach((p, i) => {
        iniciais[p.aluno_id] = String(valores[i] ?? 0)
      })
      setValoresGrupo(iniciais)
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, aula?.id])

  if (!aula) return null

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

  const aplicarDivisao = () => {
    const total = Number(totalDividir.replace(',', '.'))
    if (!total || total <= 0) return
    const partes = dividirValor(total, previstos.length)
    const novosValores: Record<string, string> = {}
    previstos.forEach((p, i) => {
      novosValores[p.aluno_id] = String(partes[i])
    })
    setValoresGrupo(novosValores)
  }

  const confirmarCheckInGrupo = () => {
    const valoresPorAluno: Record<string, number> = {}
    for (const p of previstos) {
      valoresPorAluno[p.aluno_id] = Number((valoresGrupo[p.aluno_id] ?? '0').replace(',', '.')) || 0
    }
    checkIn.mutate({ aulaId: aula.id, valoresPorAluno }, { onSuccess: fechar })
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
          {aula.aula_participantes.length > 1 && (
            <ul className="mb-2 space-y-1 border-b border-slate-100 pb-2">
              {aula.aula_participantes.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-1">
                  <span className="text-sm font-medium">{p.aluno?.name ?? 'Aluno'}</span>
                  <BotaoWhatsApp telefone={p.aluno?.phone} label={`WhatsApp de ${p.aluno?.name}`} size={18} />
                </li>
              ))}
            </ul>
          )}
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

      {passo === 'checkin' && previstos.length <= 1 && (
        <div className="space-y-1">
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

      {passo === 'checkin' && previstos.length > 1 && (
        <div className="space-y-4">
          <label className="flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3">
            <span className="font-medium">Dividir um valor total</span>
            <input type="checkbox" checked={dividirTotal} onChange={(e) => setDividirTotal(e.target.checked)} className="size-5 accent-brand" />
          </label>

          {dividirTotal && (
            <div className="flex items-end gap-2">
              <Field label="Total (R$)">
                <Input type="number" step="0.01" inputMode="decimal" value={totalDividir} onChange={(e) => setTotalDividir(e.target.value)} />
              </Field>
              <Button type="button" variant="ghost" onClick={aplicarDivisao}>
                Aplicar
              </Button>
            </div>
          )}

          <ul className="space-y-2">
            {previstos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.aluno?.name ?? 'Aluno'}</span>
                <div className="w-28 shrink-0">
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={valoresGrupo[p.aluno_id] ?? ''}
                    onChange={(e) => setValoresGrupo((v) => ({ ...v, [p.aluno_id]: e.target.value }))}
                  />
                </div>
              </li>
            ))}
          </ul>

          <p className="text-sm text-slate-500">
            Total: {formatarBRL(previstos.reduce((acc, p) => acc + (Number((valoresGrupo[p.aluno_id] ?? '0').replace(',', '.')) || 0), 0))}
          </p>

          <Button onClick={confirmarCheckInGrupo} className="w-full" disabled={checkIn.isPending}>
            Confirmar presença de todos
          </Button>
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
            <input type="checkbox" checked={cobrarFalta} onChange={(e) => setCobrarFalta(e.target.checked)} className="size-5 accent-brand" />
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
              <input type="checkbox" checked={cobrarCancel} onChange={(e) => setCobrarCancel(e.target.checked)} className="size-5 accent-brand" />
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
