import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CircleAlert, CircleCheck, Clock } from 'lucide-react'
import logoPP from '@/assets/brand/logo-personal-perto-sm.png'
import { useAssinatura } from './useAssinatura'

export type ResultadoCheckout = 'success' | 'failure' | 'pending'

/** Página de retorno do Checkout Pro (back_urls). Pública de propósito: fica fora do AssinaturaGuard. */
export function RetornoCheckoutPage({ resultado }: { resultado: ResultadoCheckout }) {
  const qc = useQueryClient()
  // o webhook pode demorar alguns segundos: enquanto não vira "ativa", consulta de novo
  const { data: assinatura } = useAssinatura()
  const ativa = assinatura?.status === 'ativa'
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['assinatura'] })
    if (resultado !== 'success') return
    const id = setInterval(() => qc.invalidateQueries({ queryKey: ['assinatura'] }), 4000)
    const parar = setTimeout(() => clearInterval(id), 40_000)
    return () => {
      clearInterval(id)
      clearTimeout(parar)
    }
  }, [qc, resultado])

  const conteudo = {
    success: {
      icone: <CircleCheck size={48} className="text-brand" />,
      titulo: 'Pagamento aprovado!',
      texto: ativa ? 'Seu plano está ativo.' : 'Estamos confirmando seu plano — isso leva alguns segundos.',
      botao: 'Ir para o app',
      para: '/',
    },
    failure: {
      icone: <CircleAlert size={48} className="text-red-600" />,
      titulo: 'Pagamento não concluído',
      texto: 'Tente novamente. Nenhum valor foi cobrado.',
      botao: 'Tentar novamente',
      para: '/',
    },
    pending: {
      icone: <Clock size={48} className="text-amber-500" />,
      titulo: 'Pagamento em análise',
      texto: 'Você receberá uma confirmação em breve. Assim que for aprovado, seu plano é liberado automaticamente.',
      botao: 'Voltar ao app',
      para: '/',
    },
  }[resultado]

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 text-center shadow-sm">
        <img src={logoPP} alt="Personal Perto" className="mx-auto h-10 w-auto" />
        <div className="flex justify-center" aria-hidden>
          {conteudo.icone}
        </div>
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-bold text-accent">{conteudo.titulo}</h1>
          <p className="text-sm text-slate-600" role="status">
            {conteudo.texto}
          </p>
        </div>
        <Link to={conteudo.para} className="flex min-h-11 w-full items-center justify-center rounded-xl bg-brand font-medium text-white active:bg-brand-hover">
          {conteudo.botao}
        </Link>
      </div>
    </main>
  )
}
