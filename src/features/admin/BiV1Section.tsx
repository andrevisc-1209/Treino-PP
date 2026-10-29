import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Target } from 'lucide-react'
import { ListaSkeleton } from '@/components/Skeleton'
import { mapearErroSupabase } from '@/lib/erros'
import { hojeSP } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { formatarMoeda } from './financeiro'
import { useAdminBIv1, useAdminListaAcao, useAdminRegioes } from './api'
import {
  conversaoParaPagante,
  custoPorPagante,
  detalheDoMotivo,
  etapasDoFunil,
  lerInvestimento,
  linkContatoPersonal,
  maiorGargalo,
  META_PAGANTES,
  PRAZO_META,
  progressoDaMeta,
  ritmoSemanal,
  ROTULO_MOTIVO,
  rotuloOrigem,
  SEM_FILTROS,
  SITUACOES_BI,
  type FiltrosBI,
  type FunilBI,
  type MetaBI,
  type SituacaoBI,
} from './biV1'

const ORIGENS_CONHECIDAS = ['direto', 'indicacao', 'instagram', 'whatsapp']

function Cartao({ titulo, children, id }: { titulo: string; children: React.ReactNode; id: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby={id}>
      <h3 id={id} className="mb-3 text-sm font-semibold text-slate-600">
        {titulo}
      </h3>
      {children}
    </section>
  )
}

