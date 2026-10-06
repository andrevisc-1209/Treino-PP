import { useState } from 'react'

/**
 * Selo de confiança do pagamento. A logo do Mercado Pago é servida localmente
 * (public/brand/logo-mercadopago.png); se o arquivo não existir, cai para o nome em texto.
 */
export function SeloMercadoPago() {
  const [semLogo, setSemLogo] = useState(false)

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-center">
      <div className="flex min-h-10 items-center justify-center">
        {semLogo ? (
          <span className="text-base font-bold text-[#00699d]">Mercado Pago</span>
        ) : (
          <img src="/brand/logo-mercadopago.png" alt="Mercado Pago" className="h-10 w-auto" onError={() => setSemLogo(true)} />
        )}
      </div>
      <p className="text-sm font-medium text-slate-700">Pagamento 100% seguro processado pelo Mercado Pago</p>
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-600">
        <li>🔒 Dados criptografados</li>
        <li>✅ Ambiente certificado</li>
        <li>💳 Pix, cartão e boleto</li>
      </ul>
    </div>
  )
}
