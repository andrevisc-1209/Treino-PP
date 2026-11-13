import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { aplicarNovaVersao, verificarNovaVersaoDoApp } from '@/lib/atualizacaoApp'

type Estado = 'parado' | 'verificando' | 'atual' | 'nova' | 'indisponivel'

const [ano, mes, dia] = __APP_DATA__.split('-')

/** Versão do app instalado e o botão para procurar uma nova na hora (o app instalado quase nunca procura sozinho). */
export function VerificarAtualizacao() {
  const [estado, setEstado] = useState<Estado>('parado')

  const verificar = async () => {
    setEstado('verificando')
    const r = await verificarNovaVersaoDoApp()
    if (r === 'nova') {
      setEstado('nova')
      await new Promise((resolve) => setTimeout(resolve, 700))
      if (!(await aplicarNovaVersao())) setEstado('indisponivel')
      return
    }
    setEstado(r)
  }

  const mensagem: Record<Estado, string | null> = {
    parado: null,
    verificando: 'Procurando versão nova…',
    atual: 'Você já está na versão mais recente.',
    nova: 'Nova versão encontrada. Atualizando o app…',
    indisponivel: 'Não deu para verificar agora. Confira a conexão e tente de novo.',
  }

  return (
    <div className="space-y-1 text-center">
      <button
        type="button"
        onClick={verificar}
        disabled={estado === 'verificando' || estado === 'nova'}
        className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-brand-hover underline disabled:opacity-60"
      >
        <RefreshCw size={16} aria-hidden className={estado === 'verificando' ? 'animate-spin' : undefined} />
        Verificar atualização
      </button>
      <p className="text-xs text-slate-600">
        Versão {__APP_VERSAO__} · {dia}/{mes}/{ano}
      </p>
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-slate-700">
        {mensagem[estado]}
      </p>
    </div>
  )
}
