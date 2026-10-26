import { dataHoraSP } from '@/features/consentimentos/utils'
import { mapearErroSupabase } from '@/lib/erros'
import { linkWhatsApp } from '@/lib/whatsapp'
import { cn } from '@/lib/utils'
import { ListaSkeleton } from '@/components/Skeleton'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROTULO_STATUS_RELATO, rotuloDispositivo, TIPOS_RELATO, type StatusRelato } from '@/features/ajuda/relatos'
import { useAdminRelatos, useAdminRelatoStatus } from './api'

const ROTULO_TIPO = Object.fromEntries(TIPOS_RELATO.map((t) => [t.valor, t.rotulo]))

/** Relatos enviados pelos personais na central de ajuda. Dados do PERSONAL (nome, contato) e o texto dele; nunca de alunos. */
export function RelatosSection() {
  const { data, isLoading, error } = useAdminRelatos()
  const mudar = useAdminRelatoStatus()
  const [filtro, setFiltro] = useState<'abertos' | StatusRelato | 'todos'>('abertos')
  const todos = data ?? []
  const abertos = todos.filter((r) => r.status !== 'resolvido').length
  const contagem = (st: StatusRelato) => todos.filter((r) => r.status === st).length
  const visiveis = todos.filter((r) => (filtro === 'todos' ? true : filtro === 'abertos' ? r.status !== 'resolvido' : r.status === filtro))
  const abas: { valor: typeof filtro; rotulo: string; n: number }[] = [
    { valor: 'abertos', rotulo: 'Em aberto', n: abertos },
    { valor: 'novo', rotulo: ROTULO_STATUS_RELATO.novo, n: contagem('novo') },
    { valor: 'em_andamento', rotulo: ROTULO_STATUS_RELATO.em_andamento, n: contagem('em_andamento') },
    { valor: 'resolvido', rotulo: ROTULO_STATUS_RELATO.resolvido, n: contagem('resolvido') },
    { valor: 'todos', rotulo: 'Todos', n: todos.length },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-heading font-semibold text-accent">Relatos dos personais</h2>
      <p className="mb-3 text-sm text-slate-500">{abertos} em aberto · mostra os 200 mais recentes.</p>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar relatos por status">
        {abas.map((a) => (
          <button
            key={a.valor}
            type="button"
            onClick={() => setFiltro(a.valor)}
            aria-pressed={filtro === a.valor}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium',
              filtro === a.valor ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
            )}
          >
            {a.rotulo} ({a.n})
          </button>
        ))}
      </div>

      {isLoading && <ListaSkeleton linhas={2} />}
      {error && <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>}
      {data && visiveis.length === 0 && <p className="py-4 text-center text-sm text-slate-500">{todos.length === 0 ? 'Nenhum relato ainda.' : 'Nenhum relato neste filtro.'}</p>}

      <ul className="space-y-3">
        {visiveis.map((r) => {
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
                <span title={r.dispositivo ?? undefined}> · {rotuloDispositivo(r.dispositivo)}</span>
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
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    // ao abrir a conversa, um relato "novo" passa para "em andamento" (a resolução continua manual)
                    onClick={() => r.status === 'novo' && mudar.mutate({ id: r.id, status: 'em_andamento' })}
                    className="min-h-11 content-center px-2 text-sm font-medium text-brand-hover"
                  >
                    Responder no WhatsApp
                  </a>
                )}
                <Link
                  to={`/admin?${new URLSearchParams({ aba: 'personais', busca: r.email ?? r.nome }).toString()}`}
                  className="min-h-11 content-center px-2 text-sm font-medium text-brand-hover"
                >
                  Ver cadastro
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
