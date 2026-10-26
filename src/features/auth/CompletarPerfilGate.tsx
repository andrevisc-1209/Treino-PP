import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PaginaSkeleton } from '@/components/Skeleton'
import { buscarJaAceitouTermos, buscarPerfilProfissional } from './api'
import { perfilCompleto } from './perfilCompleto'
import { PerfilObrigatorioForm } from './PerfilObrigatorioForm'

/**
 * Trava do app autenticado: enquanto faltar nome, CPF ou telefone, mostra "Complete seu perfil" no lugar do app.
 * É o segundo passo do cadastro por e-mail (que só pede nome, e-mail e senha) e vale também para Google e convite.
 * Se a consulta falhar, deixa passar (nunca prender o personal fora do app por um erro de rede).
 */
export function CompletarPerfilGate({ userId, children }: { userId: string; children: ReactNode }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['perfil-obrigatorio', userId],
    queryFn: async () => {
      const [perfil, aceitou] = await Promise.all([buscarPerfilProfissional(userId), buscarJaAceitouTermos(userId)])
      return { perfil, aceitou }
    },
    staleTime: 5 * 60_000,
  })

  if (isLoading) return <PaginaSkeleton />
  if (!data || perfilCompleto(data.perfil)) return <>{children}</>

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold">Complete seu perfil</h1>
          <p className="text-sm text-slate-500">Só mais um passo antes de começar: telefone e CEP.</p>
        </div>
        <PerfilObrigatorioForm
          userId={userId}
          nomeInicial={data.perfil.name}
          cpfInicial={data.perfil.cpf ?? ''}
          pedirAceite={!data.aceitou}
          onConcluido={() => qc.invalidateQueries({ queryKey: ['perfil-obrigatorio', userId] })}
        />
      </div>
    </div>
  )
}
