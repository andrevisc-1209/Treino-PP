import { useEffect, useId, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void }) => string
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
 * não estiver definida (cadastro funciona sem captcha em dev) — ver README.
 */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
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
      })
    })
    return () => {
      cancelado = true
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, containerId])

  if (!siteKey) return null
  return <div id={containerId} />
}
