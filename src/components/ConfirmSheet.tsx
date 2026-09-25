import { useEffect, useState } from 'react'
import { BottomSheet, Button } from '@/components/ui'

type PedidoConfirmacao = {
  titulo: string
  mensagem: string
  textoConfirmar?: string
  destrutivo?: boolean
  resolver: (ok: boolean) => void
}

type Ouvinte = (pedido: PedidoConfirmacao) => void
const ouvintes = new Set<Ouvinte>()

/**
 * Substitui o confirm() nativo por uma BottomSheet do design system.
 * Uso: if (!(await confirmarAcao({ titulo, mensagem }))) return
 */
export function confirmarAcao(opts: { titulo: string; mensagem: string; textoConfirmar?: string; destrutivo?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    ouvintes.forEach((fn) => fn({ ...opts, resolver: resolve }))
  })
}

export function ConfirmHost() {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null)

  useEffect(() => {
    const ouvinte: Ouvinte = (p) => setPedido(p)
    ouvintes.add(ouvinte)
    return () => {
      ouvintes.delete(ouvinte)
    }
  }, [])

  const responder = (ok: boolean) => {
    pedido?.resolver(ok)
    setPedido(null)
  }

  return (
    <BottomSheet open={!!pedido} onClose={() => responder(false)} title={pedido?.titulo}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{pedido?.mensagem}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => responder(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => responder(true)}
            className={pedido?.destrutivo ? 'flex-1 !bg-red-600 active:!bg-red-700' : 'flex-1'}
          >
            {pedido?.textoConfirmar ?? 'Confirmar'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
