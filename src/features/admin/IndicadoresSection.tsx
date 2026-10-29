import { useState, type ReactNode } from 'react'
import { dataSP, somarDias } from '@/lib/datas'
import { formatarDataBR } from '@/lib/format'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { ListaSkeleton } from '@/components/Skeleton'
import { cn } from '@/lib/utils'
import { mapearErroSupabase } from '@/lib/erros'
import { formatarMoeda } from './financeiro'
import { useAdminBI } from './api'
import { BiV1Section } from './BiV1Section'
import {
  agruparSerie,
  passoDoGrafico,
  periodoDaUrl,
  PERIODOS_BI,
  SUBIR_E_RUIM,
  variacao,
  type ChaveBI,
  type ChaveSerie,
  type DadosBI,
} from './bi'

type Cartao = { chave: ChaveBI | 'treinos_realizados'; titulo: string; ajuda?: string; moeda?: boolean }

type Grupo = { titulo: string; cartoes: Cartao[] }

const GRUPOS: Grupo[] = [
  {
    titulo: 'Crescimento',
    cartoes: [
      { chave: 'cadastros', titulo: 'Novos cadastros', ajuda: 'Personais que criaram conta no período.' },
      { chave: 'personais_ativos', titulo: 'Personais que usaram o app', ajuda: 'Fizeram algo no app no período: treino, aula, aluno ou treino novo. Não é o mesmo que ter plano ativo.' },
      { chave: 'novos_pagantes', titulo: 'Novos pagantes (1º pagamento)', ajuda: 'Personais cujo primeiro pagamento aprovado caiu neste período (registro de pagamentos).' },
    ],
  },
  {
    titulo: 'Uso do app',
    cartoes: [
      { chave: 'alunos_novos', titulo: 'Alunos novos no período', ajuda: 'Somente a contagem; o painel não mostra dados de alunos.' },
      { chave: 'treinos_montados', titulo: 'Treinos montados' },
      { chave: 'treinos_realizados', titulo: 'Treinos realizados', ajuda: 'Presencial + à distância concluídos.' },
      { chave: 'aulas_realizadas', titulo: 'Aulas realizadas' },
      { chave: 'faturas_geradas', titulo: 'Faturas de alunos emitidas', ajuda: 'Cobranças que os personais fizeram aos alunos. Não é receita do Treino PP.' },
    ],
  },
  { titulo: 'Suporte', cartoes: [{ chave: 'relatos', titulo: 'Relatos recebidos' }] },
]

/** Receita e retenção do período: ficam na aba Financeiro. */
const GRUPOS_FINANCEIRO: Grupo[] = [
  {
    titulo: 'Receita',
    cartoes: [
      { chave: 'receita', titulo: 'Receita registrada', moeda: true, ajuda: 'Soma dos pagamentos aprovados no registro.' },
      { chave: 'pagamentos', titulo: 'Pagamentos aprovados' },
    ],
  },
  {
    titulo: 'Retenção',
    cartoes: [
      { chave: 'trials_encerrados', titulo: 'Trials encerrados' },
      { chave: 'trials_sem_conversao', titulo: 'Trials sem conversão', ajuda: 'Trial que acabou sem nenhum pagamento.' },
      { chave: 'planos_vencidos', titulo: 'Planos vencidos', ajuda: 'Plano pago que chegou ao fim no período e não foi renovado. Zero não significa que ninguém cancelou: só conta plano pago vencido.' },
    ],
  },
]

const SERIES: { chave: ChaveSerie; rotulo: string; moeda?: boolean }[] = [
  { chave: 'cadastros', rotulo: 'Cadastros' },
  { chave: 'alunos_novos', rotulo: 'Alunos' },
  { chave: 'treinos', rotulo: 'Treinos realizados' },
  { chave: 'pagamentos', rotulo: 'Pagamentos' },
  { chave: 'receita', rotulo: 'Receita', moeda: true },
]

function valorDe(d: DadosBI, que: 'atual' | 'anterior', chave: Cartao['chave']): number {
  const m = d[que]
  return chave === 'treinos_realizados' ? m.treinos_presencial + m.treinos_distancia : m[chave]
}

function SeloVariacao({ chave, atual, anterior, moeda }: { chave: Cartao['chave']; atual: number; anterior: number; moeda?: boolean }) {
  const v = moeda ? variacao(atual, anterior, { baseMinima: 100, formatar: formatarMoeda }) : variacao(atual, anterior)
  const ruim = chave !== 'treinos_realizados' && SUBIR_E_RUIM.includes(chave)
  const bom = v.sentido === 'subiu' ? !ruim : v.sentido === 'caiu' ? ruim : null
  const Icone = v.sentido === 'subiu' ? ArrowUp : v.sentido === 'caiu' ? ArrowDown : Minus
  return (
    <p className={cn('mt-1 flex items-center gap-1 text-xs', bom === true && 'text-brand-hover', bom === false && 'text-red-700', bom === null && 'text-slate-600')}>
      <Icone size={12} aria-hidden /> {v.rotulo}
    </p>
  )
}

