import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePlanos } from '@/features/planos/api'
import { Button, ScaleGrid } from '@/components/ui'
import { useIniciarSessao, type PreTreinoInput } from './api'

const PERGUNTAS: { key: keyof Omit<PreTreinoInput, 'plano_id'>; titulo: string; labels: Record<number, string> }[] = [
  { key: 'pre_sleep', titulo: 'Sono', labels: { 0: 'péssimo', 10: 'excelente' } },
  { key: 'pre_stress', titulo: 'Nível de estresse', labels: { 0: 'nenhum', 10: 'máximo' } },
  { key: 'pre_fatigue', titulo: 'Nível de fadiga', labels: { 0: 'nenhuma', 10: 'máxima' } },
  { key: 'pre_muscle_pain', titulo: 'Dor muscular', labels: { 0: 'nenhuma', 10: 'máxima' } },
]

export function NovaSessaoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: planos } = usePlanos(id)
  const iniciar = useIniciarSessao(id!)

  const [etapa, setEtapa] = useState<'plano' | 'pre-treino'>('plano')
  const [planoId, setPlanoId] = useState<string | null | undefined>(undefined)
  const [respostas, setRespostas] = useState<Partial<Record<keyof Omit<PreTreinoInput, 'plano_id'>, number>>>({})
  const [erro, setErro] = useState<string | null>(null)

  if (!id) return <Navigate to="/" replace />

  const planosAtivos = planos?.filter((p) => p.active)

  const escolherPlano = (value: string | null) => {
    setPlanoId(value)
    setEtapa('pre-treino')
  }

  const confirmar = () => {
    const completo = PERGUNTAS.every((p) => respostas[p.key] != null)
    if (!completo) {
      setErro('Responda as 4 perguntas para iniciar o treino')
      return
    }
    setErro(null)
    iniciar.mutate(
      {
        plano_id: planoId ?? null,
        pre_sleep: respostas.pre_sleep!,
        pre_stress: respostas.pre_stress!,
        pre_fatigue: respostas.pre_fatigue!,
        pre_muscle_pain: respostas.pre_muscle_pain!,
      },
      {
        onSuccess: (sessaoId) => navigate(`/alunos/${id}/sessoes/${sessaoId}`, { replace: true }),
        onError: (e) => setErro((e as Error).message),
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link
          to={etapa === 'pre-treino' ? '#' : `/alunos/${id}`}
          onClick={(e) => {
            if (etapa === 'pre-treino') {
              e.preventDefault()
              setEtapa('plano')
            }
          }}
          className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">{etapa === 'plano' ? 'Escolher plano' : 'Pré-treino'}</h1>
      </header>

      {etapa === 'plano' && (
        <div className="space-y-2">
          {planosAtivos?.map((p) => (
            <button
              key={p.id}
              onClick={() => escolherPlano(p.id)}
              className="w-full rounded-2xl bg-white p-4 text-left font-medium shadow-sm active:bg-slate-50"
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => escolherPlano(null)}
            className="w-full rounded-2xl bg-white p-4 text-left font-medium text-slate-600 shadow-sm active:bg-slate-50"
          >
            Treino livre
          </button>
        </div>
      )}

      {etapa === 'pre-treino' && (
        <div className="space-y-6">
          {PERGUNTAS.map((p) => (
            <div key={p.key} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="font-semibold">{p.titulo}</h2>
              <ScaleGrid value={respostas[p.key] ?? null} onChange={(v) => setRespostas((r) => ({ ...r, [p.key]: v }))} labels={p.labels} />
            </div>
          ))}
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={confirmar} className="w-full" disabled={iniciar.isPending}>
            Iniciar treino
          </Button>
        </div>
      )}
    </div>
  )
}