/** Meta de pagantes: barra de progresso, ritmo necessário × real e a curva dos últimos dias (acumulado de quem já pagou). */
export function BlocoMeta({ meta }: { meta: MetaBI }) {
  const hoje = hojeSP()
  const p = progressoDaMeta(meta.pagantes_ativos, hoje)
  const real = ritmoSemanal(meta.serie)
  const W = 640
  const H = 90
  const maximo = Math.max(1, ...meta.serie.map((s) => s.acumulado))
  const pontos = meta.serie.map((s, i) => `${(i / Math.max(1, meta.serie.length - 1)) * W},${H - (s.acumulado / maximo) * (H - 6)}`).join(' ')
  const [ano, mes, dia] = PRAZO_META.split('-')

  return (
    <Cartao id="bi1-meta" titulo={`Meta: ${META_PAGANTES} pagantes até ${dia}/${mes}/${ano}`}>
      <div className="flex items-end justify-between gap-3">
        <p className="text-3xl font-bold text-accent">
          {meta.pagantes_ativos} <span className="text-base font-medium text-slate-500">de {META_PAGANTES} ({p.percentual}%) · pagantes ativos hoje</span>
        </p>
        <p className="text-right text-xs text-slate-600">
          MRR estimado
          <br />
          <strong className="text-base text-slate-900">{formatarMoeda(meta.mrr)}</strong>
        </p>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={p.percentual} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta de pagantes">
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(p.percentual, meta.pagantes_ativos > 0 ? 2 : 0)}%` }} />
      </div>
      {p.atingida ? (
        <p className="mt-2 text-sm font-medium text-brand-hover">Meta atingida. 🎉</p>
      ) : (
        <p className="mt-2 text-sm text-slate-700">
          Faltam <strong>{p.faltam}</strong>
          {p.vencida ? ' e o prazo já passou.' : <>; restam {p.diasRestantes} dias (~{p.semanasRestantes} semanas): preciso de <strong>{p.porSemanaNecessario} novos pagantes por semana</strong>. Nos últimos 7 dias entraram <strong>{real}</strong>{real < p.porSemanaNecessario ? ' (abaixo do ritmo necessário)' : ' (no ritmo ou acima)'}.</>}
        </p>
      )}
      {meta.serie.length > 1 && (
        <>
          <svg viewBox={`0 0 ${W} ${H + 4}`} className="mt-3 w-full" role="img" aria-label={`Quem já pagou, acumulado nos últimos ${meta.serie.length} dias: de ${meta.serie[0].acumulado} para ${meta.serie[meta.serie.length - 1].acumulado}`}>
            <line x1="0" y1={H} x2={W} y2={H} stroke="#cbd5e1" strokeWidth="1" />
            <polyline points={pontos} fill="none" stroke="#367c39" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <p className="text-xs text-slate-500">Curva: quem já fez um pagamento, acumulado (registro de pagamentos, desde que ele existe). {meta.ja_pagaram} já pagaram alguma vez; a meta conta só os pagantes ativos hoje.</p>
        </>
      )}
    </Cartao>
  )
}

/** "Quem precisa de ação agora": personais com trial acabando sem ativação, pagantes sem uso e planos vencendo, com atalho de WhatsApp. */
export function CartaoAcao({ lista }: { lista: ReturnType<typeof useAdminListaAcao> }) {
  return (
    <Cartao id="bi1-acao" titulo={`Quem precisa de ação agora${lista.data ? ` (${lista.data.length})` : ''}`}>
      {lista.isLoading && <ListaSkeleton linhas={2} />}
      {lista.error && <p className="text-sm text-red-600">{mapearErroSupabase(lista.error)}</p>}
      {lista.data && lista.data.length === 0 && <p className="text-sm text-slate-600">Ninguém pede ação agora. 👏</p>}
      <ul className="divide-y divide-slate-100">
        {(lista.data ?? []).map((i) => {
          const whats = linkContatoPersonal(i.telefone)
          return (
            <li key={`${i.professional_id}-${i.motivo}`} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {i.nome || '—'} <span className="font-normal text-slate-500">· {i.cidade ?? 'Não informado'}</span>
                </p>
                <p className="text-xs text-slate-600">
                  <span
                    className={cn(
                      'mr-1 inline-block rounded-full px-2 py-0.5 font-medium',
                      i.motivo === 'trial_sem_ativacao' ? 'bg-amber-100 text-amber-900' : i.motivo === 'pagante_sem_uso' ? 'bg-red-100 text-red-900' : 'bg-brand-soft text-brand-hover',
                    )}
                  >
                    {ROTULO_MOTIVO[i.motivo]}
                  </span>
                  {detalheDoMotivo(i)}
                </p>
              </div>
              {whats ? (
                <a href={whats} target="_blank" rel="noopener noreferrer" aria-label={`Chamar ${i.nome} no WhatsApp`} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 px-3 text-sm font-medium text-emerald-800 active:bg-emerald-50">
                  <MessageCircle size={16} aria-hidden /> WhatsApp
                </a>
              ) : (
                <span className="shrink-0 text-xs text-slate-500">sem telefone</span>
              )}
            </li>
          )
        })}
      </ul>
    </Cartao>
  )
}

export function BiV1Section({ dias }: { dias: number }) {
  const [filtros, setFiltros] = useState<FiltrosBI>(SEM_FILTROS)
  const [investimentoTexto, setInvestimentoTexto] = useState('')
  const { data, isLoading, error } = useAdminBIv1(dias, filtros)
  const regioes = useAdminRegioes()

  const cidadesOpcoes = (regioes.data ?? []).map((r) => r.cidade)
  const origensOpcoes = [...new Set([...ORIGENS_CONHECIDAS, ...(data?.origens.map((o) => o.origem) ?? [])])]
  const temFiltro = !!(filtros.cidade || filtros.situacao || filtros.origem)
  const etapas = data ? etapasDoFunil(data.funil) : []
  const gargalo = maiorGargalo(etapas)
  const investimento = lerInvestimento(investimentoTexto)
  const pagantesDoGrupo = data?.funil.pagou ?? 0
  const custo = custoPorPagante(investimento, pagantesDoGrupo)

  const semOrigemRegistrada = !!data && data.origens.every((o) => o.origem === 'direto')
  const totalCadastrosOrigem = data?.origens.reduce((t, o) => t + o.cadastros, 0) ?? 0

  const sel = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm sm:w-auto'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target size={18} className="text-brand-hover" aria-hidden />
        <h2 className="font-heading font-semibold text-accent">Funil, cidades e origens</h2>
        <Link to="/admin?aba=geral" className="ml-auto inline-flex min-h-11 items-center text-sm font-medium text-brand-hover underline">Meta e ações ficam na Visão geral</Link>
      </div>

      {isLoading && <ListaSkeleton linhas={3} />}
      {error && <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>}
      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center" role="group" aria-label="Filtros do funil, das cidades e das origens">
        <p className="text-sm font-medium text-slate-600 sm:mr-1">Filtrar funil, cidades e origens:</p>
        <select aria-label="Cidade" value={filtros.cidade} onChange={(e) => setFiltros((f) => ({ ...f, cidade: e.target.value }))} className={sel}>
          <option value="">Todas as cidades</option>
          {cidadesOpcoes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select aria-label="Situação" value={filtros.situacao} onChange={(e) => setFiltros((f) => ({ ...f, situacao: e.target.value as '' | SituacaoBI }))} className={sel}>
          <option value="">Todas as situações</option>
          {SITUACOES_BI.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
        <select aria-label="Origem" value={filtros.origem} onChange={(e) => setFiltros((f) => ({ ...f, origem: e.target.value }))} className={sel}>
          <option value="">Todas as origens</option>
          {origensOpcoes.map((o) => (
            <option key={o} value={o}>
              {rotuloOrigem(o)}
            </option>
          ))}
        </select>
        {temFiltro && (
          <button type="button" onClick={() => setFiltros(SEM_FILTROS)} className="min-h-11 rounded-xl px-3 text-sm font-medium text-brand-hover active:bg-slate-100">
            Limpar filtros
          </button>
        )}
      </div>

      {data && (
        <>
          <Cartao id="bi1-funil" titulo="Funil de ativação (quem se cadastrou no período)">
            <p className="mb-3 text-xs text-slate-500">
              Cada linha mostra quantos chegaram à etapa e a % do total de cadastros. “Pagou” conta quem já pagou ou tem plano pago, mesmo sem ter passado por todas as etapas (por exemplo, plano liberado por você).
            </p>
            {gargalo && (
              <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
                Maior perda: <strong>{gargalo.rotulo}</strong> (só {gargalo.pctDaAnterior}% de quem chegou na etapa anterior).
              </p>
            )}
            {data.funil.cadastrou === 0 ? (
              <p className="text-sm text-slate-600">Ninguém se cadastrou neste período com esses filtros.</p>
            ) : (
              <ul className="space-y-3">
                {etapas.map((e) => (
                  <li key={e.chave}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800">{e.rotulo}</span>
                      <span className="text-slate-700">
                        <strong>{e.valor}</strong> · {e.pctDoInicio}%{e.pctDaAnterior !== null && <span className="text-slate-500"> ({e.pctDaAnterior}% da etapa anterior)</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <div className="h-full rounded-full bg-brand" style={{ width: `${e.pctDoInicio}%` }} />
                    </div>
                    {e.semPassarPelaAnterior > 0 && (
                      <p className="mt-0.5 text-xs text-slate-600">
                        Inclui ao menos {e.semPassarPelaAnterior} {e.semPassarPelaAnterior === 1 ? 'personal que chegou' : 'personais que chegaram'} aqui sem passar pela etapa anterior.
                      </p>
                    )}
                    {e.legenda && <p className="mt-0.5 text-xs text-slate-500">{e.legenda}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao id="bi1-cidades" titulo="Por cidade (cadastros do período)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3">Cidade</th>
                    <th className="py-2 pr-3">Cadastros</th>
                    <th className="py-2 pr-3">Ativados (3+ alunos)</th>
                    <th className="py-2 pr-3">Pagantes</th>
                    <th className="py-2 pr-3">Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cidades.map((c) => (
                    <tr key={c.cidade} className="border-b border-slate-100">
                      <td className="py-2 pr-3">
                        <Link to={`/admin?aba=personais&cidade=${encodeURIComponent(c.cidade)}`} className="text-brand-hover underline">
                          {c.cidade}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{c.cadastros}</td>
                      <td className="py-2 pr-3">{c.ativados}</td>
                      <td className="py-2 pr-3">{c.pagantes}</td>
                      <td className="py-2 pr-3">{conversaoParaPagante(c) ?? '—'}{conversaoParaPagante(c) !== null && '%'}</td>
                    </tr>
                  ))}
                  {data.cidades.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-500">
                        Sem cadastros neste período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Cartao>

          <Cartao id="bi1-origens" titulo="Por origem do cadastro (cadastros do período)">
            {semOrigemRegistrada ? (
              <p className="text-sm text-slate-700">
                Todos os {totalCadastrosOrigem} {totalCadastrosOrigem === 1 ? 'cadastro aparece' : 'cadastros aparecem'} como direto: o app ainda não registra de onde cada personal veio. A tabela por origem volta sozinha quando houver mais de uma origem.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3">Origem</th>
                      <th className="py-2 pr-3">Cadastros</th>
                      <th className="py-2 pr-3">Ativados (3+ alunos)</th>
                      <th className="py-2 pr-3">Pagantes</th>
                      <th className="py-2 pr-3">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.origens.map((o) => (
                      <tr key={o.origem} className="border-b border-slate-100">
                        <td className="py-2 pr-3">{rotuloOrigem(o.origem)}</td>
                        <td className="py-2 pr-3">{o.cadastros}</td>
                        <td className="py-2 pr-3">{o.ativados}</td>
                        <td className="py-2 pr-3">{o.pagantes}</td>
                        <td className="py-2 pr-3">{conversaoParaPagante(o) ?? '—'}{conversaoParaPagante(o) !== null && '%'}</td>
                      </tr>
                    ))}
                    {data.origens.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500">
                          Sem cadastros neste período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            
            )}
            <label className="mt-3 flex flex-col gap-1 text-sm text-slate-700 sm:flex-row sm:items-center sm:gap-3">
              <span>Investimento em anúncios no período (R$):</span>
              <input
                inputMode="decimal"
                value={investimentoTexto}
                onChange={(e) => setInvestimentoTexto(e.target.value)}
                placeholder="300"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm sm:w-32"
              />
            </label>
            {investimentoTexto.trim() !== '' && (
              <p className="mt-1 text-sm text-slate-700" aria-live="polite">
                {custo === null ? 'Sem pagantes no grupo filtrado: custo por pagante indisponível.' : <>Custo por pagante: <strong>{formatarMoeda(custo)}</strong> ({formatarMoeda(investimento ?? 0)} ÷ {pagantesDoGrupo} {pagantesDoGrupo === 1 ? 'pagante' : 'pagantes'}). Use o filtro de origem para ver um canal só.</>}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">Origem vem do link do cadastro (utm_source); sem origem = direto. O registro da origem depende da atualização da Política de Privacidade.</p>
          </Cartao>
        </>
      )}
    </div>
  )
}

/** Funil resumido da Visão geral: a maior perda primeiro e as cinco etapas em uma linha cada. */
export function FunilCompacto({ funil }: { funil: FunilBI }) {
  const etapas = etapasDoFunil(funil)
  const gargalo = maiorGargalo(etapas)
  return (
    <Cartao id="geral-funil" titulo="Funil de ativação (cadastros dos últimos 30 dias)">
      {funil.cadastrou === 0 ? (
        <p className="text-sm text-slate-600">Ninguém se cadastrou nos últimos 30 dias.</p>
      ) : (
        <>
          {gargalo && (
            <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
              Maior perda: <strong>{gargalo.rotulo}</strong> (só {gargalo.pctDaAnterior}% de quem chegou na etapa anterior).
            </p>
          )}
          <ul className="divide-y divide-slate-100 text-sm">
            {etapas.map((e) => (
              <li key={e.chave} className="flex items-baseline justify-between gap-2 py-1.5">
                <span className="text-slate-700">{e.rotulo}</span>
                <span className="text-slate-700">
                  <strong>{e.valor}</strong> · {e.pctDoInicio}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link to="/admin?aba=indicadores" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-brand-hover underline">
        Ver análise completa em Indicadores
      </Link>
    </Cartao>
  )
}
