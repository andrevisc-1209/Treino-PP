import { ErroComRetry } from '@/components/ErroComRetry'
import { useMemo, useState } from 'react'
import { ListaSkeleton } from '@/components/Skeleton'
import { useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LinkConfiguracoes } from '@/components/LinkConfiguracoes'
import { PuxarParaAtualizar } from '@/components/PuxarParaAtualizar'
import { RolagemHorizontal } from '@/components/RolagemHorizontal'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Landmark, TriangleAlert } from 'lucide-react'
import { EstadoVazio } from '@/components/EstadoVazio'
import { useAlunos } from '@/features/alunos/api'
import { ROTA_IMPORTAR } from '@/features/alunos/importar/via'
import { formatarBRL } from '@/lib/moeda'
import { hojeSP, limitesDoDiaSP } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { cicloAtual, itensCobraveisDoCiclo, totalPorAula } from './calc'
import { alunosComCicloParaFechar } from './cicloPendente'
import { estaVencida, rotuloModelo, SeloFatura } from './rotulos'
import { recebidoPorMes } from './desempenho'
import { acaoNecessaria, ehSemValor, linhasDePacote, prioridadeDaLinha } from './listaFinanceiro'
import { usePacotesAtivos } from '@/features/pacotes/api'
import { previsaoDoMes, ultimoDiaDoMes } from './previsaoDoMes'
import { useAulasNoIntervalo } from '@/features/agenda/api'
import { BottomSheet } from '@/components/ui'
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
      <p className="text-xs text-slate-500">
        {qtd} {qtd === 1 ? 'fatura' : 'faturas'}
      </p>
    </div>
  )
}

