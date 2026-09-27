import { useEffect, useId, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          size?: 'normal' | 'compact'
          appearance?: 'always' | 'execute' | 'interaction-only'
        },
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
let carregando: Promise<void> | null = null

function carregarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (carregando) return carregando
  carregando = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar o Turnstile'))
    document.head.appendChild(script)
  })
  return carregando
}

/**
 * Widget do Cloudflare Turnstile. Some sem quebrar nada se VITE_TURNSTILE_SITE_KEY
 * não estiver definida (os fluxos de auth funcionam sem captcha em dev) — ver
 * README. `compact` por padrão em todos os formulários de auth pra não dominar a
 * tela; passe `size="normal"` explicitamente se algum caller futuro precisar do
 * widget maior.
 */
export function Turnstile({ onToken, size = 'compact' }: { onToken: (token: string) => void; size?: 'normal' | 'compact' }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
  const containerId = useId()
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!siteKey) return
    let cancelado = false
    carregarScript().then(() => {
      if (cancelado) return
      const container = document.getElementById(containerId)
      if (!container || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: onToken,
        'expired-callback': () => onToken(''),
        size,
      })
    })
    return () => {
      cancelado = true
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current)
    }
  }, [siteKey, containerId, size, onToken])

  if (!siteKey) return null
  return <div id={containerId} />
}
