import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { Button, Field, Input } from '@/components/ui'

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type Form = z.infer<typeof schema>

export function LoginPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [msg, setMsg] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) })

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (f: Form) => {
    setMsg(null)
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
        : await supabase.auth.signUp({
            email: f.email,
            password: f.password,
            options: {
              data: { name: f.name ?? '' },
              emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
            },
          })
    if (error) setMsg(error.message)
    else if (mode === 'signup') setMsg('Conta criada. Confirme o e-mail, se for pedido, e entre.')
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold">Treino</h1>
          <p className="text-sm text-slate-500">Assistente do personal</p>
        </div>
        {mode === 'signup' && (
          <Field label="Nome">
            <Input {...register('name')} autoComplete="name" />
          </Field>
        )}
        <Field label="E-mail" error={formState.errors.email?.message}>
          <Input type="email" {...register('email')} autoComplete="email" />
        </Field>
        <Field label="Senha" error={formState.errors.password?.message}>
          <Input type="password" {...register('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </Field>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-brand-dark"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Não tem conta? Criar' : 'Já tenho conta'}
        </button>
      </form>
    </div>
  )
}
