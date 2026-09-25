import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatarBRL } from '@/lib/moeda'
import { hojeSP } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { cicloAtual, itensCobraveisDoCiclo, totalPorAula } from './calc'
import { estaVencida, rotuloModelo, SeloFatura } from './rotulos'
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
    <div className="rounded-2xl bg-white p-3 shadow-sm">
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

  const linhasFiltradas = filtro === 'todos' ? linhas : linhas.filter((l) => l.estado === filtro)

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </header>

      {(alunosLoading || faturasLoading) && <p className="text-slate-500">Carregando…</p>}

      {!alunosLoading && !faturasLoading && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
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
          </div>

          <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={cn(
                  'min-h-9 shrink-0 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition',
                  filtro === f.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

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
  )
}