function GruposDeCartoes({ dados, grupos }: { dados: DadosBI; grupos: Grupo[] }) {
  return (
    <>
    {grupos.map((g) => (
      <section key={g.titulo} aria-labelledby={`bi-${g.titulo}`}>
        <h3 id={`bi-${g.titulo}`} className="mb-2 text-sm font-semibold text-slate-600">
          {g.titulo}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {g.cartoes.map((c) => {
            const atual = valorDe(dados, 'atual', c.chave)
            const anterior = valorDe(dados, 'anterior', c.chave)
            return (
              <div key={c.chave} className="rounded-2xl border border-slate-200 bg-white p-4" title={c.ajuda}>
                <p className="text-xs text-slate-500">{c.titulo}</p>
                <p className="mt-1 text-3xl font-bold text-accent">{c.moeda ? formatarMoeda(atual) : atual}</p>
                {c.chave === 'treinos_realizados' && (
                  <p className="text-xs text-slate-500">
                    {dados.atual.treinos_presencial} presencial · {dados.atual.treinos_distancia} à distância
                  </p>
                )}
                <SeloVariacao chave={c.chave} atual={atual} anterior={anterior} moeda={c.moeda} />
                <p className="text-xs text-slate-500">
                  Anterior: {c.moeda ? formatarMoeda(anterior) : anterior}
                </p>
                {c.ajuda && <p className="mt-1 text-xs text-slate-500">{c.ajuda}</p>}
              </div>
            )
          })}
        </div>
      </section>
    ))}

    </>
  )
}

