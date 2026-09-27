import { useEffect, useState } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'

// Rede de segurança global: qualquer mutation que falhe (mesmo sem onError
// próprio, ou além dele) aparece aqui. Ver mutationCache.onError em main.tsx.

type Tipo = 'erro' | 'info'
type Ouvinte = (mensagem: string, tipo: Tipo) => void
const ouvintes = new Set<Ouvinte>()

export function mostrarErroGlobal(mensagem: string) {
  ouvintes.forEach((fn) => fn(mensagem, 'erro'))
}

/** Toast neutro pra confirmações rápidas (ex.: "E-mail reenviado") — não é erro. */
export function mostrarInfoGlobal(mensagem: string) {
  ouvintes.forEach((fn) => fn(mensagem, 'info'))
}

type ToastItem = { id: number; mensagem: string; tipo: Tipo }

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const ouvinte: Ouvinte = (mensagem, tipo) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, mensagem, tipo }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
    }
    ouvintes.add(ouvinte)
    return () => {
      ouvintes.delete(ouvinte)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={
            'flex w-full max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ' +
            (t.tipo === 'erro' ? 'bg-red-600' : 'bg-slate-900')
          }
        >
          {t.tipo === 'erro' ? <TriangleAlert size={18} className="mt-0.5 shrink-0" /> : <CircleCheck size={18} className="mt-0.5 shrink-0" />}
          <span>{t.mensagem}</span>
        </div>
      ))}
    </div>
  )
}
