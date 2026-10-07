import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MessageCircle, Search } from 'lucide-react'
import { BottomSheet, Input } from '@/components/ui'
import { ListaSkeleton } from '@/components/Skeleton'
import { cn } from '@/lib/utils'
import { mapearErroSupabase } from '@/lib/erros'
import { useConsentimentosPainel, useHistoricoConsentimento } from './api'
import {
  CLASSE_STATUS,
  contarPorStatus,
  dataHoraSP,
  filtrarConsentimentos,
  pendenteExpirado,
  ROTULO_STATUS,
  STATUS_ORDEM,
  type CanalEnvio,
  type LinhaConsentimento,
  type StatusConsentimento,
} from './utils'

function IconeCanal({ canal }: { canal: CanalEnvio | null }) {
  if (!canal) return <span className="text-slate-400">—</span>
  const Icone = canal === 'email' ? Mail : MessageCircle
  const nome = canal === 'email' ? 'E-mail' : 'WhatsApp'
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-700">
      <Icone size={16} aria-hidden />
      <span className="text-sm">{nome}</span>
    </span>
  )
}

function SeloStatus({ linha }: { linha: Pick<LinhaConsentimento, 'status' | 'enviado_at'> }) {
  const expirado = pendenteExpirado(linha)
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', CLASSE_STATUS[linha.status])}>
      {ROTULO_STATUS[linha.status]}
      {expirado && ' · expirou'}
    </span>
  )
}

function HistoricoSheet({ linha, onClose }: { linha: LinhaConsentimento | null; onClose: () => void }) {
  const { data, isLoading, error } = useHistoricoConsentimento(linha?.aluno_id ?? null)
  return (
    <BottomSheet open={!!linha} onClose={onClose} title={linha ? `Histórico — ${linha.nome}` : ''}>
      {linha && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Status atual:</span>
            <SeloStatus linha={linha} />
            {linha.respondido_at && <span className="text-slate-500">em {dataHoraSP(linha.respondido_at)}</span>}
          </div>

          {isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
          {error && <p className="text-sm text-red-600">{mapearErroSupabase(error)}</p>}
          {data && data.envios.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum envio registrado neste histórico (solicitações anteriores à criação do histórico não aparecem).</p>
          )}
          {data && data.envios.length > 0 && (
            <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
              {data.envios.map((e) => (
                <li key={e.id} className="relative space-y-0.5">
                  <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-brand" aria-hidden />
                  <p className="text-sm font-medium">{dataHoraSP(e.criado_at)}</p>
                  <p className="flex items-center gap-1.5 text-sm text-slate-600">
                    <IconeCanal canal={e.canal} />
                    <span aria-hidden>·</span>
                    <span>por {data.enviadoPor}</span>
                  </p>
                  <p className="text-sm text-slate-700">
                    {e.motivo}
                    {e.motivo === 'Outros' && e.motivo_livre ? `: ${e.motivo_livre}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

/** Painel do personal: situação do consentimento LGPD de saúde de cada aluno, com filtros e histórico de envios. */
export function ConsentimentosPage() {
  const { data: linhas, isLoading, error } = useConsentimentosPainel()
  const [status, setStatus] = useState<StatusConsentimento | 'todos'>('todos'),
    [busca, setBusca] = useState(''),
    [historico, setHistorico] = useState<LinhaConsentimento | null>(null)

  const contagem = useMemo(() => contarPorStatus(linhas ?? []), [linhas])
  const filtradas = useMemo(() => filtrarConsentimentos(linhas ?? [], { status, busca }), [linhas, status, busca])

  const opcoes: { valor: StatusConsentimento | 'todos'; rotulo: string }[] = [
    { valor: 'todos', rotulo: 'Todos' },
    ...STATUS_ORDEM.map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s] })),
  ]

  return (
    <div className="mx-auto max-w-4xl p-4 pb-24">
      <header className="mb-4 flex items-center gap-2">
        <Link to="/configuracoes" className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar para Configurações">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Consentimentos LGPD</h1>
          <p className="text-sm text-slate-500">Autorização dos alunos para registrar dados de saúde.</p>
        </div>
      </header>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por status">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => setStatus(o.valor)}
            aria-pressed={status === o.valor}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium',
              status === o.valor ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
            )}
          >
            {o.rotulo} <span className={status === o.valor ? 'opacity-80' : 'text-slate-500'}>({contagem[o.valor]})</span>
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar aluno por nome" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
      </div>

      {isLoading && <ListaSkeleton />}
      {error && <p className="text-red-600">{mapearErroSupabase(error)}</p>}
      {linhas && linhas.length === 0 && <p className="text-slate-500">Nenhum aluno ativo ainda.</p>}
      {linhas && linhas.length > 0 && filtradas.length === 0 && <p className="text-slate-500">Nenhum aluno encontrado com esses filtros.</p>}

      {filtradas.length > 0 && (
        <>
          <div className="hidden grid-cols-[minmax(0,2fr)_9rem_8rem_9rem_9rem_7rem] gap-3 px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <span>Aluno</span>
            <span>Status</span>
            <span>Canal</span>
            <span>Último envio</span>
            <span>Resposta</span>
            <span />
          </div>
          <ul className="space-y-2">
            {filtradas.map((l) => (
              <li
                key={l.aluno_id}
                className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-[minmax(0,2fr)_9rem_8rem_9rem_9rem_7rem] md:items-center md:gap-3"
              >
                <div className="flex items-center justify-between gap-2 md:block">
                  <p className="min-w-0 truncate font-medium">{l.nome}</p>
                  <span className="md:hidden">
                    <SeloStatus linha={l} />
                  </span>
                </div>
                <span className="hidden md:block">
                  <SeloStatus linha={l} />
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 md:contents">
                  <span className="md:block">
                    <span className="mr-1 text-xs text-slate-500 md:hidden">Canal:</span>
                    <IconeCanal canal={l.canal} />
                  </span>
                  <span className="md:block">
                    <span className="mr-1 text-xs text-slate-500 md:hidden">Envio:</span>
                    {l.enviado_at ? dataHoraSP(l.enviado_at) : '—'}
                  </span>
                  <span className="md:block">
                    <span className="mr-1 text-xs text-slate-500 md:hidden">
                      {l.status === 'negado' ? 'Negado em:' : l.status === 'confirmado' ? 'Confirmado em:' : 'Resposta:'}
                    </span>
                    {l.respondido_at ? dataHoraSP(l.respondido_at) : '—'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHistorico(l)}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 active:bg-slate-50"
                >
                  Ver histórico
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <HistoricoSheet linha={historico} onClose={() => setHistorico(null)} />
    </div>
  )
}
