import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AVISO_MODELO_INICIAL } from './textos'

/** Página pública (sem login) de Termos de Uso / Política de Privacidade. */
export function LegalPage({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/login" className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">{titulo}</h1>
      </header>

      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{AVISO_MODELO_INICIAL}</p>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{texto}</p>
      </div>
    </div>
  )
}
