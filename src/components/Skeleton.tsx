// Skeleton simples pra listas/fichas carregando, no lugar de só um texto
// "Carregando…" — reduz o salto de layout e dá uma pista do que vem.

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className ?? ''}`} />
}

export function ListaSkeleton({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ))}
    </div>
  )
}
