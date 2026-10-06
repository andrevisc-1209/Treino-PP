import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'

/** Engrenagem no canto superior direito das telas principais — leva a Configurações (ex-aba "Perfil"). */
export function LinkConfiguracoes() {
  return (
    <Link
      to="/configuracoes"
      aria-label="Configurações"
      className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100"
    >
      <Settings size={22} />
    </Link>
  )
}
