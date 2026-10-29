import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { ListaSkeleton } from '@/components/Skeleton'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { Button, Switch } from '@/components/ui'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { mapearErroSupabase } from '@/lib/erros'
import { cn } from '@/lib/utils'
import { formatarDataBR } from '@/lib/format'
import { hojeSP } from '@/lib/datas'
import { Input } from '@/components/ui'
import { useAdicionarBloqueio, useBloqueios, useDisponibilidade, useProfessionalConfig, useRemoverBloqueio, useSalvarDisponibilidade } from './api'
import {
  avisosDias,
  copiarDia,
  diasDasJanelas,
  intervaloVazio,
  janelasDosDias,
  MAX_INTERVALOS_POR_DIA,
  modeloManhaETarde,
  nomeDia,
  parametrosDaConfig,
  resumoDisponibilidade,
  validarDias,
  validarParametros,
  type DiaDisponibilidade,
  type ParametrosAgenda,
} from './disponibilidade'

const campo = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm'

function NumeroCampo({ rotulo, valor, onChange, sufixo, ajuda }: { rotulo: string; valor: number; onChange: (v: number) => void; sufixo: string; ajuda?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      {rotulo}
      <span className="flex items-center gap-2">
        <input type="number" inputMode="numeric" min={0} value={Number.isFinite(valor) ? valor : ''} onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))} className={cn(campo, 'w-28')} />
        <span className="text-slate-600">{sufixo}</span>
      </span>
      {ajuda && <span className="text-xs text-slate-600">{ajuda}</span>}
    </label>
  )
}

