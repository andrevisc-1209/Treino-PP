import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

function estaOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine
}

type Ouvinte = (offline: boolean) => void
const ouvintes = new Set<Ouvinte>()

/**
 * navigator.onLine só reflete a interface de rede, não se o servidor é
 * alcançável (ex.: wifi da academia conectado mas sem internet de fato).
 * Chamado pelo mutationCache.onError quando o erro parece de rede, pra
 * cobrir esse caso também.
 */
export function marcarFalhaDeRede() {
  ouvintes.forEach((fn) => fn(true))
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(() => !estaOnline())

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const ouvinte: Ouvinte = (v) => setOffline(v)
    ouvintes.add(ouvinte)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      ouvintes.delete(ouvinte)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-slate-900 px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-sm font-medium text-white"
    >
      <WifiOff size={16} />
      Sem conexão. Algumas ações podem falhar.
    </div>
  )
}
