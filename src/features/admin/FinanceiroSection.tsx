import { ListaSkeleton } from '@/components/Skeleton'
import { mapearErroSupabase } from '@/lib/erros'
import { formatarDataBR } from '@/lib/format'
import { useAdminFinanceiro } from './api'
import { formatarMoeda, taxaConversao } from './financeiro'
import { ReceitaERetencaoSection } from './IndicadoresSection'

function Cartao({ titulo, valor, nota, estimativa }: { titulo: string; valor: string; nota?: string; estimativa?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">
        {titulo}
        {estimativa && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">estimativa</span>}
      </p>
      <p className="mt-1 text-3xl font-bold text-accent">{valor}</p>
      {nota && <p className="mt-1 text-xs text-slate-500">{nota}</p>}
    </div>
  )
}

/**
 * Financeiro do negócio (o app do personal não cobra o aluno; aqui é a receita do Treino PP: planos dos personais).
 * Receita REAL só existe desde que o livro de pagamentos foi criado; o MRR é estimado pelo plano de cada assinante ativo.
 */
export function FinanceiroSection() {
  const { data: f, isLoading, error } = useAdminFinanceiro()
  if (isLoading) return <ListaSkeleton linhas={3} />
  if (error) return <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>
  if (!f) return null

  const conversao = taxaConversao(f)
  const desde = f.livro_desde ? formatarDataBR(f.livro_desde.slice(0, 10)) : null

  return (
    <div className="space-y-3">
      <h2 className="font-heading font-semibold text-accent">Financeiro do negócio</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Cartao titulo="Receita do mês" valor={formatarMoeda(f.receita_mes)} nota={`${f.pagamentos_mes} ${f.pagamentos_mes === 1 ? 'pagamento aprovado' : 'pagamentos aprovados'} no mês`} />
        <Cartao titulo="Receita registrada (total)" valor={formatarMoeda(f.receita_total)} nota={desde ? `Registrada desde ${desde}; pagamentos anteriores não estão no registro.` : 'Ainda sem pagamentos registrados.'} />
        <Cartao titulo="MRR (receita mensal recorrente)" valor={formatarMoeda(f.mrr_estimado)} estimativa nota="Assinantes ativos × valor mensal do plano (R$ 15, R$ 13 e R$ 10)." />
        <Cartao titulo="Assinantes ativos" valor={String(f.assinantes_ativos)} nota={`${f.trials_ativos} em trial agora`} />
        <Cartao
          titulo="Conversão de trial"
          valor={conversao === null ? '—' : `${conversao}%`}
          nota={conversao === null ? 'Nenhum trial terminou ainda.' : `${f.ja_pagaram} já pagaram ÷ ${f.trials_encerrados} trials encerrados`}
        />
        <Cartao titulo="Não renovaram" valor={String(f.nao_renovaram)} nota="Plano pago que venceu e não foi renovado (pagamento avulso, sem renovação automática). Zero quer dizer que nenhum plano pago venceu sem renovar; não é taxa de churn." />
      </div>
      <p className="text-xs text-slate-500">
        Valores do Treino PP (planos dos personais). O que o personal recebe dos alunos não aparece aqui: o app não cobra o aluno.
      </p>
      <div className="pt-3">
        <ReceitaERetencaoSection />
      </div>
    </div>
  )
}
