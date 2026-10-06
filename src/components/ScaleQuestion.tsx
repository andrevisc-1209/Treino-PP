import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Descritor } from '@/features/sessoes/descritores'

// Rampa de 5 cores: ruim → bom (vermelho → verde). Para perguntas de
// polaridade negativa (alto = ruim) a rampa é percorrida ao contrário.
const RAMPA = ['#e34948', '#eb6834', '#eda100', '#1baf7a', '#008300']

// Distância mínima (px) que o ponteiro precisa se mover antes de um toque
// virar "arraste" — abaixo disso é considerado um tap estático e não muda
// o valor (pedido explícito: não reagir a qualquer tap simples).
const LIMIAR_ARRASTE_PX = 8

function corDoValor(valor: number, polaridade: 'positiva' | 'negativa'): string {
  const passo = Math.min(4, Math.floor(valor / 2.2))
  const indice = polaridade === 'positiva' ? passo : 4 - passo
  return RAMPA[indice]
}

/** Gradiente fixo do início ao fim da barra — já vai na ordem certa pra cada polaridade. */
function gradienteDaBarra(polaridade: 'positiva' | 'negativa'): string {
  const cores = polaridade === 'positiva' ? RAMPA : [...RAMPA].reverse()
  return `linear-gradient(to right, ${cores.join(', ')})`
}

function valorNaPosicao(clientX: number, track: HTMLDivElement): number {
  const rect = track.getBoundingClientRect()
  const fracao = (clientX - rect.left) / rect.width
  return Math.round(Math.min(1, Math.max(0, fracao)) * 10)
}

export function ScaleQuestion({
  titulo,
  subtitulo,
  descritores,
  polaridade,
  value,
  onChange,
  chips,
}: {
  titulo: string
  subtitulo?: string
  descritores: Descritor[]
  polaridade: 'positiva' | 'negativa'
  value: number | null
  onChange: (v: number) => void
  /** Atalhos de seleção rápida abaixo da barra; arrastar a barra para outro valor desmarca. */
  chips?: { valor: number; label: string }[]
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const inicioRef = useRef<{ x: number; y: number; arrastando: boolean } | null>(null)
  const arrastoRef = useRef<number | null>(null)
  const [arrastando, setArrastando] = useState(false)
  // Valor "ao vivo" só durante o arraste em curso — onChange (que dispara o
  // avanço automático de pergunta no NovaSessaoPage) só é chamado UMA vez,
  // no pointerup. Chamar onChange em todo pointermove (como numa primeira
  // versão) disparava vários avanços de pergunta dentro do mesmo gesto de
  // arrastar, pulando perguntas sem o aluno perceber — bug real encontrado
  // ao testar ao vivo.
  const [valorArrasto, setValorArrasto] = useState<number | null>(null)

  // "Neutro" (centro, 5) só como posição de descanso antes de qualquer
  // interação — value continua null até o aluno de fato soltar o dedo tendo
  // arrastado, então o botão "Continuar" (gated em value != null lá em cima)
  // não libera sozinho.
  const posicaoAtual = valorArrasto ?? value ?? 5
  const descritorAtual = value != null ? descritores.find((d) => value >= d.min && value <= d.max) : null
  const cor = corDoValor(posicaoAtual, polaridade)

  const moverPara = (clientX: number) => {
    if (!trackRef.current) return
    const v = valorNaPosicao(clientX, trackRef.current)
    arrastoRef.current = v
    setValorArrasto(v)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    inicioRef.current = { x: e.clientX, y: e.clientY, arrastando: false }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const inicio = inicioRef.current
    if (!inicio) return
    if (!inicio.arrastando) {
      const dist = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y)
      if (dist < LIMIAR_ARRASTE_PX) return
      inicio.arrastando = true
      setArrastando(true)
      if ('vibrate' in navigator) navigator.vibrate(10)
    }
    moverPara(e.clientX)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const inicio = inicioRef.current
    inicioRef.current = null
    setArrastando(false)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    if (inicio?.arrastando && arrastoRef.current != null) {
      onChange(arrastoRef.current)
    }
    arrastoRef.current = null
    setValorArrasto(null)
  }

  const descritorArrasto = descritores.find((d) => posicaoAtual >= d.min && posicaoAtual <= d.max)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>

      <div className="relative px-1 pt-12">
        {arrastando && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-xl bg-accent px-3 py-1.5 text-lg font-bold text-white shadow-lg"
            style={{ left: `clamp(24%, ${posicaoAtual * 10}%, 76%)` }}
          >
            {posicaoAtual} / 10{descritorArrasto ? ` · ${descritorArrasto.label}` : ''}
          </div>
        )}
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="slider"
          aria-label={titulo}
          aria-valuenow={value ?? undefined}
          aria-valuemin={0}
          aria-valuemax={10}
          className="relative flex h-11 items-center"
          style={{ touchAction: 'none' }}
        >
          <div className="h-3 w-full rounded-full" style={{ background: gradienteDaBarra(polaridade) }} />
          <div
            className="absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white shadow-md"
            style={{ left: `${posicaoAtual * 10}%`, backgroundColor: cor, opacity: value == null ? 0.5 : 1 }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{descritores[0]?.label}</span>
          <span>{descritores[descritores.length - 1]?.label}</span>
        </div>
      </div>

      {/* valor escolhido: label fixo abaixo da barra (o balão acima some ao soltar) */}
      <div className="text-center" aria-live="polite">
        {value != null ? (
          <p className="flex items-center justify-center gap-2 text-lg font-bold text-slate-900">
            <span className="size-3 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
            {value} / 10 · <span className="font-semibold">{descritorAtual?.label}</span>
          </p>
        ) : (
          <p className="text-base font-medium text-slate-500">{chips ? 'Arraste ou escolha uma opção' : 'Arraste pra escolher um valor'}</p>
        )}
      </div>

      {chips && (
        <div className="grid grid-cols-5 gap-1.5">
          {chips.map((c) => {
            const selecionado = valorArrasto == null && value === c.valor
            return (
              <button
                key={c.valor}
                type="button"
                onClick={() => onChange(c.valor)}
                aria-pressed={selecionado}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center rounded-xl border px-0.5 text-center transition active:scale-95',
                  selecionado ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700 active:bg-slate-50',
                )}
              >
                <span className="text-base font-bold leading-tight">{c.valor}</span>
                <span className="text-[11px] leading-tight">{c.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
