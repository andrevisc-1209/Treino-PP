import type { ReactNode } from 'react'
import { Button } from '@/components/ui'

/** Janela central das ações do admin (reset de senha, trial, plano, CPF, contato). */
export function ModalBase({
  titulo,
  children,
  onCancelar,
  onConfirmar,
  confirmando,
  confirmarDesabilitado,
  textoConfirmar = 'Confirmar',
}: {
  titulo: string
  children: ReactNode
  onCancelar: () => void
  onConfirmar?: () => void
  confirmando: boolean
  confirmarDesabilitado?: boolean
  textoConfirmar?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancelar}>
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-accent">{titulo}</h2>
        <div className="space-y-3">{children}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancelar} className="flex-1" disabled={confirmando}>
            Cancelar
          </Button>
          {onConfirmar && (
            <Button onClick={onConfirmar} className="flex-1" disabled={confirmando || confirmarDesabilitado}>
              {confirmando ? 'Salvando…' : textoConfirmar}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
