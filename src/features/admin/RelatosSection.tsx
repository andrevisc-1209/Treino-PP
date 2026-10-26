import { dataHoraSP } from '@/features/consentimentos/utils'
import { mapearErroSupabase } from '@/lib/erros'
import { linkWhatsApp } from '@/lib/whatsapp'
import { cn } from '@/lib/utils'
import { ListaSkeleton } from '@/components/Skeleton'
import { ROTULO_STATUS_RELATO, TIPOS_RELATO, type StatusRelato } from '@/features/ajuda/relatos'
import { useAdminRelatos, useAdminRelatoStatus } from './api'

const ROTULO_TIPO = Object.fromEntries(TIPOS_RELATO.map((t) => [t.valor, t.rotulo]))

/** Relatos enviados pelos personais na central de ajuda. Dados do PERSONAL (nome, contato) e o texto dele; nunca de alunos. */
export function RelatosSection() {
  const { data, isLoading, error } = useAdminRelatos()
  const mudar = useAdminRelatoStatus()
  const abertos = (data ?? []).filter((r) => r.status !== 'resolvido').length

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-heading font-semibold text-accent">Relatos dos personais</h2>
      <p className="mb-3 text-sm text-slate-500">{abertos} em aberto · mostra os 200 mais recentes, abertos primeiro.</p>

      {isLoading && <ListaSkeleton linhas={2} />}
      {error && <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>}
      {data?.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Nenhum relato ainda.</p>}

      <ul className="space-y-3">
        {data?.map((r) => {
          const wa = linkWhatsApp(r.telefone)
          return (
            <li key={r.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{ROTULO_TIPO[r.tipo]}</span>
                <span className="font-medium">{r.nome}</span>
                <span className="text-slate-500">{dataHoraSP(r.criado_em)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{r.mensagem}</p>
              <p className="mt-2 break-words text-xs text-slate-500">
                {[r.email, r.telefone].filter(Boolean).join(' · ')}
                {r.dispositivo && ` · ${r.dispositivo}`}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(['novo', 'em_andamento', 'resolvido'] as StatusRelato[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={mudar.isPending}
                    aria-pressed={r.status === st}
                    onClick={() => r.status !== st && mudar.mutate({ id: r.id, status: st })}
                    className={cn(
                      'min-h-11 rounded-full border px-4 text-sm font-medium',
                      r.status === st ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                    )}
                  >
                    {ROTULO_STATUS_RELATO[st]}
                  </button>
                ))}
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="min-h-11 content-center px-2 text-sm font-medium text-brand-hover">
                    Responder no WhatsApp
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
