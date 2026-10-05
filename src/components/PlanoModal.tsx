import { lazy, Suspense, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CircleCheck } from 'lucide-react'
import { BottomSheet } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Plano } from '@/features/assinatura/useAssinatura'
import type { ResultadoAssinatura } from './CheckoutMP'

// O SDK do Mercado Pago só é baixado quando a pessoa escolhe um plano.
const CheckoutMP = lazy(() => import('./CheckoutMP'))

const PLANOS: { id: Plano; nome: string; valor: number; preco: string; equivale?: string; badge?: string }[] = [
  { id: 'mensal', nome: 'Mensal', valor: 10, preco: 'R$ 10/mês' },
  { id: 'trimestral', nome: 'Trimestral', valor: 27, preco: 'R$ 27', equivale: 'R$ 9/mês', badge: 'Mais popular' },
  { id: 'semestral', nome: 'Semestral', valor: 50, preco: 'R$ 50', equivale: 'R$ 8,33/mês', badge: 'Melhor valor' },
]

export function PlanoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [escolhido, setEscolhido] = useState<(typeof PLANOS)[number] | null>(null)
  const [resultado, setResultado] = useState<ResultadoAssinatura | null>(null)

  const fechar = () => {
    setEscolhido(null)
    setResultado(null)
    onClose()
  }

  const concluido = (r: ResultadoAssinatura) => {
    setResultado(r)
    // o app destrava assim que a assinatura vira "ativa" no banco
    qc.invalidateQueries({ queryKey: ['assinatura'] })
  }

  if (resultado) {
    const aprovada = resultado.status === 'authorized'
    return (
      <BottomSheet open={open} onClose={fechar} title={aprovada ? 'Assinatura confirmada' : 'Pagamento em análise'}>
        <div className="space-y-4 text-center">
          <CircleCheck size={40} className={cn('mx-auto', aprovada ? 'text-brand' : 'text-amber-500')} />
          <p className="text-sm text-slate-600">
            {aprovada
              ? `Plano ${escolhido?.nome} ativo. Obrigado por assinar o Treino!`
              : 'O Mercado Pago está analisando o pagamento. Assim que for aprovado, seu acesso é liberado automaticamente.'}
          </p>
          <button type="button" onClick={fechar} className="min-h-11 w-full rounded-xl bg-brand px-4 py-3 font-medium text-white active:bg-brand-hover">
            Continuar
          </button>
        </div>
      </BottomSheet>
    )
  }

  if (escolhido) {
    return (
      <BottomSheet open={open} onClose={fechar} title={`Plano ${escolhido.nome} — ${escolhido.preco}`}>
        <div className="space-y-3">
          <button type="button" onClick={() => setEscolhido(null)} className="flex min-h-11 items-center gap-1 text-sm text-brand-hover">
            <ArrowLeft size={16} /> Trocar de plano
          </button>
          <Suspense fallback={<p className="py-6 text-center text-sm text-slate-500">Carregando pagamento seguro…</p>}>
            <CheckoutMP plano={escolhido.id} valor={escolhido.valor} onSucesso={concluido} />
          </Suspense>
          <p className="text-center text-xs text-slate-400">Pagamento seguro via Mercado Pago. Cancele quando quiser.</p>
        </div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet open={open} onClose={fechar} title="Escolha seu plano">
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
                onClick={() => setEscolhido(p)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-4 py-3 font-medium text-white active:bg-brand-hover"
              >
                Assinar
              </button>
            </div>
          </div>
        ))}
        <p className="text-center text-xs text-slate-400">Pagamento seguro via Mercado Pago. Cancele quando quiser.</p>
      </div>
    </BottomSheet>
  )
}
