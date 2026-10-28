import { Link } from 'react-router-dom'
import { formatarBRL } from '@/lib/moeda'
import { hojeSP } from '@/lib/datas'
import { cicloAtual } from './calc'
import { useAlunoCobranca, useFaturasDoAluno } from './api'
import { SeloFatura, rotuloModelo } from './rotulos'
import { statusFinanceiroDoAluno } from './statusAluno'
import { cn } from '@/lib/utils'

export function FinanceiroBlock({ alunoId }: { alunoId: string }) {
  const { data: cobranca } = useAlunoCobranca(alunoId)
  const { data: faturas } = useFaturasDoAluno(alunoId)

  const ultimas = (faturas ?? []).slice(0, 3)

  // aluno de pacote (sem cobrança por aula/mensal): só o histórico de faturas, sem ciclo a fechar
  if (!cobranca?.ativo) {
    if (ultimas.length === 0) return null
    return (
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Financeiro</h2>
        <ul className="divide-y divide-slate-100">
          {ultimas.map((f) => (
            <li key={f.id}>
              <Link to={`/financeiro/${f.id}`} className="flex items-center justify-between gap-2 py-2 active:opacity-70">
                <div>
                  <p className="text-sm font-medium">
                    {rotuloModelo(f.modelo)} · {f.periodo_inicio.slice(8, 10)}/{f.periodo_inicio.slice(5, 7)} a {f.periodo_fim.slice(8, 10)}/{f.periodo_fim.slice(5, 7)}
                  </p>
                  <p className="text-sm text-slate-500">{formatarBRL(f.total)}</p>
                </div>
                <SeloFatura status={f.status} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const ciclo = cicloAtual(cobranca.dia_ciclo, hojeSP())
  const status = statusFinanceiroDoAluno(faturas ?? [], ciclo.fim, hojeSP(), formatarBRL)

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Financeiro</h2>

      <div
        className={cn(
          'flex items-center justify-between gap-2 rounded-xl p-3',
          status.tom === 'alerta' ? 'bg-red-50 text-red-900' : status.tom === 'atencao' ? 'bg-amber-50 text-amber-950' : 'bg-brand-soft text-brand-hover',
        )}
      >
        <p className="text-sm font-semibold">{status.texto}</p>
        {status.acao && (
          <Link
            to={status.acao.faturaId ? `/financeiro/${status.acao.faturaId}` : `/alunos/${alunoId}/fechar-ciclo`}
            className="flex min-h-11 shrink-0 items-center rounded-xl bg-white px-3 text-sm font-medium text-slate-900 active:bg-slate-100"
          >
            {status.acao.rotulo}
          </Link>
        )}
      </div>

      <p className="text-sm text-slate-600">
        {rotuloModelo(cobranca.modelo)} · ciclo {ciclo.inicio.slice(8, 10)}/{ciclo.inicio.slice(5, 7)} a {ciclo.fim.slice(8, 10)}/{ciclo.fim.slice(5, 7)}
      </p>

      {ultimas.length === 0 && <p className="text-sm text-slate-500">Nenhuma fatura ainda.</p>}

      {ultimas.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {ultimas.map((f) => (
            <li key={f.id}>
              <Link to={`/financeiro/${f.id}`} className="flex items-center justify-between gap-2 py-2 active:opacity-70">
                <div>
                  <p className="text-sm font-medium">
                    {f.periodo_inicio.slice(8, 10)}/{f.periodo_inicio.slice(5, 7)} a {f.periodo_fim.slice(8, 10)}/{f.periodo_fim.slice(5, 7)}
                  </p>
                  <p className="text-sm text-slate-500">{formatarBRL(f.total)}</p>
                </div>
                <SeloFatura status={f.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
