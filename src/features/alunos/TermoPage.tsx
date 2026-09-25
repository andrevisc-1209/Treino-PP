import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TERMO_AVISO, TERMO_TEXTO } from './termo'

export function TermoPage() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/alunos" className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Termo de consentimento</h1>
      </header>

      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{TERMO_AVISO}</p>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{TERMO_TEXTO}</p>
      </div>
    </div>
  )
}
