import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button, Field, Input } from '@/components/ui'
import { useAuth } from './AuthProvider'
import { buscarPerfilProfissional } from './api'
import { PerfilObrigatorioForm } from './PerfilObrigatorioForm'
import { mapearErroAuth } from '@/lib/errosAuth'

const schema = z
  .object({
    senha: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: 'As senhas não coincidem', path: ['confirmacao'] })

type Form = z.infer<typeof schema>

export function DefinirSenhaPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) })
  const [erro, setErro] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<'senha' | 'perfil'>('senha')
  const [nomeInicial, setNomeInicial] = useState('')

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />

  const onSubmit = async (f: Form) => {
    setErro(null)
    const { error } = await supabase.auth.updateUser({ password: f.senha })
    if (error) {
      setErro(mapearErroAuth(error))
      return
    }
    const perfil = await buscarPerfilProfissional(session.user.id).catch(() => null)
    if (perfil && perfil.name.trim() && perfil.cpf && perfil.phone) {
      navigate('/', { replace: true })
    } else {
      setNomeInicial(perfil?.name.trim() ?? '')
      setEtapa('perfil')
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold">{etapa === 'senha' ? 'Crie sua senha' : 'Complete seu perfil'}</h1>
          <p className="text-sm text-slate-500">
            {etapa === 'senha' ? 'Defina a senha de acesso ao Treino.' : 'Só mais um passo antes de começar.'}
          </p>
        </div>

        {etapa === 'senha' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Senha" error={formState.errors.senha?.message}>
              <Input type="password" {...register('senha')} autoComplete="new-password" autoFocus />
            </Field>
            <Field label="Confirme a senha" error={formState.errors.confirmacao?.message}>
              <Input type="password" {...register('confirmacao')} autoComplete="new-password" />
            </Field>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
              Continuar
            </Button>
          </form>
        ) : (
          <PerfilObrigatorioForm userId={session.user.id} nomeInicial={nomeInicial} onConcluido={() => navigate('/', { replace: true })} />
        )}
      </div>
    </div>
  )
}