function Formulario({ inicialDias, inicialParametros }: { inicialDias: DiaDisponibilidade[]; inicialParametros: ParametrosAgenda }) {
  const navigate = useNavigate()
  const { exigir } = useExigirAssinatura()
  const salvar = useSalvarDisponibilidade()
  const [dias, setDias] = useState(inicialDias)
  const [parametros, setParametros] = useState(inicialParametros)
  const [erros, setErros] = useState<string[]>([])

  const mudarDia = (weekday: number, patch: Partial<DiaDisponibilidade>) => setDias((ds) => ds.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)))
  const ligarDia = (d: DiaDisponibilidade, ligado: boolean) => mudarDia(d.weekday, { ativo: ligado, intervalos: ligado && d.intervalos.length === 0 ? [intervaloVazio()] : d.intervalos })
  const mudarIntervalo = (d: DiaDisponibilidade, i: number, campoHora: 'inicio' | 'fim', v: string) =>
    mudarDia(d.weekday, { intervalos: d.intervalos.map((x, k) => (k === i ? { ...x, [campoHora]: v } : x)) })
  const removerIntervalo = (d: DiaDisponibilidade, i: number) => {
    const resto = d.intervalos.filter((_, k) => k !== i)
    mudarDia(d.weekday, { intervalos: resto, ativo: resto.length > 0 })
  }
  const adicionarIntervalo = (d: DiaDisponibilidade) => {
    const ultimo = d.intervalos[d.intervalos.length - 1]
    mudarDia(d.weekday, { intervalos: [...d.intervalos, ultimo ? { inicio: ultimo.fim, fim: ultimo.fim >= '17:00' ? '23:00' : '18:00' } : intervaloVazio()] })
  }
  const num = <K extends keyof ParametrosAgenda>(k: K, v: number) => setParametros((p) => ({ ...p, [k]: v }))

  const nenhumDia = dias.every((d) => !d.ativo)
  const resumo = resumoDisponibilidade(dias)
  const avisos = avisosDias(dias, Number.isFinite(parametros.duracaoMin) ? parametros.duracaoMin : 60)

  const gravar = async () => {
    const problemas = [...validarDias(dias), ...validarParametros(parametros)]
    setErros(problemas)
    if (problemas.length > 0) return
    try {
      await salvar.mutateAsync({ janelas: janelasDosDias(dias), parametros })
      mostrarInfoGlobal('Disponibilidade salva.')
      navigate('/agenda')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <div className="space-y-4">
      {nenhumDia && (
        <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-700">Quer começar de um modelo? Segunda a sexta, de manhã e à tarde. Você ajusta depois.</p>
          <Button variant="outline" className="w-full" onClick={() => setDias(modeloManhaETarde())}>
            Usar modelo: segunda a sexta, manhã e tarde
          </Button>
        </div>
      )}

      {dias.map((d) => (
        <section key={d.weekday} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" aria-label={nomeDia(d.weekday)}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{nomeDia(d.weekday)}</h2>
            <Switch checked={d.ativo} onChange={(v) => ligarDia(d, v)} label={`Atendo na ${nomeDia(d.weekday).toLowerCase()}`} />
          </div>
          {!d.ativo && <p className="text-sm text-slate-600">Sem atendimento.</p>}
          {d.ativo &&
            d.intervalos.map((i, k) => (
              <div key={k} className="flex items-end gap-2">
                <label className="flex-1 text-xs text-slate-600">
                  Das
                  <input type="time" value={i.inicio} onChange={(e) => mudarIntervalo(d, k, 'inicio', e.target.value)} className={campo} />
                </label>
                <label className="flex-1 text-xs text-slate-600">
                  Até
                  <input type="time" value={i.fim} onChange={(e) => mudarIntervalo(d, k, 'fim', e.target.value)} className={campo} />
                </label>
                <button
                  type="button"
                  onClick={() => removerIntervalo(d, k)}
                  aria-label={`Remover horário das ${i.inicio} às ${i.fim} de ${nomeDia(d.weekday).toLowerCase()}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </div>
            ))}
          {d.ativo && (
            <div className="flex flex-wrap gap-x-4">
              {d.intervalos.length < MAX_INTERVALOS_POR_DIA && (
                <button type="button" onClick={() => adicionarIntervalo(d)} className="flex min-h-11 items-center gap-1 text-sm font-medium text-brand-hover">
                  <Plus size={16} aria-hidden /> Adicionar horário
                </button>
              )}
              <button type="button" onClick={() => setDias((ds) => copiarDia(ds, d.weekday, 'uteis'))} className="min-h-11 text-sm font-medium text-slate-700 underline">
                Copiar para segunda a sexta
              </button>
            </div>
          )}
        </section>
      ))}

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Regras das vagas">
        <h2 className="font-semibold">Regras das vagas</h2>
        <div className="flex flex-wrap gap-4">
          <NumeroCampo rotulo="Duração da aula" valor={parametros.duracaoMin} onChange={(v) => num('duracaoMin', v)} sufixo="min" />
          <NumeroCampo rotulo="Intervalo entre aulas" valor={parametros.intervaloMin} onChange={(v) => num('intervaloMin', v)} sufixo="min" />
        </div>
        <NumeroCampo
          rotulo="Antecedência mínima para marcar"
          valor={parametros.antecedenciaHoras}
          onChange={(v) => num('antecedenciaHoras', v)}
          sufixo="horas"
          ajuda="Quem pedir um horário precisa avisar com pelo menos isso de antecedência. O padrão é 3 horas."
        />
        <NumeroCampo rotulo="Mostrar vagas de" valor={parametros.horizonteSemanas} onChange={(v) => num('horizonteSemanas', v)} sufixo="semanas à frente" />
      </section>

      <section className="space-y-1 rounded-2xl bg-slate-100 p-4" aria-label="Resumo da sua agenda">
        <h2 className="text-sm font-semibold text-slate-700">Resumo da sua agenda</h2>
        {resumo.map((l) => (
          <p key={l} className="text-sm text-slate-800">
            {l}
          </p>
        ))}
      </section>

      {avisos.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-950">
          {avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      {erros.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {erros.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <Button className="w-full" onClick={exigir(gravar)} disabled={salvar.isPending}>
        {salvar.isPending ? 'Salvando…' : 'Salvar disponibilidade'}
      </Button>
    </div>
  )
}

/** Dias sem atendimento (férias, feriado, viagem): salvos na hora, sem passar pelo botão de salvar; nesses dias não aparece vaga. */
function BloqueiosSecao() {
  const { exigir } = useExigirAssinatura()
  const { data: bloqueios } = useBloqueios()
  const adicionar = useAdicionarBloqueio()
  const remover = useRemoverBloqueio()
  const [inicio, setInicio] = useState(hojeSP())
  const [fim, setFim] = useState(hojeSP())
  const [motivo, setMotivo] = useState('')
  const invalido = !inicio || !fim || fim < inicio

  const incluir = async () => {
    try {
      await adicionar.mutateAsync({ inicio, fim, motivo })
      setMotivo('')
      mostrarInfoGlobal('Bloqueio salvo. Nesses dias não aparecem vagas.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Dias sem atendimento">
      <div>
        <h2 className="font-semibold">Dias sem atendimento</h2>
        <p className="text-sm text-slate-600">Férias, feriado, viagem. Salvo na hora; as aulas já marcadas não mudam.</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {(bloqueios ?? []).map((b) => (
          <li key={b.id} className="flex items-center gap-3 py-1.5">
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{b.data_inicio === b.data_fim ? formatarDataBR(b.data_inicio) : `${formatarDataBR(b.data_inicio)} a ${formatarDataBR(b.data_fim)}`}</span>
              {b.motivo && <span className="text-slate-600"> · {b.motivo}</span>}
            </span>
            <button
              type="button"
              onClick={() => remover.mutate(b.id, { onError: (e) => mostrarErroGlobal(mapearErroSupabase(e)) })}
              aria-label={`Remover bloqueio de ${formatarDataBR(b.data_inicio)}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
            >
              <Trash2 size={18} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-xs text-slate-600">
          De
          <Input type="date" value={inicio} min={hojeSP()} onChange={(e) => { setInicio(e.target.value); if (fim < e.target.value) setFim(e.target.value) }} />
        </label>
        <label className="flex-1 text-xs text-slate-600">
          Até
          <Input type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} />
        </label>
      </div>
      <label className="block text-xs text-slate-600">
        Motivo (opcional)
        <Input value={motivo} maxLength={60} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: férias" />
      </label>
      <Button variant="outline" className="w-full" onClick={exigir(incluir)} disabled={invalido || adicionar.isPending}>
        Bloquear estes dias
      </Button>
    </section>
  )
}

/** Quando o personal atende: janelas por dia da semana e as regras das vagas (antecedência mínima padrão: 3 horas). */
export function DisponibilidadePage() {
  const janelas = useDisponibilidade()
  const config = useProfessionalConfig()
  const carregando = janelas.isLoading || config.isLoading

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <header className="flex items-center gap-2">
        <Link to="/agenda" aria-label="Voltar para a agenda" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Disponibilidade</h1>
          <p className="text-sm text-slate-600">Os horários em que você atende viram vagas na sua agenda.</p>
        </div>
      </header>
      {carregando && <ListaSkeleton linhas={4} />}
      {(janelas.error || config.error) && <p className="py-4 text-sm text-red-600">{mapearErroSupabase(janelas.error ?? config.error)}</p>}
      {!carregando && !janelas.error && !config.error && <Formulario inicialDias={diasDasJanelas(janelas.data ?? [])} inicialParametros={parametrosDaConfig(config.data)} />}
      {!carregando && !janelas.error && !config.error && <BloqueiosSecao />}
    </div>
  )
}
