import { ExternalLink, X } from 'lucide-react'
import { GooglePlacesAutocomplete, type LocalSelecionado } from '@/components/GooglePlacesAutocomplete'
import { mapearErroSupabase } from '@/lib/erros'
import { LOCAIS_TREINO_MAX, useAdicionarLocalTreino, useLocaisTreino, useRemoverLocalTreino } from './api'

/** Até 5 endereços de treino do aluno, escolhidos via Google Places (item 4). */
export function LocaisTreinoBlock({ alunoId }: { alunoId: string }) {
  const { data: locais } = useLocaisTreino(alunoId)
  const adicionar = useAdicionarLocalTreino(alunoId)
  const remover = useRemoverLocalTreino(alunoId)

  const atingiuLimite = (locais?.length ?? 0) >= LOCAIS_TREINO_MAX

  const handleSelecionar = (local: LocalSelecionado) => {
    if (atingiuLimite) return
    adicionar.mutate(local)
  }

  return (
    <div className="space-y-3">
      {locais && locais.length > 0 && (
        <ul className="space-y-2">
          {locais.map((l) => (
            <li key={l.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.nome}</p>
                <a
                  href={l.maps_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 truncate text-xs text-brand-hover"
                >
                  {l.endereco} <ExternalLink size={12} className="shrink-0" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => remover.mutate(l.id)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 active:bg-slate-200"
                aria-label={`Remover ${l.nome}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {atingiuLimite ? (
        <p className="text-xs text-slate-400">Limite de {LOCAIS_TREINO_MAX} locais atingido.</p>
      ) : (
        <GooglePlacesAutocomplete onSelecionar={handleSelecionar} placeholder="Buscar endereço…" />
      )}
      {adicionar.error && <p className="text-sm text-red-600">{mapearErroSupabase(adicionar.error)}</p>}
    </div>
  )
}
