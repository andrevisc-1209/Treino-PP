import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { mapearErroSupabase } from '@/lib/erros'
import { useAdminConsentimentos } from './api'
import { filtrarConsentimentosAdmin, FILTROS_CONSENTIMENTO, totaisConsentimento, type FiltroConsentimento } from './consentimentos'

const COLUNAS = [
  { chave: 'confirmados', rotulo: 'Confirmados', classe: 'bg-emerald-100 text-emerald-800' },
  { chave: 'pendentes', rotulo: 'Pendentes', classe: 'bg-amber-100 text-amber-900' },
  { chave: 'negados', rotulo: 'Negados', classe: 'bg-red-100 text-red-800' },
  { chave: 'nao_solicitados', rotulo: 'Não solicitados', classe: 'bg-slate-100 text-slate-700' },
] as const

/**
 * Consentimentos LGPD de saúde por personal. Só números agregados: pela regra do projeto o admin
 * não vê dados de alunos (nome, datas individuais), então não há lista de alunos aqui.
 */
export function ConsentimentosSection() {
  const { data, isLoading, error } = useAdminConsentimentos()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<FiltroConsentimento>('')

  const lista = useMemo(() => filtrarConsentimentosAdmin(data ?? [], { busca, status }), [data, busca, status])
  const totais = useMemo(() => totaisConsentimento(data ?? []), [data])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-heading font-semibold text-accent">Consentimentos LGPD (saúde)</h2>
      <p className="mb-3 text-sm text-slate-500">
        {totais.alunos} alunos · {totais.confirmados} confirmados · {totais.pendentes} pendentes · {totais.negados} negados · {totais.nao_solicitados}{' '}
        não solicitados. Contagens por personal; sem dados individuais de alunos.
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por nome ou e-mail do personal" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por status">
          {FILTROS_CONSENTIMENTO.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setStatus(f.valor)}
              aria-pressed={status === f.valor}
              className={cn(
                'min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium',
                status === f.valor ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
              )}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="py-4 text-center text-sm text-slate-400">Carregando…</p>}
      {error && <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>}

      {data && (
        <>
          {/* Desktop/tablet: tabela */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Personal</th>
                  <th className="py-2 pr-3">Alunos</th>
                  {COLUNAS.map((c) => (
                    <th key={c.chave} className="py-2 pr-3">
                      {c.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((l, i) => (
                  <tr key={l.professional_id} className={cn('border-b border-slate-100', i % 2 === 1 && 'bg-slate-50/60')}>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-slate-800">{l.nome}</p>
                      <p className="text-xs text-slate-500">{l.email ?? '—'}</p>
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-700">{l.total_alunos}</td>
                    {COLUNAS.map((c) => (
                      <td key={c.chave} className="py-2 pr-3">
                        <span className={cn('inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-xs font-semibold', l[c.chave] > 0 ? c.classe : 'text-slate-500')}>
                          {l[c.chave]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {lista.map((l) => (
              <div key={l.professional_id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-medium text-slate-800">{l.nome}</p>
                <p className="mb-2 break-all text-xs text-slate-500">{l.email ?? '—'}</p>
                <p className="mb-2 text-sm text-slate-600">{l.total_alunos} alunos</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLUNAS.map((c) => (
                    <span key={c.chave} className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', l[c.chave] > 0 ? c.classe : 'bg-slate-50 text-slate-500')}>
                      {l[c.chave]} {c.rotulo.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {lista.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhum personal encontrado.</p>}
        </>
      )}
    </div>
  )
}
