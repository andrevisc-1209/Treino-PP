import { ErroComRetry } from '@/components/ErroComRetry'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Gift } from 'lucide-react'
import { LinkConfiguracoes } from '@/components/LinkConfiguracoes'
import { formatarDataCompleta, hojeSP } from '@/lib/datas'
import { AulaAcoesSheet } from './AulaAcoesSheet'
import { ListaSkeleton } from '@/components/Skeleton'
import { AulaCard } from './AulaCard'
import { ProximaAulaCard } from './ProximaAulaCard'
import { estaAtrasada, organizarAulasDoDia } from './proximaAula'
import { decidirComecar } from './comecarAula'
import { NovaAulaAvulsaSheet } from './NovaAulaAvulsaSheet'
import { useAulasDoDia, useGerarAulasDiarias, type Aula } from './api'
import iconMark from '@/assets/brand/icon-mark.png'
import { OnboardingChecklist } from '@/features/onboarding/OnboardingChecklist'
import { AtivacaoCard } from '@/features/onboarding/AtivacaoCard'
import { useAtivacao } from '@/features/onboarding/useAtivacao'
import { CiclosParaFecharCard } from './CiclosParaFecharCard'
import { PixCard } from './PixCard'
import { ResumoSemAulas } from './ResumoSemAulas'
import { ClimaCard } from '@/components/ClimaCard'
import { AtividadeRecente } from '@/features/execucoes/AtividadeRecente'

export function HojePage() {
  useGerarAulasDiarias()
  const navigate = useNavigate()
  const { emAtivacao, total } = useAtivacao()
  const hoje = hojeSP()
  const { data: aulas, isLoading, error, refetch } = useAulasDoDia(hoje)
  const [aulaAberta, setAulaAberta] = useState<Aula | null>(null)
  const [passoInicial, setPassoInicial] = useState<'menu' | 'iniciar'>('menu')
  const [novaAulaAberta, setNovaAulaAberta] = useState(false)

  const [agora] = useState(() => Date.now())
  // o destaque avança conforme as aulas são iniciadas, encerradas ou passam do horário (recalcula a cada carga da lista)
  const organizadas = useMemo(() => (aulas ? organizarAulasDoDia(aulas, agora) : null), [aulas, agora])
  const concluidas = aulas?.filter((a) => a.status === 'realizada').length ?? 0

  const abrirMenu = (a: Aula) => {
    setPassoInicial('menu')
    setAulaAberta(a)
  }

  const comecar = (a: Aula) => {
    const decisao = decidirComecar(a)
    if (decisao.tipo === 'navegar') navigate(decisao.to)
    else if (decisao.tipo === 'escolher') {
      setPassoInicial('iniciar')
      setAulaAberta(a)
    } else abrirMenu(a)
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{formatarDataCompleta(hoje)}</h1>
          {aulas && aulas.length > 0 && (
            <p className="text-sm text-slate-500">
              {aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'} · {concluidas} concluídas
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <img src={iconMark} alt="Personal Perto" className="h-6 w-auto" />
          <LinkConfiguracoes />
        </div>
      </header>

      <AtivacaoCard />
      <OnboardingChecklist />

      {isLoading && <ListaSkeleton />}
      {error && <ErroComRetry erro={error} onTentar={() => refetch()} className="mb-4" />}

      {aulas && aulas.length === 0 && !emAtivacao && <ResumoSemAulas onMarcarAula={() => setNovaAulaAberta(true)} />}

      {organizadas?.destaque && organizadas.situacao && (
        <ProximaAulaCard
          aula={organizadas.destaque}
          situacao={organizadas.situacao}
          outrasNoHorario={organizadas.outrasNoHorario}
          onClick={() => abrirMenu(organizadas.destaque!)}
          onComecar={() => comecar(organizadas.destaque!)}
        />
      )}

      {organizadas && !organizadas.destaque && aulas && aulas.length > 0 && (
        <p className="mb-4 rounded-2xl bg-brand-soft p-4 text-sm font-medium text-brand-hover">
          Sem mais aulas por fazer hoje: {concluidas} {concluidas === 1 ? 'concluída' : 'concluídas'}.
        </p>
      )}

      {organizadas && (organizadas.seguintes.length > 0 || organizadas.encerradas.length > 0) && (
        <section className="mb-4" aria-labelledby="proximas-aulas">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="proximas-aulas" className="text-sm font-semibold text-slate-600">
              {organizadas.destaque ? 'Próximas aulas' : 'Aulas de hoje'}
            </h2>
            <Link to="/agenda" className="flex min-h-11 items-center text-sm font-medium text-brand-hover">
              Ver agenda
            </Link>
          </div>
          <div className="space-y-2">
            {[...organizadas.seguintes, ...organizadas.encerradas].map((a) => (
              <AulaCard key={a.id} aula={a} localResumido atrasada={estaAtrasada(a, agora)} onClick={() => abrirMenu(a)} onComecar={() => comecar(a)} />
            ))}
          </div>
        </section>
      )}

      <CiclosParaFecharCard />
      <ClimaCard compacto />
      {!emAtivacao && <PixCard />}
      <AtividadeRecente />
      {!emAtivacao && (total ?? 0) >= 3 && (
        <Link to="/configuracoes" className="mb-4 flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm active:bg-slate-50">
          <Gift size={20} className="shrink-0 text-brand-hover" aria-hidden />
          <span>
            <span className="block text-sm font-semibold">Indique um personal</span>
            <span className="block text-xs text-slate-600">Vocês dois ganham 1 mês grátis</span>
          </span>
        </Link>
      )}

      <AulaAcoesSheet aula={aulaAberta} onClose={() => setAulaAberta(null)} passoInicial={passoInicial} />
      <NovaAulaAvulsaSheet open={novaAulaAberta} onClose={() => setNovaAulaAberta(false)} dataInicial={hoje} />
    </div>
  )
}
