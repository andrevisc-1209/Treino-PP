import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { BottomSheet } from '@/components/ui'
import { mostrarErroGlobal } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Plano } from '@/features/assinatura/useAssinatura'

const PLANOS: { id: Plano; nome: string; preco: string; equivale?: string; badge?: string }[] = [
  { id: 'mensal', nome: 'Mensal', preco: 'R$ 10/mês' },
  { id: 'trimestral', nome: 'Trimestral', preco: 'R$ 27', equivale: 'R$ 9/mês', badge: 'Mais popular' },
  { id: 'semestral', nome: 'Semestral', preco: 'R$ 50', equivale: 'R$ 8,33/mês', badge: 'Melhor valor' },
]

/** Pede o link de checkout ao servidor (preço e identidade vêm de lá) e redireciona pro Mercado Pago. */
async function iniciarAssinatura(plano: Plano): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ init_point?: string }>('mp-subscribe', { body: { plano } })
  const destino = data?.init_point
  if (error || !destino || !destino.startsWith('https://www.mercadopago.com')) {
    throw new Error('Não foi possível iniciar o pagamento. Tente de novo.')
  }
  window.location.href = destino
}

export function PlanoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [carregando, setCarregando] = useState<Plano | null>(null)

  const assinar = async (plano: Plano) => {
    setCarregando(plano)
    try {
      await iniciarAssinatura(plano)
    } catch (e) {
      mostrarErroGlobal((e as Error).message)
      setCarregando(null)
    }
    // sucesso: a página navega pro Mercado Pago, o botão segue travado até lá
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Escolha seu plano">
      <div className="space-y-3">
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
                {p.equivale && <p className="text-sm text-slate-500">equivale a {p.equivale}</p>}
              </div>
              <button
                type="button"
                onClick={() => assinar(p.id)}
                disabled={carregando !== null}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-medium text-white active:bg-brand-hover disabled:opacity-60"
              >
                {carregando === p.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Abrindo…
                  </>
                ) : (
                  'Assinar'
                )}
              </button>
            </div>
          </div>
        ))}
        <p className="text-center text-xs text-slate-400">Pagamento seguro via Mercado Pago. Cancele quando quiser.</p>
      </div>
    </BottomSheet>
  )
}
