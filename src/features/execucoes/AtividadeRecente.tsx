import { useState } from 'react'
import { Quote } from 'lucide-react'
import { BottomSheet } from '@/components/ui'
import { MODALIDADES_CONFIG } from '@/types/modalidades'
import { useAtividadeRecente, type AtividadeRecente as Item } from './api'
import { tempoRelativo } from './metricas'

/** Feed das últimas execuções de todos os alunos (treinos concluídos pelo link ou registrados na aula). */
export function AtividadeRecente() {
  const { data } = useAtividadeRecente(10)
  const [nota, setNota] = useState<Item | null>(null)

  if (!data || data.length === 0) return null

  return (
    <section className="mb-4 space-y-2" aria-labelledby="atividade-recente">
      <h2 id="atividade-recente" className="text-sm font-semibold text-slate-600">
        Atividade recente
      </h2>
      <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
        {data.map((a) => {
          const cfg = MODALIDADES_CONFIG[a.modalidade]
          return (
            <li key={a.id} className="flex items-center gap-2 px-4 py-3">
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{a.aluno?.name ?? 'Aluno'}</span>
                <span className="text-slate-600">
                  {' '}
                  · {cfg.emoji} {a.plano_nome ?? cfg.label}
                </span>
                <span className="block text-xs text-slate-500">{tempoRelativo(a.concluido_em)}</span>
              </p>
              {a.notas_aluno && (
                <button
                  type="button"
                  onClick={() => setNota(a)}
                  aria-label={`Ler observação de ${a.aluno?.name ?? 'aluno'}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                >
                  <Quote size={18} />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <BottomSheet open={!!nota} onClose={() => setNota(null)} title={nota?.aluno?.name ?? 'Observação'}>
        {nota && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {MODALIDADES_CONFIG[nota.modalidade].emoji} {nota.plano_nome ?? MODALIDADES_CONFIG[nota.modalidade].label} · {tempoRelativo(nota.concluido_em)}
            </p>
            <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{nota.notas_aluno}</p>
          </div>
        )}
      </BottomSheet>
    </section>
  )
}
