import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, Loader2 } from 'lucide-react'

const LIMIAR_PX = 70
const MAXIMO_PX = 110

/**
 * Pull-to-refresh: puxar a tela pra baixo no topo atualiza a lista. Só toque (no PWA instalado não
 * existe o pull-to-refresh do navegador). `onAtualizar` deve devolver uma Promise que resolve quando
 * os dados terminam de recarregar. Elementos com `data-sem-puxar` (ex.: sheets) não disparam.
 */
export function PuxarParaAtualizar({ onAtualizar, children }: { onAtualizar: () => Promise<unknown>; children: ReactNode }) {
  const [distancia, setDistancia] = useState(0)
  const [atualizando, setAtualizando] = useState(false)
  const callback = useRef(onAtualizar)
  const inicioY = useRef<number | null>(null)
  const distRef = useRef(0)
  const ocupado = useRef(false)

  useEffect(() => {
    callback.current = onAtualizar
  }, [onAtualizar])

  useEffect(() => {
    const zerar = () => {
      distRef.current = 0
      setDistancia(0)
    }

    const aoTocar = (e: TouchEvent) => {
      if (ocupado.current || window.scrollY > 0 || e.touches.length !== 1) return
      if ((e.target as Element | null)?.closest?.('[data-sem-puxar]')) return
      inicioY.current = e.touches[0].clientY
    }

    const aoMover = (e: TouchEvent) => {
      if (inicioY.current == null) return
      const dy = e.touches[0].clientY - inicioY.current
      if (dy <= 0 || window.scrollY > 0) {
        if (distRef.current) zerar()
        return
      }
      const d = Math.min(MAXIMO_PX, dy * 0.5)
      distRef.current = d
      setDistancia(d)
      if (e.cancelable && d > 8) e.preventDefault()
    }

    const aoSoltar = async () => {
      if (inicioY.current == null) return
      inicioY.current = null
      if (distRef.current >= LIMIAR_PX) {
        ocupado.current = true
        setAtualizando(true)
        setDistancia(LIMIAR_PX * 0.7)
        try {
          await callback.current()
        } finally {
          ocupado.current = false
          setAtualizando(false)
          zerar()
        }
      } else {
        zerar()
      }
    }

    window.addEventListener('touchstart', aoTocar, { passive: true })
    window.addEventListener('touchmove', aoMover, { passive: false })
    window.addEventListener('touchend', aoSoltar)
    window.addEventListener('touchcancel', aoSoltar)
    return () => {
      window.removeEventListener('touchstart', aoTocar)
      window.removeEventListener('touchmove', aoMover)
      window.removeEventListener('touchend', aoSoltar)
      window.removeEventListener('touchcancel', aoSoltar)
    }
  }, [])

  const visivel = distancia > 0 || atualizando
  return (
    <>
      {visivel && (
        <div
          role="status"
          aria-label={atualizando ? 'Atualizando' : 'Puxe para atualizar'}
          className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
          style={{ transform: `translateY(${Math.max(0, distancia - 36)}px)` }}
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-white text-brand shadow-md">
            {atualizando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowDown size={18} className={distancia >= LIMIAR_PX ? 'rotate-180 transition-transform' : 'transition-transform'} />
            )}
          </div>
        </div>
      )}
      {children}
    </>
  )
}
