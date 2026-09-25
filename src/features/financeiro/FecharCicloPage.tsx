import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { useAluno } from '@/features/alunos/api'
import { formatarHoraInicioFim, hojeSP, somarDias } from '@/lib/datas'
import { formatarBRL } from '@/lib/moeda'
import { Button, Field, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { cicloAtual, itensCobraveisDoCiclo, totalMensal, totalPorAula } from './calc'
import { useAlunoCobranca, useFecharCiclo, useParticipacoesAbertas } from './api'

const ROTULO_STATUS: Record<string, string> = { presente: 'Presente', falta: 'Falta', cancelou: 'Cancelou' }

export function FecharCicloPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: aluno } = useAluno(id)
  const { data: cobranca, isLoading: cobrancaLoading } = useAlunoCobranca(id)
  const { data: participacoes, isLoading: participacoesLoading } = useParticipacoesAbertas(id)
  const fechar = useFecharCiclo()

  const [incluidos, setIncluidos] = useState<Record<string, boolean>>({})
  const [valores, setValores] = useState<Record<string, string>>({})
  const [ajusteTexto, setAjusteTexto] = useState('0')
  const [ajusteDescricao, setAjusteDescricao] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const hoje = hojeSP()
  const ciclo = useMemo(() => (cobranca ? cicloAtual(cobranca.dia_ciclo, hoje) : null), [cobranca, hoje])

  const itensDoCiclo = useMemo(() => {
    if (!participacoes || !ciclo) return []
    return itensCobraveisDoCiclo(
      participacoes.map((p) => ({ ...p, aula_starts_at: p.aula?.starts_at ?? '' })),
      ciclo,
    ).sort((a, b) => (a.aula?.starts_at ?? '').localeCompare(b.aula?.starts_at ?? ''))
  }, [participacoes, ciclo])

  useEffect(() => {
    const inc: Record<string, boolean> = {}
    const val: Record<string, string> = {}
    for (const item of itensDoCiclo) {
      inc[item.id] = true
      val[item.id] = String(item.valor ?? 0)
    }
    setIncluidos(inc)
    setValores(val)
  }, [itensDoCiclo])

  if (!id) return <Navigate to="/financeiro" replace />

  const itensIncluidos = itensDoCiclo.filter((i) => incluidos[i.id])
  const ajuste = Number(ajusteTexto.replace(',', '.')) || 0

  const total =
    cobranca?.modelo === 'mensal'
      ? totalMensal(cobranca.valor_mensal ?? 0, ajuste)
      : totalPorAula(
          itensIncluidos.map((i) => ({ valor: Number((valores[i.id] ?? '0').replace(',', '.')) || 0 })),
          ajuste,
        )

  const cicloNaoTerminou = ciclo ? hoje < ciclo.fim : false

  const confirmar = () => {
    if (!cobranca || !ciclo) return
    setErro(null)
    const vencimento = cobranca.dias_vencimento > 0 ? somarDias(ciclo.fim, cobranca.dias_vencimento) : ciclo.fim
    fechar.mutate(
      {
        aluno_id: id,
        periodo_inicio: ciclo.inicio,
        periodo_fim: ciclo.fim,
        modelo: cobranca.modelo,
        qtd_aulas: itensIncluidos.length,
        valor_aulas: totalPorAula(
          itensIncluidos.map((i) => ({ valor: Number((valores[i.id] ?? '0').replace(',', '.')) || 0 })),
          0,
        ),
        ajuste,
        ajuste_descricao: ajusteDescricao.trim() || null,
        total,
        vencimento,
        itemIds: itensIncluidos.map((i) => i.id),
      },
      {
        onSuccess: (faturaId) => navigate(`/financeiro/${faturaId}`, { replace: true }),
        onError: (e) => setErro((e as Error).message),
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-28">
      <header className="mb-4 flex items-center gap-3">
        <Link to={`/alunos/${id}`} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Fechar ciclo</h1>
          {aluno && <p className="truncate text-sm text-slate-500">{aluno.name}</p>}
        </div>
      </header>

      {(cobrancaLoading || participacoesLoading) && <p className="text-slate-500">Carregando…</p>}

      {!cobrancaLoading && !cobranca?.ativo && <p className="text-slate-500">Este aluno não tem cobrança configurada.</p>}

      {cobranca?.ativo && ciclo && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Ciclo {ciclo.inicio.slice(8, 10)}/{ciclo.inicio.slice(5, 7)} a {ciclo.fim.slice(8, 10)}/{ciclo.fim.slice(5, 7)}
          </p>

          {cicloNaoTerminou && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <span>O ciclo ainda não terminou. Fechar agora só considera as aulas já ocorridas até hoje.</span>
            </div>
          )}

          {cobranca.modelo === 'por_aula' && (
            <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Itens do ciclo</h2>
              {itensDoCiclo.length === 0 && <p className="text-sm text-slate-500">Nenhum item cobrável neste ciclo ainda.</p>}
              <ul className="divide-y divide-slate-100">
                {itensDoCiclo.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!incluidos[item.id]}
                      onChange={(e) => setIncluidos((v) => ({ ...v, [item.id]: e.target.checked }))}
                      className="size-5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-medium', !incluidos[item.id] && 'text-slate-400 line-through')}>
                        {item.aula ? formatarHoraInicioFim(item.aula.starts_at, item.aula.duration_min) : '—'}
                      </p>
                      <p className="text-xs text-slate-500">{ROTULO_STATUS[item.status] ?? item.status}</p>
                    </div>
                    <div className="w-24 shrink-0">
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        disabled={!incluidos[item.id]}
                        value={valores[item.id] ?? ''}
                        onChange={(e) => setValores((v) => ({ ...v, [item.id]: e.target.value }))}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cobranca.modelo === 'mensal' && (
            <div className="space-y-1 rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Mensalidade</h2>
              <p className="text-sm text-slate-500">
                {itensDoCiclo.length} aula{itensDoCiclo.length === 1 ? '' : 's'} no ciclo (informativo — o valor cobrado é fixo)
              </p>
              <p className="text-lg font-semibold">{formatarBRL(cobranca.valor_mensal ?? 0)}</p>
            </div>
          )}

          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Ajuste</h2>
            <div className="flex gap-2">
              <Field label="Valor (+ ou −)">
                <Input type="number" step="0.01" inputMode="decimal" value={ajusteTexto} onChange={(e) => setAjusteTexto(e.target.value)} />
              </Field>
              <Field label="Descrição">
                <Input value={ajusteDescricao} onChange={(e) => setAjusteDescricao(e.target.value)} placeholder="Opcional" />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-100 p-4 text-center">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold">{formatarBRL(total)}</p>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </div>
      )}

      {cobranca?.ativo && ciclo && (
        <div className="fixed inset-x-0 bottom-14 z-30 border-t border-slate-200 bg-white p-3">
          <div className="mx-auto max-w-2xl">
            <Button onClick={confirmar} className="w-full" disabled={fechar.isPending}>
              Fechar ciclo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
