import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn, idade } from '@/lib/utils'
import { Button, Field, Input } from '@/components/ui'
import { useAluno, useConsentimentoAtivo, useSalvarAluno } from './api'

const numOrUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v))

const schema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    birth_date: z.string().optional(),
    sex: z.enum(['M', 'F', 'outro']).optional(),
    height_cm: z.preprocess(numOrUndef, z.number().int().min(50, 'Altura inválida').max(250, 'Altura inválida').optional()),
    phone: z.string().optional(),
    email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email('E-mail inválido').optional()),
    weight_kg: z.preprocess(numOrUndef, z.number().positive('Peso inválido').optional()),
    injury: z.boolean(),
    injury_notes: z.string().optional(),
    practices_sport: z.boolean(),
    sport_name: z.string().optional(),
    medications: z.string().optional(),
    lgpd_consent: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.injury && !val.injury_notes?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['injury_notes'], message: 'Informe onde é a lesão' })
    }
    if (val.practices_sport && !val.sport_name?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['sport_name'], message: 'Informe qual esporte' })
    }
  })

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

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

export function AlunoFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: aluno, isLoading: alunoLoading } = useAluno(mode === 'edit' ? id : undefined)
  const { data: hadActiveConsent, isLoading: consentLoading } = useConsentimentoAtivo(mode === 'edit' ? id : undefined)
  const salvar = useSalvarAluno()

  const { register, handleSubmit, watch, setValue, reset, formState } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { injury: false, practices_sport: false, lgpd_consent: false },
  })

  useEffect(() => {
    if (mode === 'edit' && aluno && !consentLoading) {
      reset({
        name: aluno.name,
        birth_date: aluno.birth_date ?? '',
        sex: aluno.sex ?? undefined,
        height_cm: aluno.height_cm ?? undefined,
        phone: aluno.phone ?? '',
        email: aluno.email ?? '',
        injury: aluno.injury,
        injury_notes: aluno.injury_notes ?? '',
        practices_sport: aluno.practices_sport,
        sport_name: aluno.sport_name ?? '',
        medications: aluno.medications ?? '',
        lgpd_consent: !!hadActiveConsent,
      })
    }
  }, [mode, aluno, hadActiveConsent, consentLoading, reset])

  const birthDate = watch('birth_date')
  const sex = watch('sex')
  const injury = watch('injury')
  const practicesSport = watch('practices_sport')
  const lgpdConsent = watch('lgpd_consent')
  const healthDisabled = !lgpdConsent

  const onSubmit = async (f: FormOutput) => {
    const alunoId = await salvar.mutateAsync({
      id: mode === 'edit' ? id : undefined,
      ...f,
      hadActiveConsent: !!hadActiveConsent,
    })
    navigate(`/alunos/${alunoId}`)
  }

  if (mode === 'edit' && (alunoLoading || consentLoading)) {
    return <p className="p-4 text-slate-500">Carregando…</p>
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to={mode === 'edit' ? `/alunos/${id}` : '/'} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">{mode === 'edit' ? 'Editar aluno' : 'Novo aluno'}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <Field label="Nome" error={formState.errors.name?.message}>
          <Input {...register('name')} autoComplete="name" />
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

        <Field label="Altura (cm)" error={formState.errors.height_cm?.message}>
          <Input type="number" inputMode="numeric" {...register('height_cm')} />
        </Field>

        <Field label="Telefone">
          <Input type="tel" {...register('phone')} autoComplete="tel" />
        </Field>

        <Field label="E-mail" error={formState.errors.email?.message}>
          <Input type="email" {...register('email')} autoComplete="email" />
        </Field>

        {mode === 'create' && (
          <Field label="Peso atual (kg)" error={formState.errors.weight_kg?.message}>
            <Input type="number" step="0.1" inputMode="decimal" {...register('weight_kg')} />
          </Field>
        )}

        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0" {...register('lgpd_consent')} />
          <span>
            O aluno autorizou o registro dos seus dados de saúde (lesão e medicamentos) para acompanhamento do treino.
          </span>
        </label>

        <Field label="Possui lesão?">
          <OptionButtons
            value={injury ? 'sim' : 'nao'}
            disabled={healthDisabled}
            onChange={(v) => setValue('injury', v === 'sim')}
            options={[
              { value: 'sim', label: 'Sim' },
              { value: 'nao', label: 'Não' },
            ]}
          />
        </Field>
        {injury && (
          <Field label="Onde?" error={formState.errors.injury_notes?.message}>
            <Input {...register('injury_notes')} disabled={healthDisabled} />
          </Field>
        )}

        <Field label="Pratica esporte?">
          <OptionButtons
            value={practicesSport ? 'sim' : 'nao'}
            onChange={(v) => setValue('practices_sport', v === 'sim')}
            options={[
              { value: 'sim', label: 'Sim' },
              { value: 'nao', label: 'Não' },
            ]}
          />
        </Field>
        {practicesSport && (
          <Field label="Qual?" error={formState.errors.sport_name?.message}>
            <Input {...register('sport_name')} />
          </Field>
        )}

        <Field label="Uso de medicamentos">
          <textarea
            className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand disabled:opacity-50"
            disabled={healthDisabled}
            {...register('medications')}
          />
        </Field>

        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          Salvar
        </Button>
        {salvar.error && <p className="text-sm text-red-600">{(salvar.error as Error).message}</p>}
      </form>
    </div>
  )
}
