import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LinkConfiguracoes } from '@/components/LinkConfiguracoes'
import { PuxarParaAtualizar } from '@/components/PuxarParaAtualizar'
import { RolagemHorizontal } from '@/components/RolagemHorizontal'
import { Link } from 'react-router-dom'
import { formatarBRL } from '@/lib/moeda'
import { hojeSP } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { cicloAtual, itensCobraveisDoCiclo, totalPorAula } from './calc'
import { estaVencida, rotuloModelo, SeloFatura } from './rotulos'
import { recebidoPorMes } from './desempenho'
import { useAlunosComCobranca, useFaturasTodas, useParticipacoesCobraveisTodas, type Fatura, type FaturaStatus } from './api'

type Filtro = 'todos' | 'a_fechar' | 'enviada' | 'paga' | 'atraso'

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'a_fechar', label: 'A fechar' },
  { value: 'enviada', label: 'Enviadas' },
  { value: 'paga', label: 'Pagas' },
  { value: 'atraso', label: 'Em atraso' },
]

function CardResumo({ label, valor, qtd }: { label: string; valor: string; qtd: number }) {
  return (
    <div className="w-[42%] shrink-0 snap-start rounded-2xl bg-white p-3 shadow-sm md:w-auto md:shrink">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold">{valor}</p>
      <p className="text-xs text-slate-400">
        {qtd} {qtd === 1 ? 'fatura' : 'faturas'}
      </p>
    </div>
  )
}

export function FinanceiroPage() {
  const { data: alunosCobranca, isLoading: alunosLoading } = useAlunosComCobranca()
  const { data: faturas, isLoading: faturasLoading } = useFaturasTodas()
  const { data: participacoes } = useParticipacoesCobraveisTodas()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const qc = useQueryClient()

  const hoje = hojeSP()
  const mesAtual = hoje.slice(0, 7)

  const faturasAbertasEnviadas = useMemo(() => (faturas ?? []).filter((f) => f.status === 'aberta' || f.status === 'enviada'), [faturas])
  const faturasPagasNoMes = useMemo(() => (faturas ?? []).filter((f) => f.status === 'paga' && f.paga_em?.startsWith(mesAtual)), [faturas, mesAtual])
  const faturasEmAtraso = useMemo(
    () => (faturas ?? []).filter((f) => estaVencida(f.vencimento, f.status, hoje)),
    [faturas, hoje],
  )

  const linhas = useMemo(() => {
    return (alunosCobranca ?? []).map((ac) => {
      const ciclo = cicloAtual(ac.dia_ciclo, hoje)
      const faturasDoAluno = (faturas ?? []).filter((f) => f.aluno_id === ac.aluno_id)
      const ultimaFatura: Fatura | undefined = faturasDoAluno[0]

      let estado: Filtro
      if (!ultimaFatura || ultimaFatura.periodo_fim < ciclo.fim) estado = 'a_fechar'
      else if (estaVencida(ultimaFatura.vencimento, ultimaFatura.status, hoje)) estado = 'atraso'
      else if (ultimaFatura.status === 'paga') estado = 'paga'
      else if (ultimaFatura.status === 'enviada') estado = 'enviada'
      else estado = 'a_fechar'

      const itensDoCiclo = itensCobraveisDoCiclo(
        (participacoes ?? [])
          .filter((p) => p.aluno_id === ac.aluno_id)
          .map((p) => ({ ...p, aula_starts_at: p.aula?.starts_at ?? '' })),
        ciclo,
      )
      const totalCiclo = ac.modelo === 'mensal' ? (ac.valor_mensal ?? 0) : totalPorAula(itensDoCiclo, 0)

      return {
        alunoId: ac.aluno_id,
        nome: ac.aluno?.name ?? '—',
        modelo: ac.modelo,
        ciclo,
        qtdAulasCiclo: itensDoCiclo.length,
        totalCiclo,
        ultimaFatura,
        estado,
      }
    })
  }, [alunosCobranca, faturas, participacoes, hoje])

  const recebimentos = useMemo(() => recebidoPorMes(faturas ?? [], hoje, 6), [faturas, hoje])
  const linhasFiltradas = filtro === 'todos' ? linhas : linhas.filter((l) => l.estado === filtro)

  return (
    <PuxarParaAtualizar onAtualizar={() => qc.invalidateQueries()}>
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <LinkConfiguracoes />
      </header>

      {(alunosLoading || faturasLoading) && <p className="text-slate-500">Carregando…</p>}

      {!alunosLoading && !faturasLoading && (
        <>
          {/* Celular: carrossel deslizável com encaixe. Tablet/desktop: três cards lado a lado + gráfico. */}
          <RolagemHorizontal snap className="mb-4 md:grid md:grid-cols-3 md:gap-2 md:overflow-visible">
            <CardResumo
              label="A receber"
              valor={formatarBRL(faturasAbertasEnviadas.reduce((a, f) => a + f.total, 0))}
              qtd={faturasAbertasEnviadas.length}
            />
            <CardResumo
              label="Recebido no mês"
              valor={formatarBRL(faturasPagasNoMes.reduce((a, f) => a + f.total, 0))}
              qtd={faturasPagasNoMes.length}
            />
            <CardResumo
              label="Em atraso"
              valor={formatarBRL(faturasEmAtraso.reduce((a, f) => a + f.total, 0))}
              qtd={faturasEmAtraso.length}
            />
          </RolagemHorizontal>

          <section className="mb-4 hidden rounded-2xl bg-white p-4 shadow-sm md:block">
            <h2 className="mb-2 text-sm font-semibold">Recebido nos últimos 6 meses</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={recebimentos} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={48} tickFormatter={(v) => formatarBRL(Number(v)).replace(',00', '')} />
                <Tooltip formatter={(v) => [formatarBRL(Number(v)), 'Recebido']} />
                <Bar dataKey="total" fill="#367c39" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <RolagemHorizontal className="mb-3 py-1" corFundo="#f8fafc">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filtro === f.value}
                onClick={(e) => {
                  setFiltro(f.value)
                  e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
                }}
                className={cn(
                  'min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition',
                  filtro === f.value ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                )}
              >
                {f.label}
              </button>
            ))}
          </RolagemHorizontal>

          {linhasFiltradas.length === 0 && <p className="text-sm text-slate-500">Nenhum aluno aqui.</p>}

          <ul className="space-y-2">
            {linhasFiltradas.map((l) => (
              <li key={l.alunoId}>
                <Link to={`/alunos/${l.alunoId}/fechar-ciclo`} className="block rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{l.nome}</p>
                    {l.ultimaFatura && l.estado !== 'a_fechar' ? (
                      <SeloFatura status={l.ultimaFatura.status as FaturaStatus} vencida={l.estado === 'atraso'} />
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">A fechar</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {rotuloModelo(l.modelo)} · {l.qtdAulasCiclo} aula{l.qtdAulasCiclo === 1 ? '' : 's'} · {formatarBRL(l.totalCiclo)} · fecha em{' '}
                    {l.ciclo.fim.slice(8, 10)}/{l.ciclo.fim.slice(5, 7)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
    </PuxarParaAtualizar>
  )
}