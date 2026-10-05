import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

const PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined

export type ResultadoAssinatura = { subscription_id: string; status: string }

/** Extrai a mensagem em português que a Edge Function devolve em { error } (status não-2xx). */
async function mensagemDoErro(error: unknown): Promise<string> {
  const contexto = (error as { context?: Response })?.context
  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json()
      if (typeof corpo?.error === 'string') return corpo.error
    } catch {
      // corpo ausente ou não-JSON: cai na mensagem genérica
    }
  }
  return 'Não foi possível concluir o pagamento. Tente de novo.'
}

/**
 * Checkout Transparente: o Brick do Mercado Pago coleta o cartão num iframe
 * seguro e entrega só um token — os dados do cartão nunca tocam o nosso código
 * nem o nosso servidor. O servidor decide preço, e-mail e identidade.
 */
export default function CheckoutMP({
  plano,
  valor,
  onSucesso,
}: {
  plano: 'mensal' | 'trimestral' | 'semestral'
  valor: number
  onSucesso: (r: ResultadoAssinatura) => void
}) {
  const { session } = useAuth()
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Props do Brick precisam ter identidade estável: se mudarem a cada render, o SDK recria o
  // formulário e apaga o que a pessoa já digitou.
  const email = session?.user.email
  const initialization = useMemo(() => ({ amount: valor, payer: { email } }), [valor, email])
  const customization = useMemo(() => ({ paymentMethods: { minInstallments: 1, maxInstallments: 1 }, visual: { hideFormTitle: true } }), [])

  const onSucessoRef = useRef(onSucesso)
  useEffect(() => {
    onSucessoRef.current = onSucesso
  }, [onSucesso])

  const aoPronto = useCallback(() => setPronto(true), [])
  const aoErrar = useCallback(() => setErro('Não foi possível carregar o formulário de pagamento. Recarregue a página.'), [])
  const aoEnviar = useCallback(
    async (formData: { token: string }) => {
      setErro(null)
      const { data, error } = await supabase.functions.invoke<ResultadoAssinatura>('mp-subscribe', {
        body: { plano, card_token: formData.token },
      })
      if (error || !data) {
        const msg = await mensagemDoErro(error)
        setErro(msg)
        throw new Error(msg)
      }
      onSucessoRef.current(data)
    },
    [plano],
  )

  useEffect(() => {
    if (PUBLIC_KEY) initMercadoPago(PUBLIC_KEY, { locale: 'pt-BR' })
  }, [])

  if (!PUBLIC_KEY) {
    return <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Pagamento indisponível no momento. Tente novamente mais tarde.</p>
  }

  return (
    <div className="space-y-3">
      {!pronto && <p className="py-6 text-center text-sm text-slate-500">Carregando pagamento seguro…</p>}
      <CardPayment
        locale="pt-BR"
        initialization={initialization}
        customization={customization}
        onReady={aoPronto}
        onError={aoErrar}
        onSubmit={aoEnviar}
      />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  )
}
