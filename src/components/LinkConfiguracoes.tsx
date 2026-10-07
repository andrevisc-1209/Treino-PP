import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { SinoNotificacoes } from '@/features/notificacoes/SinoNotificacoes'

/** Ações do canto superior direito das telas principais: sino de notificações + engrenagem (leva a Configurações, ex-aba "Perfil"). */
export function LinkConfiguracoes() {
  return (
    <div className="flex shrink-0 items-center">
      <SinoNotificacoes />
      <Link
        to="/configuracoes"
        aria-label="Configurações"
        className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100"
      >
        <Settings size={22} />
      </Link>
    </div>
  )
}
