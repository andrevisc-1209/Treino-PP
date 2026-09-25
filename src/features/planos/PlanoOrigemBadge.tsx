import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useModelo, buscarItensComparaveisModelo } from '@/features/modelos/api'
import { itensIguais } from './compare'
import { buscarItensComparaveisPlano, useSincronizarPlanoComModelo, type Plano } from './api'

type PlanoParaBadge = Pick<Plano, 'id' | 'name' | 'modelo_origem_id'>

/** Selo "Baseado em: X · desatualizado" (+ ação de atualizar) ou "Carregar exercícios do treino planejado" quando o plano está vazio. Nada se estiver em dia ou sem origem. */
export function PlanoOrigemBadge({ plano, alunoId }: { plano: PlanoParaBadge; alunoId: string }) {
  const modeloId = plano.modelo_origem_id
  const { data: modelo } = useModelo(modeloId ?? undefined)
  const { data: itensPlano } = useQuery({
    queryKey: ['plano-exercicios-cmp', plano.id],
    queryFn: () => buscarItensComparaveisPlano(plano.id),
    enabled: !!modeloId,
  })
  const { data: itensModelo } = useQuery({
    queryKey: ['modelo-exercicios-cmp', modeloId],
    queryFn: () => buscarItensComparaveisModelo(modeloId!),
    enabled: !!modeloId,
  })
  const sincronizar = useSincronizarPlanoComModelo(alunoId)

  if (!modeloId || !modelo || !itensPlano || !itensModelo) return null

  const vazio = itensPlano.length === 0
  const igual = !vazio && itensIguais(itensPlano, itensModelo)
  if (igual) return null

  const atualizar = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!vazio && !confirm(`Atualizar "${plano.name}" com os exercícios atuais de "${modelo.name}"? Os ajustes feitos aqui serão substituídos.`)) return
    sincronizar.mutate({ planoId: plano.id, modeloId })
  }

  if (vazio) {
    return (
      <button
        onClick={atualizar}
        disabled={sincronizar.isPending}
        className="mt-1 flex items-center gap-1 text-sm font-medium text-brand-dark disabled:opacity-50"
      >
        <RefreshCw size={14} /> Carregar exercícios do treino planejado
      </button>
    )
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Baseado em: {modelo.name} · desatualizado</span>
      <button onClick={atualizar} disabled={sincronizar.isPending} className="text-xs font-medium text-brand-dark disabled:opacity-50">
        Atualizar com o treino planejado
      </button>
    </div>
  )
}
