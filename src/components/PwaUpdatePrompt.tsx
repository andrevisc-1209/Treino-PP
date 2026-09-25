import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()

  if (!needRefresh[0]) return null

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
      <span>Nova versão disponível</span>
      <button onClick={() => updateServiceWorker(true)} className="font-semibold text-brand">
        Atualizar
      </button>
    </div>
  )
}
