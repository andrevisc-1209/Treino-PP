import { RefreshCw } from 'lucide-react'
import { mapearErroSupabase } from '@/lib/erros'
import { cn } from '@/lib/utils'

/**
 * Erro ao carregar uma lista/tela: mensagem em português simples e botão para tentar de novo
 * (sinal ruim na academia é o caso comum; recarregar a página inteira perde o contexto).
 */
export function ErroComRetry({ erro, onTentar, className }: { erro: unknown; onTentar?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('space-y-2 rounded-2xl bg-red-50 p-4 text-red-900', className)}>
      <p className="text-sm font-medium">Não foi possível carregar.</p>
      <p className="text-sm">{mapearErroSupabase(erro)}</p>
      {onTentar && (
        <button
          type="button"
          onClick={onTentar}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-medium text-red-900 active:bg-red-100"
        >
          <RefreshCw size={16} aria-hidden /> Tentar de novo
        </button>
      )}
    </div>
  )
}
