import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { Button, Field, Input } from '@/components/ui'
import { APP_NAME, APP_URL } from '@/config/app'
import { Turnstile } from '@/components/Turnstile'
import { TERMOS_USO_VERSAO, PRIVACIDADE_VERSAO } from '@/features/legal/textos'
import { mapearErroAuth } from '@/lib/errosAuth'
import { mostrarInfoGlobal } from '@/components/Toast'
import { SocialLoginButtons } from '@/components/SocialLoginButtons'
import { mascararCPF, validarCPF } from '@/lib/cpf'
import { mascararTelefone, validarTelefone } from '@/lib/telefone'
import iconMark from '@/assets/brand/icon-mark.png'

const ALLOW_SIGNUP = import.meta.env.VITE_ALLOW_SIGNUP === 'true'
const REENVIO_ESPERA_SEGUNDOS = 60

function buildSchema(mode: 'login' | 'signup' | 'recuperar') {
  const base = z.object({
    name: mode === 'signup' ? z.string().min(1, 'Nome é obrigatório') : z.string().optional(),
    email: z.string().email('E-mail inválido'),
    password:
      mode === 'signup'
        ? z
            .string()
            .min(8, 'Mínimo 8 caracteres')
            .regex(/[A-Z]/, 'Precisa de 1 letra maiúscula')
            .regex(/[0-9]/, 'Precisa de 1 número')
            .regex(/[^A-Za-z0-9]/, 'Precisa de 1 símbolo')
        : z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string().optional(),
    cpf: mode === 'signup' ? z.string().refine(validarCPF, 'CPF inválido') : z.string().optional(),
    phone: mode === 'signup' ? z.string().refine(validarTelefone, 'Telefone inválido') : z.string().optional(),
    whatsappOptIn: z.boolean().optional(),
    termosAceitos:
      mode === 'signup'
        ? z.boolean().refine((v) => v === true, { message: 'Você precisa aceitar os Termos de Uso e a Política de Privacidade' })
        : z.boolean().optional(),
  })
  return base.refine((d) => mode !== 'signup' || d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
}
type Form = z.infer<ReturnType<typeof buildSchema>>

const schemaRecuperar = z.object({ email: z.string().email('E-mail inválido') })
type FormRecuperar = z.infer<typeof schemaRecuperar>

export function LoginPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup' | 'recuperar'>('login')
  const [msg, setMsg] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [emailPendente, setEmailPendente] = useState<string | null>(null)
  const [emailPendenteOrigem, setEmailPendenteOrigem] = useState<'signup' | 'login'>('signup')
  const [reenviando, setReenviando] = useState(false)
  const [esperaReenvio, setEsperaReenvio] = useState(0)

  const { register, handleSubmit, formState, setValue, watch, trigger } = useForm<Form>({
    resolver: zodResolver(buildSchema(mode)),
    defaultValues: { termosAceitos: false },
  })
  const recuperarForm = useForm<FormRecuperar>({ resolver: zodResolver(schemaRecuperar) })
  const termosAceitos = watch('termosAceitos')
  const whatsappOptIn = watch('whatsappOptIn')
  const cpfValor = watch('cpf')
  const phoneValor = watch('phone')

  useEffect(() => {
    if (esperaReenvio <= 0) return
    const t = setTimeout(() => setEsperaReenvio((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [esperaReenvio])

  if (session) return <Navigate to="/" replace />

  if (emailPendente) {
    const reenviar = async () => {
      setReenviando(true)
      setMsg(null)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailPendente,
        options: { captchaToken: captchaToken || undefined },
      })
      setReenviando(false)
      setCaptchaToken('')
      if (error) setMsg(mapearErroAuth(error))
      else {
        mostrarInfoGlobal('E-mail reenviado')
        setEsperaReenvio(REENVIO_ESPERA_SEGUNDOS)
      }
    }
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow">
          <img src={iconMark} alt="Personal Perto" className="mx-auto h-12 w-auto" />
          <h1 className="text-xl font-bold">Confirme seu e-mail</h1>
          <p className="text-sm text-slate-600">
            {emailPendenteOrigem === 'login'
              ? `Confirme seu e-mail antes de entrar. Enviamos um link para ${emailPendente}.`
              : `Enviamos um link de confirmação para ${emailPendente}. Abra o e-mail e clique no link pra ativar sua conta.`}
          </p>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <div className="flex justify-center">
            <Turnstile onToken={setCaptchaToken} />
          </div>
          <Button onClick={reenviar} variant="outline" className="w-full" disabled={reenviando || esperaReenvio > 0}>
            {esperaReenvio > 0
              ? `Reenviar e-mail de confirmação (${esperaReenvio}s)`
              : reenviando
                ? 'Reenviando…'
                : 'Reenviar e-mail de confirmação'}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-slate-500"
            onClick={() => {
              setEmailPendente(null)
              setMode('login')
              setMsg(null)
            }}
          >
            Voltar para o login
          </button>
        </div>
      </div>
    )
  }

  const onSubmit = async (f: Form) => {
    setMsg(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: f.email,
        password: f.password,
        options: { captchaToken: captchaToken || undefined },
      })
      setCaptchaToken('')
      if (error) {
        if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
          setEmailPendenteOrigem('login')
          setEmailPendente(f.email)
        } else {
          setMsg(mapearErroAuth(error))
        }
      }
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: {
        data: {
          name: f.name ?? '',
          cpf: (f.cpf ?? '').replace(/\D/g, ''),
          phone: (f.phone ?? '').replace(/\D/g, ''),
          whatsapp_opt_in: f.whatsappOptIn ?? false,
          termos_versao: TERMOS_USO_VERSAO,
          privacidade_versao: PRIVACIDADE_VERSAO,
        },
        emailRedirectTo: APP_URL,
        captchaToken: captchaToken || undefined,
      },
    })
    setCaptchaToken('')
    if (error) {
      setMsg(mapearErroAuth(error))
      return
    }
    if (!data.session) {
      // Projeto exige confirmação de e-mail — o AuthProvider ainda não tem sessão,
      // então o guard de "session" no topo deste componente não redireciona sozinho.
      setEmailPendenteOrigem('signup')
      setEmailPendente(f.email)
    }
    // Se já veio sessão (confirmação de e-mail desligada no projeto), o
    // AuthProvider atualiza e o guard acima redireciona pra "/" sozinho.
  }

  const onSubmitRecuperar = async (f: FormRecuperar) => {
    setMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(f.email, {
      redirectTo: APP_URL + 'definir-senha',
      captchaToken: captchaToken || undefined,
    })
    setCaptchaToken('')
    if (error) setMsg(mapearErroAuth(error))
    else setMsg('Se o e-mail existir, enviamos um link para redefinir a senha.')
  }

  if (mode === 'recuperar') {
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <form onSubmit={recuperarForm.handleSubmit(onSubmitRecuperar)} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
          <div>
            <h1 className="text-2xl font-bold">Recuperar senha</h1>
            <p className="text-sm text-slate-500">Informe seu e-mail para receber o link de redefinição.</p>
          </div>
          <Field label="E-mail" error={recuperarForm.formState.errors.email?.message}>
            <Input type="email" {...recuperarForm.register('email')} autoComplete="email" autoFocus />
          </Field>
          <div className="flex justify-center">
            <Turnstile onToken={setCaptchaToken} />
          </div>
          {msg && <p className="text-sm text-slate-600">{msg}</p>}
          <Button type="submit" className="w-full" disabled={recuperarForm.formState.isSubmitting}>
            Enviar link
          </Button>
          <button
            type="button"
            className="w-full text-sm text-brand-hover"
            onClick={() => {
              setMode('login')
              setMsg(null)
            }}
          >
            Voltar para o login
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div className="text-center">
          <img src={iconMark} alt="Personal Perto" className="mx-auto h-12 w-auto" />
          <h1 className="mt-2 text-xl font-bold">{APP_NAME}</h1>
          <p className="text-sm text-slate-500">Assistente do personal</p>
        </div>
        {mode === 'signup' && (
          <>
            <Field label="Nome" error={formState.errors.name?.message}>
              <Input {...register('name')} autoComplete="name" autoFocus />
            </Field>
            <Field label="CPF" error={formState.errors.cpf?.message}>
              <Input
                value={cpfValor ?? ''}
                onChange={(e) => setValue('cpf', mascararCPF(e.target.value), { shouldValidate: true })}
                onBlur={() => trigger('cpf')}
                inputMode="numeric"
                placeholder="000.000.000-00"
                className={formState.errors.cpf ? 'border-red-600 focus:border-red-600' : undefined}
              />
            </Field>
            <Field label="Telefone" error={formState.errors.phone?.message}>
              <Input
                value={phoneValor ?? ''}
                onChange={(e) => setValue('phone', mascararTelefone(e.target.value), { shouldValidate: true })}
                inputMode="tel"
                placeholder="(00) 00000-0000"
              />
            </Field>
          </>
        )}
        <Field label="E-mail" error={formState.errors.email?.message}>
          <Input type="email" {...register('email')} autoComplete="email" />
        </Field>
        <Field label="Senha" error={formState.errors.password?.message}>
          <Input type="password" {...register('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </Field>
        {mode === 'signup' && (
          <Field label="Confirme a senha" error={formState.errors.confirmPassword?.message}>
            <Input type="password" {...register('confirmPassword')} autoComplete="new-password" />
          </Field>
        )}

        <SocialLoginButtons />

        {mode === 'signup' && (
          <>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-brand"
                checked={!!termosAceitos}
                onChange={(e) => setValue('termosAceitos', e.target.checked, { shouldValidate: true })}
              />
              <span className="text-sm text-slate-600">
                Li e aceito os{' '}
                <a href={`${import.meta.env.BASE_URL}termos`} target="_blank" rel="noreferrer" className="font-medium text-brand-hover underline">
                  Termos de Uso
                </a>{' '}
                e a{' '}
                <a href={`${import.meta.env.BASE_URL}privacidade`} target="_blank" rel="noreferrer" className="font-medium text-brand-hover underline">
                  Política de Privacidade
                </a>
              </span>
            </label>
            {formState.errors.termosAceitos && <p className="text-xs text-red-600">{formState.errors.termosAceitos.message}</p>}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-brand"
                checked={!!whatsappOptIn}
                onChange={(e) => setValue('whatsappOptIn', e.target.checked)}
              />
              <span className="text-sm text-slate-600">Aceito receber notificações pelo WhatsApp</span>
            </label>

            <div className="flex justify-center">
              <Turnstile onToken={setCaptchaToken} />
            </div>
          </>
        )}

        {mode === 'login' && (
          <div className="flex justify-center">
            <Turnstile onToken={setCaptchaToken} />
          </div>
        )}

        {msg && <p className="text-sm text-slate-600">{msg}</p>}
        <Button type="submit" className="w-full" disabled={formState.isSubmitting || (mode === 'signup' && !!formState.errors.cpf)}>
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </Button>

        {mode === 'login' && (
          <button type="button" className="w-full text-sm text-slate-500" onClick={() => setMode('recuperar')}>
            Esqueci minha senha
          </button>
        )}

        {ALLOW_SIGNUP && (
          <button
            type="button"
            className="w-full text-sm text-brand-hover"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setMsg(null)
            }}
          >
            {mode === 'login' ? 'Não tem conta? Criar' : 'Já tenho conta'}
          </button>
        )}
      </form>
    </div>
  )
}
