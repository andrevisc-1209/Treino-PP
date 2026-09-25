import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui'

const DISMISSED_KEY = 'treino_install_banner_dismissed'

function lerDispensado(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function marcarDispensado() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // localStorage indisponível (modo privado, por exemplo) — apenas ignora
  }
}

function rodandoStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function ehIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallBanner() {
  const [visivel, setVisivel] = useState(() => !lerDispensado() && !rodandoStandalone())
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (!visivel) return
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [visivel])

  const fechar = () => {
    marcarDispensado()
    setVisivel(false)
  }

  const instalar = async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const escolha = await promptEvent.userChoice
    if (escolha.outcome === 'accepted') fechar()
  }

  if (!visivel) return null

  return (
    <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">Instale o app na tela inicial</p>
        <button onClick={fechar} aria-label="Fechar aviso" className="flex size-6 shrink-0 items-center justify-center text-slate-400">
          <X size={16} />
        </button>
      </div>

      {promptEvent ? (
        <Button onClick={instalar} className="mt-2 w-full">
          <Download size={16} /> Instalar
        </Button>
      ) : ehIOS() ? (
        <p className="mt-1 text-sm text-slate-500">Toque em Compartilhar → Adicionar à Tela de Início.</p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Use o menu do navegador para instalar o app.</p>
      )}
    </div>
  )
}
