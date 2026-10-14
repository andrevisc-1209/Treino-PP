import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { PlanoModal } from '@/components/PlanoModal'
import { mapearErroSupabase } from '@/lib/erros'
import { useAssinatura } from './useAssinatura'
import { resumirAssinatura } from './resumo'

const COR_STATUS: Record<string, string> = {
  Trial: 'bg-sky-100 text-sky-900',
  Ativo: 'bg-emerald-100 text-emerald-800',
  Encerrado: 'bg-red-100 text-red-800',
  Cancelado: 'bg-slate-200 text-slate-800',
}

/** Conteúdo da seção "Assinatura" das Configurações: só leitura de treino.assinaturas (via useAssinatura). */
export function AssinaturaSecao() {
  const { data: assinatura, isLoading, error } = useAssinatura()
  const [escolhendoPlano, setEscolhendoPlano] = useState(false)

  if (isLoading) return <p className="text-sm text-slate-500">Carregando…</p>
  if (error || !assinatura) return <p className="text-sm text-red-600">{error ? mapearErroSupabase(error) : 'Não foi possível carregar sua assinatura.'}</p>

  const r = resumirAssinatura(assinatura)
  return (
    <>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Status</dt>
          <dd>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', COR_STATUS[r.status])}>{r.status}</span>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Plano</dt>
          <dd className="font-medium">{r.plano}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">{r.prazoRotulo}</dt>
          <dd className="font-medium">{r.prazo}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Valor</dt>
          <dd className="font-medium">{r.valor}</dd>
        </div>
      </dl>
      {r.nota && <p className="text-sm text-slate-600">{r.nota}</p>}
      <Button variant={r.acao === 'renovar' ? 'outline' : 'primary'} className="w-full" onClick={() => setEscolhendoPlano(true)}>
        {r.acao === 'renovar' ? 'Renovar' : 'Assinar agora'}
      </Button>
      <PlanoModal open={escolhendoPlano} onClose={() => setEscolhendoPlano(false)} />
    </>
  )
}
