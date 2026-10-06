import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BottomSheet } from '@/components/ui'
import { SeloMercadoPago } from '@/components/SeloMercadoPago'
import logoPP from '@/assets/brand/logo-personal-perto-sm.png'
import { cn } from '@/lib/utils'
import type { Plano } from '@/features/assinatura/useAssinatura'

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
  return 'Não foi possível abrir o pagamento. Tente de novo.'
}

function CabecalhoConfianca() {
  return (
    <div className="flex justify-center pb-1">
      <img src={logoPP} alt="Personal Perto" className="h-9 w-auto" />
    </div>
  )
}

const PLANOS: { id: Plano; nome: string; preco: string; dias: number; equivale?: string; badge?: string }[] = [
  { id: 'mensal', nome: 'Mensal', preco: 'R$ 15', dias: 30 },
  { id: 'trimestral', nome: 'Trimestral', preco: 'R$ 39', dias: 90, equivale: 'R$ 13/mês — economize 13%', badge: 'Mais popular' },
  { id: 'semestral', nome: 'Semestral', preco: 'R$ 60', dias: 180, equivale: 'R$ 10/mês — economize 33%', badge: 'Melhor valor' },
]

export function PlanoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [abrindo, setAbrindo] = useState<Plano | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Checkout Pro: o servidor cria a preferência e devolve o link do Mercado Pago (Pix, cartão ou boleto).
  const assinar = async (plano: Plano) => {
    setErro(null)
    setAbrindo(plano)
    const { data, error } = await supabase.functions.invoke<{ init_point: string }>('mp-subscribe', { body: { plano } })
    if (error || !data?.init_point) {
      setErro(await mensagemDoErro(error))
      setAbrindo(null)
      return
    }
    window.location.assign(data.init_point)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Escolha seu plano">
      <div className="space-y-3">
        <CabecalhoConfianca />
        {PLANOS.map((p) => (
          <div
            key={p.id}
            className={cn(
              'relative rounded-2xl border p-4',
              p.badge === 'Mais popular' ? 'border-brand bg-brand-soft' : 'border-slate-200 bg-white',
            )}
          >
            {p.badge && (
              <span className="absolute -top-2.5 right-4 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
                {p.badge}
              </span>
            )}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{p.nome}</p>
                <p className="text-2xl font-bold">{p.preco}</p>
                <p className="text-xs text-slate-500">{p.dias} dias de acesso</p>
                {p.equivale && <p className="text-sm font-medium text-brand-hover">{p.equivale}</p>}
              </div>
              <button
                type="button"
                onClick={() => assinar(p.id)}
                disabled={abrindo !== null}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-4 py-3 font-medium text-white active:bg-brand-hover disabled:opacity-60"
              >
                {abrindo === p.id ? 'Abrindo…' : 'Assinar'}
              </button>
            </div>
          </div>
        ))}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <SeloMercadoPago />
        <p className="text-center text-xs text-slate-500">Pagamento único, sem renovação automática. Você paga no site do Mercado Pago.</p>
      </div>
    </BottomSheet>
  )
}
