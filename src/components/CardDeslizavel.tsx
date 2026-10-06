import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type AcaoDeslize = { label: string; icone: ReactNode; classe: string; onClick: () => void }

const LARGURA_ACAO = 76
const LIMIAR_ARRASTE = 8

/**
 * Card que desliza pra esquerda e revela ações rápidas. É um atalho: toda ação continua disponível
 * por um caminho sem gesto (o menu ⋮ do card). Rolagem vertical segue normal (`touch-action: pan-y`).
 */
export function CardDeslizavel({ acoes, className, children }: { acoes: AcaoDeslize[]; className?: string; children: ReactNode }) {
  const total = LARGURA_ACAO * acoes.length
  const [offset, setOffset] = useState(0)
  const [arrastando, setArrastando] = useState(false)
  const inicio = useRef<{ x: number; y: number; base: number } | null>(null)
  const moveu = useRef(false)
  const aberto = offset <= -total / 2

  const aoPressionar = (e: React.PointerEvent) => {
    inicio.current = { x: e.clientX, y: e.clientY, base: offset }
    moveu.current = false
  }

  const aoMover = (e: React.PointerEvent) => {
    const i = inicio.current
    if (!i) return
    const dx = e.clientX - i.x
    const dy = e.clientY - i.y
    if (!moveu.current) {
      if (Math.abs(dx) < LIMIAR_ARRASTE || Math.abs(dx) < Math.abs(dy)) return
      moveu.current = true
      setArrastando(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    setOffset(Math.max(-total, Math.min(0, i.base + dx)))
  }

  const aoSoltar = () => {
    if (!inicio.current) return
    inicio.current = null
    setArrastando(false)
    if (moveu.current) setOffset((o) => (o <= -total / 2 ? -total : 0))
  }

  // Depois de arrastar, o "click" que o navegador dispara no link não pode navegar; com o card aberto, tocar nele só fecha.
  const aoClicarCapture = (e: React.MouseEvent) => {
    if (moveu.current || offset !== 0) {
      e.preventDefault()
      e.stopPropagation()
      if (!moveu.current) setOffset(0)
      moveu.current = false
    }
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      <div className="absolute inset-y-0 right-0 flex" style={{ width: total }} aria-hidden={!aberto}>
        {acoes.map((a) => (
          <button
            key={a.label}
            type="button"
            tabIndex={aberto ? 0 : -1}
            onClick={() => {
              setOffset(0)
              a.onClick()
            }}
            className={cn('flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-white', a.classe)}
            style={{ width: LARGURA_ACAO }}
          >
            {a.icone}
            {a.label}
          </button>
        ))}
      </div>
      <div
        className={cn('relative bg-white shadow-sm', !arrastando && 'transition-transform duration-200')}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onClickCapture={aoClicarCapture}
      >
        {children}
      </div>
    </div>
  )
}
