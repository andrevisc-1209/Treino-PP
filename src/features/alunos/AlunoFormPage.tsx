import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { cn, formatarTelefone, idade } from '@/lib/utils'
import { formatarDataBR, formatarNumero, formatarPesoKg, formatarSexo } from '@/lib/format'
import { BottomSheet, Button, ChipsMultiSelect, Field, Input } from '@/components/ui'
import { useAluno, useAlunos, useConsentimentoAtivo, usePesos, useSalvarAluno } from './api'
import { TERMO_AVISO, TERMO_TEXTO } from './termo'
import { ESPORTES, OBJETIVOS, REGIOES_CORPO } from './opcoes'
import { HorariosFixosBlock } from '@/features/agenda/HorariosFixosBlock'
import { criarHorariosFixos, useHorariosFixos } from '@/features/agenda/api'
import { HorarioFormSheet, type HorarioFormValor } from '@/features/agenda/HorarioFormSheet'
import { nomeDiaCurtoPorWeekday } from '@/lib/datas'
import { CobrancaBlock } from '@/features/financeiro/CobrancaBlock'
import { CobrancaForm, valorInicialCobranca, type CobrancaFormValor } from '@/features/financeiro/CobrancaForm'
import { useSalvarAlunoCobranca } from '@/features/financeiro/api'
import { BotaoWhatsApp } from '@/components/BotaoWhatsApp'
import { linkWhatsApp } from '@/lib/whatsapp'

const numOrUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v))

const schema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    birth_date: z.string().optional(),
    sex: z.enum(['M', 'F', 'outro']).optional(),
    height_cm: z.preprocess(numOrUndef, z.number().int().min(50, 'Altura inválida').max(250, 'Altura inválida').optional()),
    weight_kg: z.preprocess(numOrUndef, z.number().positive('Peso inválido').optional()),
    phone: z.string().optional(),
    email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email('E-mail inválido').optional()),

    objetivos: z.array(z.string()),
    objetivo_notes: z.string().optional(),

    lgpd_consent: z.boolean(),

    injury: z.boolean().optional(),
    injury_regions: z.array(z.string()),
    injury_notes: z.string().optional(),

    surgery: z.boolean().optional(),
    surgery_regions: z.array(z.string()),
    surgery_notes: z.string().optional(),

    practices_sport: z.boolean().optional(),
    sports: z.array(z.string()),
    sport_name: z.string().optional(),

    medications_flag: z.boolean().optional(),
    medications: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.objetivos.includes('Outros') && !val.objetivo_notes?.trim())
      ctx.addIssue({ code: 'custom', path: ['objetivo_notes'], message: 'Descreva o objetivo' })
    if (val.lgpd_consent) {
      if (val.injury === undefined) ctx.addIssue({ code: 'custom', path: ['injury'], message: 'Responda todas as perguntas de saúde' })
      if (val.surgery === undefined) ctx.addIssue({ code: 'custom', path: ['surgery'], message: 'Responda todas as perguntas de saúde' })
      if (val.practices_sport === undefined)
        ctx.addIssue({ code: 'custom', path: ['practices_sport'], message: 'Responda todas as perguntas de saúde' })
      if (val.medications_flag === undefined)
        ctx.addIssue({ code: 'custom', path: ['medications_flag'], message: 'Responda todas as perguntas de saúde' })
    }
    if (val.injury) {
      if (val.injury_regions.length === 0) ctx.addIssue({ code: 'custom', path: ['injury_regions'], message: 'Selecione ao menos uma região' })
      if (val.injury_regions.includes('Outros') && !val.injury_notes?.trim())
        ctx.addIssue({ code: 'custom', path: ['injury_notes'], message: 'Descreva a lesão' })
    }
    if (val.surgery) {
      if (val.surgery_regions.length === 0) ctx.addIssue({ code: 'custom', path: ['surgery_regions'], message: 'Selecione ao menos uma região' })
      if (val.surgery_regions.includes('Outros') && !val.surgery_notes?.trim())
        ctx.addIssue({ code: 'custom', path: ['surgery_notes'], message: 'Descreva a cirurgia' })
    }
    if (val.practices_sport) {
      if (val.sports.length === 0) ctx.addIssue({ code: 'custom', path: ['sports'], message: 'Selecione ao menos um esporte' })
      if (val.sports.includes('Outros') && !val.sport_name?.trim())
        ctx.addIssue({ code: 'custom', path: ['sport_name'], message: 'Informe qual esporte' })
    }
    if (val.medications_flag && !val.medications?.trim())
      ctx.addIssue({ code: 'custom', path: ['medications'], message: 'Descreva os medicamentos' })
  })

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

