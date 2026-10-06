import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Trilho de rolagem horizontal (chips, carrossel) com sombra degradê nas bordas que indicam
 * "tem mais pra esse lado". Sem barra de rolagem visível; rolagem suave; `snap` ativa o encaixe de cards.
 * `corFundo` precisa ser a cor de fundo atrás do trilho (a sombra é um degradê dessa cor pra transparente).
 */
export function RolagemHorizontal({
  children,
  className,
  corFundo = '#f8fafc',
  snap = false,
}: {
  children: ReactNode
  className?: string
  corFundo?: string
  snap?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pode, setPode] = useState({ esquerda: false, direita: false })

  const medir = useCallback(() => {
    const el = ref.current
    if (!el) return
    setPode({ esquerda: el.scrollLeft > 4, direita: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    medir()
    const el = ref.current
    if (!el) return
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [medir, children])

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={medir}
        className={cn('flex gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', snap && 'snap-x snap-mandatory', className)}
      >
        {children}
      </div>
      {pode.esquerda && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-8"
          style={{ background: `linear-gradient(to right, ${corFundo}, transparent)` }}
        />
      )}
      {pode.direita && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8"
          style={{ background: `linear-gradient(to left, ${corFundo}, transparent)` }}
        />
      )}
    </div>
  )
}
