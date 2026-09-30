import { BottomSheet } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Plano } from '@/features/assinatura/useAssinatura'

// TODO: número de suporte placeholder — trocar pelo WhatsApp real do
// Personal Perto antes de publicar (não existe em nenhum outro lugar do
// código ainda, então não tinha como puxar de um valor já existente).
const WHATSAPP_SUPORTE = '5521999999999'

const PLANOS: { id: Plano; nome: string; preco: string; equivale?: string; badge?: string }[] = [
  { id: 'mensal', nome: 'Mensal', preco: 'R$ 10/mês' },
  { id: 'trimestral', nome: 'Trimestral', preco: 'R$ 27', equivale: 'R$ 9/mês', badge: 'Mais popular' },
  { id: 'semestral', nome: 'Semestral', preco: 'R$ 50', equivale: 'R$ 8,33/mês', badge: 'Melhor valor' },
]

function assinar(planoNome: string) {
  // TODO: integrar Mercado Pago Checkout Pro
  // Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing
  // Variáveis necessárias (adicionar ao .env quando for implementar):
  //   VITE_MP_PUBLIC_KEY=
  //   MP_ACCESS_TOKEN=        ← só no backend/Edge Function, nunca no client
  // Fluxo previsto: criar preferência via Edge Function → redirecionar pro
  // MP Checkout → webhook confirma pagamento → atualiza treino.assinaturas
  const texto = encodeURIComponent(`Quero assinar o plano ${planoNome}`)
  window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${texto}`, '_blank', 'noopener')
}

export function PlanoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
                onClick={() => assinar(p.nome)}
                className="shrink-0 rounded-xl bg-brand px-4 py-3 font-medium text-white active:bg-brand-hover"
              >
                Assinar
              </button>
            </div>
          </div>
        ))}
        <p className="text-center text-xs text-slate-400">Pagamento via WhatsApp por enquanto — Mercado Pago em breve.</p>
      </div>
    </BottomSheet>
  )
}
