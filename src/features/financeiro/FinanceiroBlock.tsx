import { Link } from 'react-router-dom'
import { formatarBRL } from '@/lib/moeda'
import { hojeSP } from '@/lib/datas'
import { Button } from '@/components/ui'
import { cicloAtual } from './calc'
import { useAlunoCobranca, useFaturasDoAluno } from './api'
import { SeloFatura, rotuloModelo } from './rotulos'

export function FinanceiroBlock({ alunoId }: { alunoId: string }) {
  const { data: cobranca } = useAlunoCobranca(alunoId)
  const { data: faturas } = useFaturasDoAluno(alunoId)

  if (!cobranca?.ativo) return null

  const ciclo = cicloAtual(cobranca.dia_ciclo, hojeSP())
  const ultimas = (faturas ?? []).slice(0, 3)

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Financeiro</h2>
        <Link to={`/alunos/${alunoId}/fechar-ciclo`}>
          <Button variant="ghost">Ciclo atual</Button>
        </Link>
      </div>

      <p className="text-sm text-slate-500">
        {rotuloModelo(cobranca.modelo)} · ciclo {ciclo.inicio.slice(8, 10)}/{ciclo.inicio.slice(5, 7)} a {ciclo.fim.slice(8, 10)}/
        {ciclo.fim.slice(5, 7)}
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