export function FinanceiroPage() {
  const { data: alunosCobranca, isLoading: alunosLoading, error: erroAlunos, refetch: recarregarAlunos } = useAlunosComCobranca()
  const { data: alunos } = useAlunos()
  const { data: faturas, isLoading: faturasLoading, error: erroFaturas, refetch: recarregarFaturas } = useFaturasTodas()
  const { data: participacoes } = useParticipacoesCobraveisTodas()
  const { data: pacotesAtivos } = usePacotesAtivos()
  const [params] = useSearchParams()
  const [filtro, setFiltro] = useState<Filtro>(params.get('filtro') === 'a_fechar' ? 'a_fechar' : 'todos')
  const [mostrarSemValor, setMostrarSemValor] = useState(false)
  const [previsaoAberta, setPrevisaoAberta] = useState(false)
  // aulas agendadas de agora até o fim do mês (a projeção da previsão); o "agora" fica fixo para a consulta não se refazer a cada render
  const [agora] = useState(() => new Date())
  const qc = useQueryClient()

  const hoje = hojeSP()
  const mesAtual = hoje.slice(0, 7)
  const fimDoMes = useMemo(() => limitesDoDiaSP(ultimoDiaDoMes(hoje)).fim, [hoje])
  const { data: aulasAteFimDoMes } = useAulasNoIntervalo(agora, fimDoMes)

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

  // alunos de pacote: a cobrança nasce na venda e entra nos filtros pela situação da fatura (paga, a receber, em atraso)
  const linhasPacote = useMemo(
    () =>
      linhasDePacote(
        [...(pacotesAtivos?.values() ?? [])].map((x) => x.pacote),
        faturas ?? [],
        new Map((alunos ?? []).map((a) => [a.id, a.name] as const)),
        hoje,
      ).filter((l) => filtro === 'todos' || l.estado === filtro),
    [pacotesAtivos, faturas, alunos, hoje, filtro],
  )
  const previsao = useMemo(
    () =>
      previsaoDoMes({
        hojeISO: hoje,
        faturas: faturas ?? [],
        cobrancas: alunosCobranca ?? [],
        participacoesAbertas: participacoes ?? [],
        aulasAgendadas: aulasAteFimDoMes ?? [],
        idsAlunosAtivos: (alunos ?? []).map((a) => a.id),
        idsComPacote: [...(pacotesAtivos?.keys() ?? [])],
      }),
    [hoje, faturas, alunosCobranca, participacoes, aulasAteFimDoMes, alunos, pacotesAtivos],
  )
  const recebimentos = useMemo(() => recebidoPorMes(faturas ?? [], hoje, 6), [faturas, hoje])
  const idsCicloEncerrado = useMemo(
    () => new Set(alunosComCicloParaFechar({ cobrancas: alunosCobranca ?? [], faturas: faturas ?? [], participacoes: participacoes ?? [], hoje })),
    [alunosCobranca, faturas, participacoes, hoje],
  )
  // por padrão a lista mostra o que tem valor: ciclo em aberto sem aula (R$ 0,00) fica atrás do botão "Mostrar sem valor"
  const doFiltro = filtro === 'todos' ? linhas : linhas.filter((l) => l.estado === filtro)
  const qtdSemValor = doFiltro.filter((l) => ehSemValor(l, idsCicloEncerrado.has(l.alunoId))).length
  const linhasFiltradas = doFiltro
    .filter((l) => mostrarSemValor || !ehSemValor(l, idsCicloEncerrado.has(l.alunoId)))
    .toSorted((a, b) => prioridadeDaLinha(a, idsCicloEncerrado.has(a.alunoId)) - prioridadeDaLinha(b, idsCicloEncerrado.has(b.alunoId)))
  const acao = acaoNecessaria(faturasEmAtraso, idsCicloEncerrado.size)
  const poucosMeses = recebimentos.filter((r) => r.total > 0).length <= 2

  return (
    <PuxarParaAtualizar onAtualizar={() => qc.invalidateQueries()}>
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <LinkConfiguracoes />
      </header>

      {(alunosLoading || faturasLoading) && <ListaSkeleton />}
      {(erroAlunos || erroFaturas) && (
        <ErroComRetry
          erro={erroAlunos ?? erroFaturas}
          onTentar={() => {
            recarregarAlunos()
            recarregarFaturas()
          }}
          className="mb-4"
        />
      )}

      {!alunosLoading && !faturasLoading && !erroAlunos && !erroFaturas && (
        <>
          {alunos?.length === 0 && (
            <div className="mb-4">
              <EstadoVazio
                icone={<Landmark size={24} />}
                titulo="Organize suas cobranças"
                texto="Cadastre seus alunos e defina o valor de cada um: o app fecha o ciclo, gera a fatura e deixa a mensagem pronta para você enviar."
                acao={{ rotulo: 'Adicionar meus alunos', to: ROTA_IMPORTAR }}
              />
            </div>
          )}
          {(alunos?.length ?? 0) > 0 && (alunosCobranca?.length ?? 0) === 0 && (pacotesAtivos?.size ?? 0) === 0 && (
            <div className="mb-4">
              <EstadoVazio
                icone={<Landmark size={24} />}
                titulo="Defina a cobrança dos seus alunos"
                texto="Na ficha de cada aluno, defina o valor e o ciclo: o app gera a fatura e deixa a mensagem pronta para você enviar."
                acao={{ rotulo: 'Ver meus alunos', to: '/alunos' }}
              />
            </div>
          )}
          {/* Celular: carrossel deslizável com encaixe. Tablet/desktop: três cards lado a lado + gráfico. */}
          <RolagemHorizontal snap className="mb-4 md:grid md:grid-cols-4 md:gap-2 md:overflow-visible">
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
            {((alunosCobranca?.length ?? 0) > 0 || (pacotesAtivos?.size ?? 0) > 0) && (
            <button
              type="button"
              onClick={() => setPrevisaoAberta(true)}
              aria-label={`Previsto no mês: ${formatarBRL(previsao.total)}. Ver detalhes`}
              className="w-[42%] shrink-0 snap-start rounded-2xl border border-brand/30 bg-brand-soft p-3 text-left shadow-sm active:bg-white md:w-auto md:shrink"
            >
              <p className="text-xs text-slate-600">Previsto no mês</p>
              <p className="text-lg font-bold">{formatarBRL(previsao.total)}</p>
              <p className="text-xs font-medium text-brand-hover">Ver detalhes ›</p>
            </button>
            )}
          </RolagemHorizontal>

          {acao && (
            <section className="mb-4 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-300" aria-label="Ação necessária">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <TriangleAlert size={16} aria-hidden /> Ação necessária
              </h2>
              <ul className="mt-2 space-y-1">
                {acao.qtdAtraso > 0 && (
                  <li>
                    <button type="button" onClick={() => setFiltro('atraso')} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-white px-3 text-left text-sm font-medium active:bg-amber-100">
                      <span>
                        {acao.qtdAtraso} {acao.qtdAtraso === 1 ? 'fatura em atraso' : 'faturas em atraso'} · {formatarBRL(acao.totalAtraso)}
                      </span>
                      <span className="flex shrink-0 items-center text-brand-hover">
                        Ver <ChevronRight size={16} aria-hidden />
                      </span>
                    </button>
                  </li>
                )}
                {acao.qtdCiclosParaFechar > 0 && (
                  <li>
                    <button type="button" onClick={() => setFiltro('a_fechar')} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-white px-3 text-left text-sm font-medium active:bg-amber-100">
                      <span>
                        {acao.qtdCiclosParaFechar} {acao.qtdCiclosParaFechar === 1 ? 'ciclo encerrado para fechar' : 'ciclos encerrados para fechar'}
                      </span>
                      <span className="flex shrink-0 items-center text-brand-hover">
                        Ver <ChevronRight size={16} aria-hidden />
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            </section>
          )}

          <section className="mb-4 hidden rounded-2xl bg-white p-4 shadow-sm md:block">
            <h2 className="mb-2 text-sm font-semibold">Recebido nos últimos 6 meses</h2>
            {!recebimentos.some((r) => r.total > 0) ? (
              <p className="text-sm text-slate-600">Os valores e o gráfico aparecem conforme suas cobranças forem registradas.</p>
            ) : (
            <ResponsiveContainer width="100%" height={poucosMeses ? 112 : 160}>
              <BarChart data={recebimentos} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={48} tickFormatter={(v) => formatarBRL(Number(v)).replace(',00', '')} />
                <Tooltip formatter={(v) => [formatarBRL(Number(v)), 'Recebido']} />
                <Bar dataKey="total" fill="#367c39" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            )}
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

          {linhasFiltradas.length === 0 && linhasPacote.length === 0 && (alunosCobranca?.length ?? 0) > 0 && (
            <p className="text-sm text-slate-600">{qtdSemValor > 0 ? 'Nenhuma cobrança com valor neste filtro.' : 'Nenhum aluno neste filtro.'}</p>
          )}

          <ul className="space-y-2">
            {linhasPacote.map((l) => (
              <li key={`pacote-${l.alunoId}`}>
                <Link to={`/financeiro/${l.faturaId}`} className="block rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-medium">{l.nome}</p>
                    <p className="shrink-0 text-lg font-bold">{formatarBRL(l.total)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="min-w-0 text-sm text-slate-500">Pacote de aulas</p>
                    <SeloFatura status={l.status as FaturaStatus} vencida={l.estado === 'atraso'} />
                  </div>
                </Link>
              </li>
            ))}
            {linhasFiltradas.map((l) => (
              <li key={l.alunoId}>
                <Link to={`/alunos/${l.alunoId}/fechar-ciclo`} className="block rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-medium">{l.nome}</p>
                    <p className="shrink-0 text-lg font-bold">{formatarBRL(l.totalCiclo)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="min-w-0 text-sm text-slate-500">
                      {rotuloModelo(l.modelo)} · {l.qtdAulasCiclo} aula{l.qtdAulasCiclo === 1 ? '' : 's'} · fecha em {l.ciclo.fim.slice(8, 10)}/{l.ciclo.fim.slice(5, 7)}
                    </p>
                    {l.ultimaFatura && l.estado !== 'a_fechar' ? (
                      <SeloFatura status={l.ultimaFatura.status as FaturaStatus} vencida={l.estado === 'atraso'} />
                    ) : (
                      <span
                        className={
                          idsCicloEncerrado.has(l.alunoId)
                            ? 'shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900'
                            : 'shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600'
                        }
                      >
                        {idsCicloEncerrado.has(l.alunoId) ? 'Ciclo encerrado' : 'A fechar'}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {qtdSemValor > 0 && (
            <button
              type="button"
              aria-pressed={mostrarSemValor}
              onClick={() => setMostrarSemValor((v) => !v)}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-brand-hover active:bg-slate-100"
            >
              {mostrarSemValor ? 'Ocultar sem valor' : `Mostrar sem valor (${qtdSemValor})`}
            </button>
          )}
        </>
      )}
    </div>
      <BottomSheet open={previsaoAberta} onClose={() => setPrevisaoAberta(false)} title="Previsto no mês">
        <div className="space-y-3">
          <ul className="divide-y divide-slate-100 text-sm">
            {[
              { rotulo: 'Já recebido', ajuda: 'faturas pagas neste mês', valor: previsao.recebido },
              { rotulo: 'A receber', ajuda: 'faturas abertas ou enviadas', valor: previsao.aReceber },
              { rotulo: 'Realizado, ainda sem fatura', ajuda: 'aulas já dadas aos alunos "por aula"', valor: previsao.realizadoNaoFaturado },
              { rotulo: 'Mensalidades do ciclo', ajuda: 'alunos "mensal" ainda sem fatura', valor: previsao.mensalidades },
            ].map((l) => (
              <li key={l.rotulo} className="flex items-start justify-between gap-3 py-2.5">
                <span>
                  <span className="block font-medium">{l.rotulo}</span>
                  <span className="block text-xs text-slate-600">{l.ajuda}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatarBRL(l.valor)}</span>
              </li>
            ))}
            <li className="flex items-start justify-between gap-3 py-2.5 text-slate-700">
              <span>
                <span className="block font-medium">Aulas agendadas até o fim do mês</span>
                <span className="block text-xs">Estimativa: depende de o aluno vir</span>
              </span>
              <span className="shrink-0 font-semibold">{formatarBRL(previsao.agendado)}</span>
            </li>
            <li className="flex items-center justify-between gap-3 pt-3 text-base">
              <span className="font-bold">Previsto no mês</span>
              <span className="font-bold">{formatarBRL(previsao.total)}</span>
            </li>
          </ul>
          {previsao.alunosSemValor > 0 && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              {previsao.alunosSemValor} {previsao.alunosSemValor === 1 ? 'aluno sem valor definido não entra' : 'alunos sem valor definido não entram'} na previsão.{' '}
              <Link to="/alunos" className="font-semibold underline">
                Definir valores
              </Link>
            </p>
          )}
          <p className="text-xs text-slate-600">
            Soma o que já entrou, o que está a receber e o que está a caminho. Os pagamentos podem cair no mês seguinte, e o valor das aulas agendadas pode mudar se houver falta ou cancelamento.
          </p>
        </div>
      </BottomSheet>
    </PuxarParaAtualizar>
  )
}