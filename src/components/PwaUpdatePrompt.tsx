import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { deveVerificarAgora, guardarAplicadorSW, guardarRegistroSW, verificarNovaVersaoDoApp } from '@/lib/atualizacaoApp'

const A_CADA_MS = 60 * 60_000

export function PwaUpdatePrompt() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    // o registro fica guardado para "puxar para atualizar" e para o botão de Configurações poderem pedir a verificação
    onRegisteredSW(_url, registro) {
      guardarRegistroSW(registro)
    },
  })

  useEffect(() => {
    guardarAplicadorSW(updateServiceWorker)
    return () => guardarAplicadorSW(undefined)
  }, [updateServiceWorker])

  // O app instalado passa dias em segundo plano sem recarregar: ao voltar para ele (e de hora em hora enquanto aberto), pergunta se há versão
  // nova. Se houver, o aviso "Nova versão disponível" abaixo aparece sozinho.
  useEffect(() => {
    let ultima: number | null = null
    const verificar = () => {
      if (document.visibilityState !== 'visible' || !deveVerificarAgora(ultima, Date.now())) return
      ultima = Date.now()
      void verificarNovaVersaoDoApp()
    }
    document.addEventListener('visibilitychange', verificar)
    const t = setInterval(verificar, A_CADA_MS)
    return () => {
      document.removeEventListener('visibilitychange', verificar)
      clearInterval(t)
    }
  }, [])

  if (!needRefresh[0]) return null

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
      <span>Nova versão disponível</span>
      <button type="button" onClick={() => updateServiceWorker(true)} className="min-h-11 px-2 font-semibold text-brand">
        Atualizar
      </button>
    </div>
  )
}
