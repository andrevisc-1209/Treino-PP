import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatarDataBR, formatarNumero } from '@/lib/format'
import { dataSP } from '@/lib/datas'
import { mapearErroSupabase } from '@/lib/erros'
import { MODALIDADES_CONFIG } from '@/types/modalidades'
import { useExecucoes, type Execucao } from '@/features/execucoes/api'
import { DetalheExecucaoSheet } from '@/features/execucoes/DetalheExecucaoSheet'
import { textoMetrica } from '@/features/execucoes/metricas'
import { useSessoes, type Sessao } from './api'

type Item = { chave: string; quando: string; sessao: Sessao } | { chave: string; quando: string; execucao: Execucao }

/** Origem do registro: 🏋️ presencial (sessão ou aula) · 📤 assíncrono (aluno fez pelo link). */
function IconeOrigem({ assincrono }: { assincrono: boolean }) {
  return (
    <span role="img" aria-label={assincrono ? 'Assíncrono' : 'Presencial'} title={assincrono ? 'Assíncrono (link)' : 'Presencial'} className="shrink-0 text-base">
      {assincrono ? '📤' : '🏋️'}
    </span>
  )
}

/**
 * Tudo o que o aluno treinou, do mais recente ao mais antigo: sessões presenciais (fluxo original), aulas presenciais de
 * outras modalidades e treinos feitos pelo aluno pelo link. Execuções que vieram de uma sessão de musculação não
 * entram duas vezes (já aparecem como sessão).
 */
export function HistoricoTab({ alunoId }: { alunoId: string }) {
  const { data: sessoes, isLoading, error } = useSessoes(alunoId)
  const { data: execucoes, isLoading: carregandoExec } = useExecucoes(alunoId)
  const [aberta, setAberta] = useState<Execucao | null>(null)

  const itens = useMemo<Item[]>(() => {
    const dasSessoes: Item[] = (sessoes ?? []).map((s) => ({ chave: `s-${s.id}`, quando: s.created_at, sessao: s }))
    const dasExecucoes: Item[] = (execucoes ?? [])
      .filter((e) => e.sessao_id == null)
      .map((e) => ({ chave: `e-${e.id}`, quando: e.concluido_em ?? e.created_at, execucao: e }))
    return [...dasSessoes, ...dasExecucoes].sort((a, b) => b.quando.localeCompare(a.quando))
  }, [sessoes, execucoes])

  if (isLoading || carregandoExec) return <p className="text-slate-500">Carregando…</p>
  if (error) return <p className="text-red-600">{mapearErroSupabase(error)}</p>
  if (itens.length === 0) return <p className="text-sm text-slate-500">Nenhum treino registrado ainda.</p>

  return (
    <>
      <ul className="space-y-2">
        {itens.map((item) => {
          if ('execucao' in item) {
            const e = item.execucao
            const cfg = MODALIDADES_CONFIG[e.modalidade]
            return (
              <li key={item.chave}>
                <button type="button" onClick={() => setAberta(e)} className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm active:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-2 font-medium">
                      <IconeOrigem assincrono={e.origem === 'link'} />
                      <span className="truncate">
                        {cfg.emoji} {e.plano_nome ?? cfg.label}
                      </span>
                    </p>
                    <span className="shrink-0 text-sm text-slate-500">{formatarDataBR(dataSP(item.quando))}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{textoMetrica(e.modalidade, e.detalhes_execucao)}</p>
                  {e.notas_aluno && <p className="mt-0.5 text-xs italic text-slate-500">“{e.notas_aluno}”</p>}
                </button>
              </li>
            )
          }
          const s = item.sessao
          const cargaInterna = s.post_pse != null && s.duration_minutes != null ? s.post_pse * s.duration_minutes : null
          return (
            <li key={item.chave}>
              <Link to={`/alunos/${alunoId}/sessoes/${s.id}`} className="block rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 font-medium">
                    <IconeOrigem assincrono={false} />
                    {s.plano_nome ?? 'Treino livre'}
                    {s.plano_nome != null && s.plano_id == null && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">treino excluído</span>
                    )}
                  </p>
                  <span className="text-sm text-slate-500">{formatarDataBR(s.session_date)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {s.status === 'em_andamento' && 'Em andamento'}
                  {s.status === 'cancelada' && 'Cancelada'}
                  {s.status === 'concluida' &&
                    [
                      s.post_pse != null && `PSE ${s.post_pse}`,
                      s.duration_minutes != null && `${s.duration_minutes} min`,
                      cargaInterna != null && `${formatarNumero(cargaInterna)} UA`,
                      s.prof_rating != null && `nota ${s.prof_rating}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
      <DetalheExecucaoSheet execucao={aberta} onClose={() => setAberta(null)} />
    </>
  )
}