const STEP1_FIELDS = ['name', 'birth_date', 'sex', 'height_cm', 'weight_kg', 'phone', 'email', 'objetivos', 'objetivo_notes'] as const
const STEP2_FIELDS = [
  'lgpd_consent',
  'injury',
  'injury_regions',
  'injury_notes',
  'surgery',
  'surgery_regions',
  'surgery_notes',
  'practices_sport',
  'sports',
  'sport_name',
  'medications_flag',
  'medications',
] as const

const ETAPAS = [
  { n: 1, label: 'Dados' },
  { n: 2, label: 'Cobrança' },
  { n: 3, label: 'Saúde' },
  { n: 4, label: 'Horários' },
  { n: 5, label: 'Revisão' },
] as const

function OptionButtons<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T | undefined
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-11 flex-1 rounded-xl border px-3 text-sm font-medium transition disabled:opacity-50',
            value === o.value ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const SIM_NAO = [
  { value: 'sim' as const, label: 'Sim' },
  { value: 'nao' as const, label: 'Não' },
]

export function AlunoFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: aluno, isLoading: alunoLoading } = useAluno(mode === 'edit' ? id : undefined)
  const { data: hadActiveConsent, isLoading: consentLoading } = useConsentimentoAtivo(mode === 'edit' ? id : undefined)
  const { data: pesos } = usePesos(mode === 'edit' ? id : undefined)
  const salvar = useSalvarAluno()
  const salvarCobranca = useSalvarAlunoCobranca()
  const { data: outrosAlunosRaw } = useAlunos()
  const { data: horariosDoPersonal } = useHorariosFixos()

  const [etapa, setEtapa] = useState(1)
  const [termoAberto, setTermoAberto] = useState(false)
  const [horariosPendentes, setHorariosPendentes] = useState<HorarioFormValor[]>([])
  const [novoHorarioAberto, setNovoHorarioAberto] = useState(false)
  const [erroHorarios, setErroHorarios] = useState<string | null>(null)
  const [cobrancaAtiva, setCobrancaAtiva] = useState(false)
  const [cobrancaValor, setCobrancaValor] = useState<CobrancaFormValor>(valorInicialCobranca())
  const [erroCobranca, setErroCobranca] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, reset, control, trigger, formState } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      objetivos: [],
      injury_regions: [],
      surgery_regions: [],
      sports: [],
      lgpd_consent: false,
    },
  })

  useEffect(() => {
    if (mode === 'edit' && aluno && !consentLoading) {
      reset({
        name: aluno.name,
        birth_date: aluno.birth_date ?? '',
        sex: aluno.sex ?? undefined,
        height_cm: aluno.height_cm ?? undefined,
        weight_kg: pesos?.[0]?.weight_kg,
        phone: aluno.phone ?? '',
        email: aluno.email ?? '',
        objetivos: aluno.objetivos,
        objetivo_notes: aluno.objetivo_notes ?? '',
        injury: aluno.injury,
        injury_regions: aluno.injury_regions,
        injury_notes: aluno.injury_notes ?? '',
        surgery: aluno.surgery,
        surgery_regions: aluno.surgery_regions,
        surgery_notes: aluno.surgery_notes ?? '',
        practices_sport: aluno.practices_sport,
        sports: aluno.sports,
        sport_name: aluno.sport_name ?? '',
        medications_flag: !!aluno.medications,
        medications: aluno.medications ?? '',
        lgpd_consent: !!hadActiveConsent,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, aluno, hadActiveConsent, consentLoading, pesos, reset])

  const birthDate = watch('birth_date')
  const sex = watch('sex')
  const objetivos = watch('objetivos')
  const lgpdConsent = watch('lgpd_consent')
  const injury = watch('injury')
  const injuryRegions = watch('injury_regions')
  const surgery = watch('surgery')
  const surgeryRegions = watch('surgery_regions')
  const practicesSport = watch('practices_sport')
  const sports = watch('sports')
  const medicationsFlag = watch('medications_flag')

  const avancar = async () => {
    if (etapa === 2) {
      const valorNum = Number(cobrancaValor.valorTexto.replace(',', '.'))
      if (cobrancaAtiva && (!cobrancaValor.valorTexto.trim() || Number.isNaN(valorNum) || valorNum <= 0)) {
        setErroCobranca('Informe um valor maior que zero')
        return
      }
      setErroCobranca(null)
      setEtapa((e) => e + 1)
      return
    }
    if (etapa === 4) {
      setEtapa((e) => e + 1)
      return
    }
    const campos = etapa === 1 ? STEP1_FIELDS : STEP2_FIELDS
    const ok = await trigger(campos as unknown as (keyof FormInput)[])
    if (ok) setEtapa((e) => Math.min(5, e + 1))
  }

  const onSubmit = async (f: FormOutput) => {
    const alunoId = await salvar.mutateAsync({
      id: mode === 'edit' ? id : undefined,
      ...f,
      injury: f.injury ?? false,
      surgery: f.surgery ?? false,
      practices_sport: f.practices_sport ?? false,
      hadActiveConsent: !!hadActiveConsent,
    })
    if (mode === 'create' && cobrancaAtiva) {
      const valorNum = Number(cobrancaValor.valorTexto.replace(',', '.'))
      if (cobrancaValor.valorTexto.trim() && !Number.isNaN(valorNum) && valorNum > 0) {
        try {
          await salvarCobranca.mutateAsync({
            aluno_id: alunoId,
            modelo: cobrancaValor.modelo,
            valor_aula: cobrancaValor.modelo === 'por_aula' ? valorNum : null,
            valor_mensal: cobrancaValor.modelo === 'mensal' ? valorNum : null,
            dia_ciclo: Number(cobrancaValor.diaCicloTexto) || 1,
            dias_vencimento: Number(cobrancaValor.diasVencimentoTexto) || 0,
          })
        } catch (e) {
          setErroCobranca(`Aluno salvo, mas houve um erro ao salvar a cobrança: ${(e as Error).message}`)
        }
      }
    }
    if (mode === 'create' && horariosPendentes.length > 0) {
      try {
        for (const h of horariosPendentes) {
          await criarHorariosFixos({
            weekdays: h.weekdays,
            start_time: h.start_time,
            duration_min: h.duration_min,
            local: h.local.trim() || null,
            alunoIds: [alunoId, ...h.coParticipantesIds],
          })
        }
      } catch (e) {
        setErroHorarios(`Aluno salvo, mas houve um erro ao criar os horários: ${(e as Error).message}`)
      }
    }
    navigate(`/alunos/${alunoId}`)
  }

  const outrosAlunos = (outrosAlunosRaw ?? [])
    .filter((a) => a.id !== id)
    .map((a) => ({ id: a.id, name: a.name, birth_date: a.birth_date, phone: a.phone }))

  const salvarHorarioPendente = (v: HorarioFormValor) => {
    setHorariosPendentes((atual) => [...atual, v])
    setNovoHorarioAberto(false)
  }

  if (mode === 'edit' && (alunoLoading || consentLoading)) {
    return <p className="p-4 text-slate-500">Carregando…</p>
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-28">
      <header className="mb-4 flex items-center gap-3">
        <Link
          to={mode === 'edit' ? `/alunos/${id}` : '/alunos'}
          className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">{mode === 'edit' ? 'Editar aluno' : 'Novo aluno'}</h1>
      </header>

      <div className="mb-4 flex gap-2">
        {ETAPAS.map((e) => (
          <button
            key={e.n}
            type="button"
            disabled={mode === 'create' && e.n > etapa}
            onClick={() => setEtapa(e.n)}
            className="flex-1 space-y-1.5 text-left disabled:cursor-default"
          >
            <div className={cn('h-1.5 rounded-full', e.n <= etapa ? 'bg-brand' : 'bg-slate-200')} />
            <span className={cn('text-xs font-medium', e.n === etapa ? 'text-slate-900' : 'text-slate-400')}>
              {e.n}. {e.label}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        {etapa === 1 && (
          <>
            <Field label="Nome" error={formState.errors.name?.message}>
              <Input {...register('name')} autoComplete="name" autoFocus />
            </Field>

            <Field label={`Data de nascimento${idade(birthDate ?? null) != null ? ` · ${idade(birthDate ?? null)} anos` : ''}`}>
              <Input type="date" {...register('birth_date')} />
            </Field>

            <Field label="Sexo">
              <OptionButtons
                value={sex}
                onChange={(v) => setValue('sex', v)}
                options={[
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Feminino' },
                  { value: 'outro', label: 'Outro' },
                ]}
              />
            </Field>

            <div className="flex gap-2">
              <Field label="Altura (cm)" error={formState.errors.height_cm?.message}>
                <Input type="number" inputMode="numeric" {...register('height_cm')} />
              </Field>
              <Field label="Peso (kg)" error={formState.errors.weight_kg?.message}>
                <Input type="number" step="0.1" inputMode="decimal" {...register('weight_kg')} />
              </Field>
            </div>

            <Field label="Telefone">
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <div className="relative">
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="(21) 99999-9999"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(formatarTelefone(e.target.value))}
                      className={linkWhatsApp(field.value) ? 'pr-12' : undefined}
                    />
                    <BotaoWhatsApp telefone={field.value} className="absolute right-0 top-1/2 -translate-y-1/2" />
                  </div>
                )}
              />
            </Field>

            <Field label="E-mail" error={formState.errors.email?.message}>
              <Input type="email" {...register('email')} autoComplete="email" />
            </Field>

            <Field label="Objetivos" error={formState.errors.objetivos?.message}>
              <ChipsMultiSelect options={OBJETIVOS} value={objetivos} onChange={(v) => setValue('objetivos', v)} />
            </Field>
            {objetivos.includes('Outros') && (
              <Field label="Descreva o objetivo" error={formState.errors.objetivo_notes?.message}>
                <Input {...register('objetivo_notes')} placeholder="Ex.: voltar a jogar futevôlei" />
              </Field>
            )}
          </>
        )}

        {etapa === 2 &&
          (mode === 'edit' ? (
            <CobrancaBlock alunoId={id!} />
          ) : (
            <div className="space-y-4">
              <label className="flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3">
                <span className="font-medium">Definir cobrança para este aluno</span>
                <input
                  type="checkbox"
                  checked={cobrancaAtiva}
                  onChange={(e) => {
                    setCobrancaAtiva(e.target.checked)
                    if (e.target.checked) setCobrancaValor(valorInicialCobranca())
                  }}
                  className="size-5"
                />
              </label>
              {!cobrancaAtiva && <p className="text-sm text-slate-500">Opcional. Você também pode definir a cobrança depois, na ficha do aluno.</p>}
              {cobrancaAtiva && <CobrancaForm value={cobrancaValor} onChange={setCobrancaValor} />}
              {erroCobranca && <p className="text-sm text-red-600">{erroCobranca}</p>}
            </div>
          ))}

        {etapa === 3 &&
          (!lgpdConsent ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Para registrar lesões, cirurgias e medicamentos, é preciso o consentimento do aluno para o tratamento desses dados de saúde.
              </p>
              <button type="button" onClick={() => setTermoAberto(true)} className="text-sm font-medium text-brand-dark underline">
                Ler termo
              </button>
              <Button type="button" onClick={() => setValue('lgpd_consent', true)} className="w-full">
                O aluno consentiu
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                <span>Consentimento LGPD dado</span>
                <button type="button" onClick={() => setValue('lgpd_consent', false)} className="text-xs underline">
                  Desfazer
                </button>
              </div>

              <Field label="Possui lesão?">
                <OptionButtons
                  value={injury === undefined ? undefined : injury ? 'sim' : 'nao'}
                  onChange={(v) => setValue('injury', v === 'sim', { shouldValidate: true })}
                  options={SIM_NAO}
                />
              </Field>
              {injury && (
                <>
                  <Field label="Onde?" error={formState.errors.injury_regions?.message}>
                    <ChipsMultiSelect options={REGIOES_CORPO} value={injuryRegions} onChange={(v) => setValue('injury_regions', v)} />
                  </Field>
                  <Field label="Detalhes" error={formState.errors.injury_notes?.message}>
                    <Input {...register('injury_notes')} placeholder="Opcional" />
                  </Field>
                </>
              )}

              <Field label="Já fez cirurgia?">
                <OptionButtons
                  value={surgery === undefined ? undefined : surgery ? 'sim' : 'nao'}
                  onChange={(v) => setValue('surgery', v === 'sim', { shouldValidate: true })}
                  options={SIM_NAO}
                />
              </Field>
              {surgery && (
                <>
                  <Field label="Onde?" error={formState.errors.surgery_regions?.message}>
                    <ChipsMultiSelect options={REGIOES_CORPO} value={surgeryRegions} onChange={(v) => setValue('surgery_regions', v)} />
                  </Field>
                  <Field label="Detalhes" error={formState.errors.surgery_notes?.message}>
                    <Input {...register('surgery_notes')} placeholder="Opcional" />
                  </Field>
                </>
              )}

              <Field label="Pratica esporte?">
                <OptionButtons
                  value={practicesSport === undefined ? undefined : practicesSport ? 'sim' : 'nao'}
                  onChange={(v) => setValue('practices_sport', v === 'sim', { shouldValidate: true })}
                  options={SIM_NAO}
                />
              </Field>
              {practicesSport && (
                <>
                  <Field label="Qual?" error={formState.errors.sports?.message}>
                    <ChipsMultiSelect options={ESPORTES} value={sports} onChange={(v) => setValue('sports', v)} />
                  </Field>
                  {sports.includes('Outros') && (
                    <Field label="Qual esporte?" error={formState.errors.sport_name?.message}>
                      <Input {...register('sport_name')} />
                    </Field>
                  )}
                </>
              )}

              <Field label="Usa medicamentos?">
                <OptionButtons
                  value={medicationsFlag === undefined ? undefined : medicationsFlag ? 'sim' : 'nao'}
                  onChange={(v) => {
                    setValue('medications_flag', v === 'sim', { shouldValidate: true })
                    if (v === 'nao') setValue('medications', '')
                  }}
                  options={SIM_NAO}
                />
              </Field>
              {medicationsFlag && (
                <Field label="Quais?" error={formState.errors.medications?.message}>
                  <textarea
                    className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
                    {...register('medications')}
                  />
                </Field>
              )}

              {(formState.errors.injury || formState.errors.surgery || formState.errors.practices_sport || formState.errors.medications_flag) && (
                <p className="text-sm text-red-600">Responda todas as perguntas de saúde para continuar.</p>
              )}
            </div>
          ))}

        {etapa === 4 &&
          (mode === 'edit' ? (
            <HorariosFixosBlock alunoId={id!} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Opcional. Você também pode adicionar horários fixos depois, na ficha do aluno.</p>
              {horariosPendentes.length === 0 && <p className="text-sm text-slate-400">Nenhum horário adicionado ainda.</p>}
              <ul className="space-y-2">
                {horariosPendentes.map((h, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                    <span>
                      {h.weekdays.map(nomeDiaCurtoPorWeekday).join(' e ')} · {h.start_time} · {h.duration_min} min
                      {h.local && ` · ${h.local}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHorariosPendentes((atual) => atual.filter((_, idx) => idx !== i))}
                      className="text-xs font-medium text-red-600"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="ghost" onClick={() => setNovoHorarioAberto(true)} className="w-full border border-dashed border-slate-300">
                + Adicionar horário
              </Button>
              {erroHorarios && <p className="text-sm text-red-600">{erroHorarios}</p>}

              <HorarioFormSheet
                open={novoHorarioAberto}
                onClose={() => setNovoHorarioAberto(false)}
                title="Novo horário fixo"
                outrosAlunos={outrosAlunos}
                outrosHorarios={horariosDoPersonal}
                onSalvar={salvarHorarioPendente}
              />
            </div>
          ))}

        {etapa === 5 && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Dados</h2>
                <button type="button" onClick={() => setEtapa(1)} className="flex items-center gap-1 text-sm text-brand-dark">
                  <Pencil size={14} /> Editar
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-slate-500">Nome</dt>
                <dd>{watch('name') || '—'}</dd>
                <dt className="text-slate-500">Nascimento</dt>
                <dd>{formatarDataBR(watch('birth_date'))}</dd>
                <dt className="text-slate-500">Sexo</dt>
                <dd>{formatarSexo(sex)}</dd>
                <dt className="text-slate-500">Altura</dt>
                <dd>{watch('height_cm') ? `${formatarNumero(watch('height_cm') as number)} cm` : '—'}</dd>
                <dt className="text-slate-500">Peso</dt>
                <dd>{watch('weight_kg') ? formatarPesoKg(watch('weight_kg') as number) : '—'}</dd>
                <dt className="text-slate-500">Telefone</dt>
                <dd>{watch('phone') || '—'}</dd>
                <dt className="text-slate-500">E-mail</dt>
                <dd className="truncate">{(watch('email') as string) || '—'}</dd>
                <dt className="text-slate-500">Objetivos</dt>
                <dd>
                  {objetivos.length > 0
                    ? objetivos.map((o) => (o === 'Outros' ? watch('objetivo_notes') || 'Outros' : o)).join(', ')
                    : '—'}
                </dd>
              </dl>
            </div>

            {mode === 'create' && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Cobrança</h2>
                  <button type="button" onClick={() => setEtapa(2)} className="flex items-center gap-1 text-sm text-brand-dark">
                    <Pencil size={14} /> Editar
                  </button>
                </div>
                <p className="text-sm">
                  {cobrancaAtiva
                    ? `${cobrancaValor.modelo === 'por_aula' ? 'Por aula' : 'Mensal'} · R$ ${cobrancaValor.valorTexto || '0'}`
                    : 'Sem valor definido'}
                </p>
              </div>
            )}

            <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Saúde</h2>
                <button type="button" onClick={() => setEtapa(3)} className="flex items-center gap-1 text-sm text-brand-dark">
                  <Pencil size={14} /> Editar
                </button>
              </div>
              <dl className="space-y-1 text-sm">
                <p>
                  <span className="text-slate-500">Consentimento LGPD: </span>
                  {lgpdConsent ? 'Sim' : 'Não'}
                </p>
                <p>
                  <span className="text-slate-500">Lesão: </span>
                  {injury ? injuryRegions.join(', ') || 'Sim' : 'Não'}
                </p>
                <p>
                  <span className="text-slate-500">Cirurgia: </span>
                  {surgery ? surgeryRegions.join(', ') || 'Sim' : 'Não'}
                </p>
                <p>
                  <span className="text-slate-500">Esportes: </span>
                  {practicesSport ? sports.join(', ') || 'Sim' : 'Não'}
                </p>
                <p>
                  <span className="text-slate-500">Medicamentos: </span>
                  {medicationsFlag ? watch('medications') || 'Sim' : 'Não'}
                </p>
              </dl>
            </div>

            {salvar.error && <p className="text-sm text-red-600">{(salvar.error as Error).message}</p>}
          </div>
        )}
      </form>

      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-slate-200 bg-white p-3">
        <div className="mx-auto flex max-w-2xl gap-2">
          {etapa > 1 && (
            <Button type="button" variant="ghost" onClick={() => setEtapa((e) => e - 1)} className="flex-1">
              Voltar
            </Button>
          )}
          {etapa < 5 ? (
            <Button type="button" onClick={avancar} className="flex-1">
              Continuar
            </Button>
          ) : (
            <Button onClick={handleSubmit(onSubmit)} className="flex-1" disabled={formState.isSubmitting}>
              Salvar aluno
            </Button>
          )}
        </div>
      </div>

      <BottomSheet open={termoAberto} onClose={() => setTermoAberto(false)} title="Termo de consentimento">
        <div className="space-y-3">
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{TERMO_AVISO}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{TERMO_TEXTO}</p>
        </div>
      </BottomSheet>
    </div>
  )
}