function Grafico({ dados, chave }: { dados: DadosBI; chave: ChaveSerie }) {
  const meta = SERIES.find((s) => s.chave === chave)!
  const barras = agruparSerie(dados.serie, chave, passoDoGrafico(dados.dias))
  const [foco, setFoco] = useState<number | null>(null)
  const fmt = (n: number) => (meta.moeda ? formatarMoeda(n) : String(n))
  const max = Math.max(1, ...barras.map((b) => b.valor))
  const total = barras.reduce((s, b) => s + b.valor, 0)
  const W = 640
  const H = 180
  const passoX = W / barras.length
  const larg = Math.max(2, Math.min(28, passoX - 2))
  const cadaN = Math.ceil(barras.length / 8)
  const ativo = foco !== null ? barras[foco] : null

  return (
    <div>
      <p className="mb-1 min-h-5 text-sm text-slate-700" aria-live="polite">
        {ativo ? (
          <>
            <span className="font-medium">{ativo.detalhe}:</span> {fmt(ativo.valor)}
          </>
        ) : (
          <>
            <span className="font-medium">Total no período:</span> {fmt(total)}
          </>
        )}
      </p>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={`${meta.rotulo} por ${passoDoGrafico(dados.dias) === 1 ? 'dia' : passoDoGrafico(dados.dias) === 7 ? 'semana' : 'mês'}; total ${fmt(total)}`}>
        <line x1="0" y1={H} x2={W} y2={H} stroke="#cbd5e1" strokeWidth="1" />
        <text x="0" y="10" fontSize="11" fill="#64748b">
          {fmt(max)}
        </text>
        {barras.map((b, i) => {
          const h = Math.round((b.valor / max) * (H - 18))
          const x = i * passoX + (passoX - larg) / 2
          return (
            <g key={i}>
              {/* área de toque maior que a barra */}
              <rect
                x={i * passoX}
                y={0}
                width={passoX}
                height={H}
                fill="transparent"
                tabIndex={0}
                aria-label={`${b.detalhe}: ${fmt(b.valor)}`}
                onMouseEnter={() => setFoco(i)}
                onMouseLeave={() => setFoco(null)}
                onFocus={() => setFoco(i)}
                onBlur={() => setFoco(null)}
                onClick={() => setFoco(i)}
              />
              <rect x={x} y={H - h} width={larg} height={Math.max(h, b.valor > 0 ? 2 : 0)} rx="2" fill={foco === i ? '#2a602c' : '#367c39'} pointerEvents="none" />
              {i % cadaN === 0 && (
                <text x={i * passoX + passoX / 2} y={H + 15} fontSize="11" textAnchor="middle" fill="#64748b">
                  {b.rotulo}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <details className="mt-2 text-sm">
        <summary className="min-h-11 cursor-pointer content-center font-medium text-brand-hover">Ver como tabela</summary>
        <table className="mt-1 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="py-1 pr-3">Período</th>
              <th className="py-1">{meta.rotulo}</th>
            </tr>
          </thead>
          <tbody>
            {barras.map((b, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-1 pr-3 text-slate-700">{b.detalhe}</td>
                <td className="py-1 text-slate-700">{fmt(b.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn('min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium', ativo ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
    >
      {children}
    </button>
  )
}

/** Período escolhido na URL (?periodo=) e a função de troca. */
function usePeriodoDaUrl() {
  const [params, setParams] = useSearchParams()
  const periodo = periodoDaUrl(params.get('periodo'))
  const escolher = (dias: number) =>
    setParams((atual) => {
      const novo = new URLSearchParams(atual)
      novo.set('periodo', String(dias))
      return novo
    }, { replace: true })
  return { periodo, escolher }
}

function SeletorDePeriodo({ periodo, escolher }: { periodo: number; escolher: (dias: number) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Período">
      {PERIODOS_BI.map((p) => (
        <Chip key={p.dias} ativo={periodo === p.dias} onClick={() => escolher(p.dias)}>
          {p.rotulo}
        </Chip>
      ))}
    </div>
  )
}

/** Receita e retenção do período (comparadas com o período anterior), na aba Financeiro. */
export function ReceitaERetencaoSection() {
  const { periodo, escolher } = usePeriodoDaUrl()
  const { data, isLoading, error } = useAdminBI(periodo)
  const meta = PERIODOS_BI.find((p) => p.dias === periodo)!
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-heading font-semibold text-accent">Receita e retenção no período</h2>
        <p className="text-sm text-slate-500">
          {meta.descricao}{data ? ` (${formatarDataBR(dataSP(data.inicio))} a ${formatarDataBR(dataSP(data.fim))})` : ''}, comparados com o período anterior de mesmo tamanho.
        </p>
      </div>
      <SeletorDePeriodo periodo={periodo} escolher={escolher} />
      {isLoading && <ListaSkeleton linhas={2} />}
      {error && <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>}
      {data && <GruposDeCartoes dados={data} grupos={GRUPOS_FINANCEIRO} />}
    </div>
  )
}

/** Indicadores do negócio por período, sempre comparados com o período anterior. Só agregados; nada de dados de alunos. */
export function IndicadoresSection() {
  const { periodo, escolher } = usePeriodoDaUrl()
  const { data, isLoading, error } = useAdminBI(periodo)
  const [serie, setSerie] = useState<ChaveSerie>('cadastros')
  const meta = PERIODOS_BI.find((p) => p.dias === periodo)!

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-semibold text-accent">Indicadores do negócio</h2>
        <p className="text-sm text-slate-500">
          Janela móvel: {meta.descricao}{data ? ` (${formatarDataBR(dataSP(data.inicio))} a ${formatarDataBR(dataSP(data.fim))})` : ''}, comparada com o período anterior de mesmo tamanho
          {data ? ` (${formatarDataBR(somarDias(dataSP(data.inicio), -periodo))} a ${formatarDataBR(somarDias(dataSP(data.inicio), -1))})` : ''}. “Pagantes” aparece de três formas: ativos hoje (meta), já pagaram alguma vez (funil) e 1º pagamento no período (cartão).
        </p>
      </div>

      <SeletorDePeriodo periodo={periodo} escolher={escolher} />

      <BiV1Section dias={periodo} />

      {isLoading && <ListaSkeleton linhas={3} />}
      {error && <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>}

      {data && (
        <>
          <GruposDeCartoes dados={data} grupos={GRUPOS} />

          <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="bi-grafico">
            <h3 id="bi-grafico" className="mb-2 text-sm font-semibold text-slate-600">
              Evolução no período
            </h3>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Métrica do gráfico">
              {SERIES.map((s) => (
                <Chip key={s.chave} ativo={serie === s.chave} onClick={() => setSerie(s.chave)}>
                  {s.rotulo}
                </Chip>
              ))}
            </div>
            <Grafico dados={data} chave={serie} />
          </section>

          <p className="text-xs text-slate-500">
            Pagamentos e receita só existem no registro desde a criação dele (veja a aba Financeiro); períodos antes disso aparecem zerados. Variação com base abaixo de 10 aparece em número absoluto, não em porcentagem.
            Todos os números são agregados: nenhum dado de aluno é exibido.
          </p>
        </>
      )}
    </div>
  )
}
