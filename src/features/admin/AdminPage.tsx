import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CreditCard,
  GraduationCap,
  Hourglass,
  KeyRound,
  LogOut,
  MoreVertical,
  Pencil,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { montarDataHoraSP, hojeSP } from '@/lib/datas'
import { validarCPF, mascararCPF } from '@/lib/cpf'
import { mapearErroSupabase } from '@/lib/erros'
import { ERROS } from '@/lib/mensagens'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { APP_NAME } from '@/config/app'
import logo from '@/assets/brand/logo-personal-perto-sm.png'
import { useIsAdmin } from './useIsAdmin'
import { MfaDesafio } from './MfaDesafio'
import { useMfa } from './mfa'
import { useInadimplentes, type Inadimplente } from './useInadimplentes'
import { ConsentimentosSection } from './ConsentimentosSection'
import { IndicacoesSection } from './IndicacoesSection'
import { fimDoAcesso } from './indicacoes'
import { RelatosSection } from './RelatosSection'
import { ABAS_ADMIN, abaDaUrl, descreverTreinos, linkMapsCidade, rotuloCidade, type AbaAdmin, type MetricasPersonal } from './personais'
import { HistoricoSection } from './HistoricoSection'
import { FinanceiroSection } from './FinanceiroSection'
import { IndicadoresSection } from './IndicadoresSection'
import { confirmarAcao } from '@/components/ConfirmSheet'
import {
  useAdminAlterarCpf,
  useAdminAlterarPlano,
  useAdminAlterarTrial,
  useAdminPersonais,
  useAdminRegioes,
  useAdminBonus,
  useAdminPersonaisMetricas,
  useAdminRelatos,
  useAdminResetSenha,
  useAdminResumo,
  type PersonalAdmin,
} from './api'
import type { Plano, StatusAssinatura } from '@/features/assinatura/useAssinatura'

function formatarDataHoraBR(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
}

const ROTULO_STATUS: Record<StatusAssinatura, string> = {
  trial: 'Trial',
  ativa: 'Ativa',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
}

const BADGE_STATUS: Record<StatusAssinatura, string> = {
  trial: 'bg-amber-50 text-amber-700',
  ativa: 'bg-brand-soft text-brand-hover',
  expirada: 'bg-red-50 text-red-700',
  cancelada: 'bg-slate-100 text-slate-600',
}

export function AdminPage() {
  const { session, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  if (authLoading || adminLoading) return <div className="p-8 text-center text-slate-500">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />
  // Nunca mostra nada pra quem não é admin — nem uma tela de "sem permissão".
  if (!isAdmin) return <Navigate to="/" replace />

  return <PortaoMfa />
}

/**
 * Porta do painel (MFA): o servidor só aceita ações de admin em sessão aal2 (migration 20261053). Autenticador cadastrado e sessão só com
 * Google/senha → pede o código; sem autenticador → leva para cadastrar em /admin/seguranca. Só monta o dashboard (e suas chamadas admin) em aal2.
 */
function PortaoMfa() {
  const mfa = useMfa()
  if (mfa.isLoading) return <div className="p-8 text-center text-slate-500">Carregando…</div>
  if (mfa.isError || !mfa.data) return <div className="p-8 text-center text-sm text-red-600">Não foi possível verificar a segurança da conta. Recarregue a página.</div>
  if (mfa.data.estado === 'sem_fator') return <Navigate to="/admin/seguranca" replace />
  if (mfa.data.estado === 'precisa_codigo') return <MfaDesafio factorId={mfa.data.fatores[0].id} onOk={mfa.recarregar} />
  return <AdminDashboard />
}

function AdminHeader() {
  const navigate = useNavigate()
  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-accent">
      <div className="flex items-center gap-2">
        <img src={logo} alt={APP_NAME} className="h-10 w-auto" />
        <h1 className="font-heading text-lg font-bold">Painel Admin</h1>
      </div>
      <div className="flex items-center gap-1">
        <Link to="/admin/seguranca" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm text-slate-700 active:bg-slate-100">
          <ShieldCheck size={16} aria-hidden /> Segurança
        </Link>
        <Button variant="ghost" onClick={sair} className="min-h-11 px-3 text-slate-700 hover:bg-slate-100 active:bg-slate-100">
          <LogOut size={16} /> Sair
        </Button>
      </div>
    </header>
  )
}

/** Fim do acesso do personal; com mês grátis (indicação) mostra a data do bônus e uma etiqueta. */
function FimDoAcesso({ p, bonusAte }: { p: PersonalAdmin; bonusAte: string | undefined }) {
  const { data, comBonus } = fimDoAcesso(p, bonusAte)
  return (
    <>
      {formatarDataHoraBR(data)}
      {comBonus && <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-hover">mês grátis</span>}
    </>
  )
}

function AdminDashboard() {
  const resumo = useAdminResumo()
  const personais = useAdminPersonais()
  const regioes = useAdminRegioes()
  const metricas = useAdminPersonaisMetricas()
  const bonus = useAdminBonus()
  const { inadimplentes } = useInadimplentes()
  const [params, setParams] = useSearchParams()
  const aba = abaDaUrl(params.get('aba'))
  const irParaAba = (id: AbaAdmin) => setParams({ aba: id }, { replace: true })
  const relatos = useAdminRelatos()
  const relatosEmAberto = (relatos.data ?? []).filter((r) => r.status !== 'resolvido').length
  // a busca vive na URL (?busca=), para o "Ver cadastro" dos relatos abrir a lista já filtrada
  const busca = params.get('busca') ?? ''
  const setBusca = (v: string) =>
    setParams((atual) => {
      const novo = new URLSearchParams(atual)
      if (v) novo.set('busca', v)
      else novo.delete('busca')
      return novo
    }, { replace: true })
  const [menuPersonal, setMenuPersonal] = useState<PersonalAdmin | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<'' | StatusAssinatura>('')
  const [acao, setAcao] = useState<{ tipo: 'reset' | 'trial' | 'plano' | 'cpf'; personal: PersonalAdmin } | null>(null)

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (personais.data ?? []).filter((p) => {
      const bateBusca = !termo || p.name.toLowerCase().includes(termo) || (p.email ?? '').toLowerCase().includes(termo)
      const bateStatus = !filtroStatus || p.status === filtroStatus
      return bateBusca && bateStatus
    })
  }, [personais.data, busca, filtroStatus])

  const visaoGeral = useMemo(() => {
    const lista = personais.data ?? []
    const agora = Date.now()
    const emTresDias = agora + 3 * 86_400_000
    return {
      ativos: lista.filter((p) => p.status === 'trial' || p.status === 'ativa').length,
      emTrial: lista.filter((p) => p.status === 'trial').length,
      trialExpirando3Dias: lista.filter((p) => p.status === 'trial' && p.trial_fim && new Date(p.trial_fim).getTime() <= emTresDias && !bonus.data?.has(p.id)).length,
      inadimplentes: lista.filter((p) => p.status === 'expirada' && !bonus.data?.has(p.id)).length,
    }
  }, [personais.data, bonus.data])

  return (
    <div className="min-h-full bg-slate-50 pb-10">
      <AdminHeader />

      <div className="mx-auto max-w-5xl space-y-6 p-4">
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Seções do painel">
          {ABAS_ADMIN.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => irParaAba(t.id)}
              aria-current={aba === t.id ? 'page' : undefined}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${aba === t.id ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700'}`}
            >
              {t.rotulo}
              {t.id === 'suporte' && relatosEmAberto > 0 && ` (${relatosEmAberto})`}
            </button>
          ))}
        </nav>

        {aba === 'geral' && (
          <>
        <div>
          <h2 className="mb-3 font-heading font-semibold text-accent">Visão geral</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <CardResumo icone={<UserCheck size={20} />} label="Profissionais ativos" valor={visaoGeral.ativos} />
            <CardResumo icone={<Hourglass size={20} />} label="Em trial" valor={visaoGeral.emTrial} />
            <CardResumo
              icone={<AlertTriangle size={20} />}
              label="Trial expirando em 3 dias"
              valor={visaoGeral.trialExpirando3Dias}
              alerta="laranja"
            />
            <CardResumo icone={<AlertTriangle size={20} />} label="Inadimplentes" valor={visaoGeral.inadimplentes} alerta="vermelho" />
            <CardResumo icone={<GraduationCap size={20} />} label="Total de alunos" valor={resumo.data?.total_alunos} />
          </div>
        </div>

        <InadimplentesSection inadimplentes={inadimplentes} onAjustarTrial={(p) => setAcao({ tipo: 'trial', personal: p })} />

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-heading font-semibold text-accent">Cidades (por cadastro) — {resumo.data?.regioes_ativas ?? '—'}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Cidade</th>
                  <th className="py-2 pr-3">Personais</th>
                </tr>
              </thead>
              <tbody>
                {(regioes.data ?? []).map((r, i) => (
                  <tr key={r.cidade} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                    <td className="py-2 pr-3 text-slate-700">
                      <CidadeComMaps cidade={r.cidade} />
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{r.qtd}</td>
                  </tr>
                ))}
                {(regioes.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-slate-500">
                      Nenhum personal com cidade cadastrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}

        {aba === 'personais' && (
          <>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-heading font-semibold text-accent">Personais</h2>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as '' | StatusAssinatura)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="trial">Trial</option>
              <option value="ativa">Ativa</option>
              <option value="expirada">Expirada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {/* Desktop/tablet: tabela com zebra + hover. Mobile: cards empilhados (abaixo). */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">E-mail</th>
                  <th className="py-2 pr-3">Cidade</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Trial/plano até</th>
                  <th className="py-2 pr-3">Alunos</th>
                  <th className="py-2 pr-3">Treinos</th>
                  <th className="py-2 pr-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((p, i) => (
                  <tr key={p.id} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                    <td className="py-2.5 pr-3 font-medium text-slate-800">{p.name || '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{p.email ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      <CidadeComMaps cidade={p.cidade} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      <FimDoAcesso p={p} bonusAte={bonus.data?.get(p.id)} />
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{p.qtd_alunos}</td>
                    <td className="py-2.5 pr-3 text-xs text-slate-600">
                      <TreinosDoPersonal metricas={metricas.data?.get(p.id)} carregando={metricas.isLoading} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <BotaoMenuPersonal personal={p} onAbrir={() => setMenuPersonal(p)} />
                    </td>
                  </tr>
                ))}
                {listaFiltrada.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      Nenhum personal encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 sm:hidden">
            {listaFiltrada.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{p.name || '—'}</p>
                    <p className="truncate text-xs text-slate-500">{p.email ?? '—'}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-500">
                  <div>
                    <dt className="inline">Cidade: </dt>
                    <dd className="inline text-slate-700">
                      <CidadeComMaps cidade={p.cidade} />
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Alunos: </dt>
                    <dd className="inline text-slate-700">{p.qtd_alunos}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="mb-0.5">Treinos</dt>
                    <dd className="text-slate-700">
                      <TreinosDoPersonal metricas={metricas.data?.get(p.id)} carregando={metricas.isLoading} />
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="inline">Trial/plano até: </dt>
                    <dd className="inline text-slate-700">
                      <FimDoAcesso p={p} bonusAte={bonus.data?.get(p.id)} />
                    </dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <BotaoMenuPersonal personal={p} onAbrir={() => setMenuPersonal(p)} rotulo />
                </div>
              </div>
            ))}
            {listaFiltrada.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Nenhum personal encontrado.</p>}
          </div>
        </div>

          </>
        )}

        {aba === 'indicadores' && <IndicadoresSection />}

        {aba === 'financeiro' && <FinanceiroSection />}

        {aba === 'indicacoes' && <IndicacoesSection />}

        {aba === 'suporte' && (
          <>
        <RelatosSection />

          </>
        )}

        {aba === 'privacidade' && (
          <>
        <ConsentimentosSection />

            <HistoricoSection />
          </>
        )}
      </div>

      <BottomSheet open={!!menuPersonal} onClose={() => setMenuPersonal(null)} title={menuPersonal ? menuPersonal.name || menuPersonal.email || 'Personal' : ''}>
        {menuPersonal && (
          <AcoesPersonal
            personal={menuPersonal}
            onEscolher={(tipo) => {
              setAcao({ tipo, personal: menuPersonal })
              setMenuPersonal(null)
            }}
          />
        )}
      </BottomSheet>

      {acao && <ModalAcao tipo={acao.tipo} personal={acao.personal} onFechar={() => setAcao(null)} />}
    </div>
  )
}

/** Cidade/UF do cadastro do personal, com link para o Google Maps; vazio = "Não informado". */
function CidadeComMaps({ cidade }: { cidade: string | null }) {
  const link = linkMapsCidade(cidade)
  if (!link) return <span className="text-slate-500">{rotuloCidade(cidade)}</span>
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="text-brand-hover underline" aria-label={`${rotuloCidade(cidade)} no Google Maps`}>
      {rotuloCidade(cidade)}
    </a>
  )
}

/** Quantidades de treinos do personal (só números; nada de dados de alunos). */
function TreinosDoPersonal({ metricas, carregando }: { metricas: MetricasPersonal | undefined; carregando: boolean }) {
  if (carregando) return <span className="text-slate-500">…</span>
  const d = descreverTreinos(metricas)
  return (
    <span className="block space-y-0.5">
      <span className="block">Montados: {d.montados}</span>
      <span className="block">Realizados: {d.realizados}</span>
      <span className="block">Últimos 30 dias: {d.ultimos30}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: StatusAssinatura | null }) {
  if (!status) return <span className="text-slate-500">—</span>
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_STATUS[status]}`}>{ROTULO_STATUS[status]}</span>
}

const BORDA_ALERTA: Record<'laranja' | 'vermelho', string> = {
  laranja: 'border-l-4 border-l-amber-500',
  vermelho: 'border-l-4 border-l-red-500',
}
const ICONE_ALERTA: Record<'laranja' | 'vermelho', string> = {
  laranja: 'bg-amber-50 text-amber-600',
  vermelho: 'bg-red-50 text-red-600',
}

function CardResumo({
  icone,
  label,
  valor,
  alerta,
}: {
  icone: ReactNode
  label: string
  valor: number | undefined
  /** Card de atenção: borda colorida à esquerda + ícone na mesma cor. */
  alerta?: 'laranja' | 'vermelho'
}) {
  return (
    <div className={`flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 ${alerta ? BORDA_ALERTA[alerta] : ''}`}>
      <div>
        <p className="text-3xl font-bold text-accent">{valor ?? '—'}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${alerta ? ICONE_ALERTA[alerta] : 'bg-brand-soft text-brand-hover'}`}>
        {icone}
      </div>
    </div>
  )
}

function InadimplentesSection({ inadimplentes, onAjustarTrial }: { inadimplentes: Inadimplente[]; onAjustarTrial: (p: PersonalAdmin) => void }) {
  const [aberto, setAberto] = useState(inadimplentes.length > 0)
  const estenderTrial = useAdminAlterarTrial()

  // sem pendência: uma linha discreta em vez de um card inteiro
  if (inadimplentes.length === 0) {
    return (
      <p className="flex items-center gap-2 px-1 text-sm text-slate-500">
        <CircleCheck size={16} className="text-brand-hover" aria-hidden /> Nenhum profissional inadimplente no momento.
      </p>
    )
  }

  const estenderRapido = async (item: Inadimplente) => {
    const nome = item.personal.name || item.personal.email
    const ok = await confirmarAcao({
      titulo: 'Estender trial em 7 dias?',
      mensagem: `O trial de ${nome} passa a terminar daqui a 7 dias e o acesso dele é liberado de novo. Você pode ajustar depois em "Ajustar trial".`,
      textoConfirmar: 'Estender 7 dias',
    })
    if (!ok) return
    try {
      const novoFim = new Date(Date.now() + 7 * 86_400_000).toISOString()
      await estenderTrial.mutateAsync({ professionalId: item.personal.id, novoFim })
      mostrarInfoGlobal(`Trial de ${item.personal.name || item.personal.email} estendido por mais 7 dias.`)
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <h2 className="flex items-center gap-2 font-heading font-semibold text-accent">
          <AlertTriangle size={18} className="text-red-500" /> Atenção: Inadimplentes
          {inadimplentes.length > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{inadimplentes.length}</span>}
        </h2>
        {aberto ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>

      {aberto && (
        <div className="mt-4">
          {inadimplentes.length === 0 ? (
            <p className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <CircleCheck size={18} className="text-brand-hover" /> Nenhum profissional inadimplente no momento.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {inadimplentes.map((item) => (
                <li key={item.personal.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{item.personal.name || '—'}</p>
                    <p className="truncate text-xs text-slate-500">{item.personal.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${COR_DIAS_VENCIDO[item.cor]}`}>
                      vencido há {item.diasVencido} {item.diasVencido === 1 ? 'dia' : 'dias'}
                    </span>
                    <button
                      type="button"
                      onClick={() => estenderRapido(item)}
                      disabled={estenderTrial.isPending}
                      className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 active:bg-slate-100 disabled:opacity-50"
                    >
                      + 7 dias de trial
                    </button>
                    <button
                      type="button"
                      onClick={() => onAjustarTrial(item.personal)}
                      className="whitespace-nowrap text-xs font-medium text-brand-hover underline"
                    >
                      outra data
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const COR_DIAS_VENCIDO: Record<Inadimplente['cor'], string> = {
  amarelo: 'bg-amber-50 text-amber-700',
  laranja: 'bg-orange-50 text-orange-700',
  vermelho: 'bg-red-50 text-red-700',
}

function BotaoMenuPersonal({ personal, onAbrir, rotulo }: { personal: PersonalAdmin; onAbrir: () => void; rotulo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`Ações de ${personal.name || personal.email}`}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 active:bg-slate-100"
    >
      <MoreVertical size={16} aria-hidden /> {rotulo && 'Ações'}
    </button>
  )
}

function AcoesPersonal({ personal, onEscolher }: { personal: PersonalAdmin; onEscolher: (tipo: 'reset' | 'trial' | 'plano' | 'cpf') => void }) {
  return (
    <div className="space-y-1" aria-label={`Ações para ${personal.name}`}>
      <BotaoAcao icone={<KeyRound size={16} />} label="Reset de senha" onClick={() => onEscolher('reset')} />
      <BotaoAcao icone={<CalendarClock size={16} />} label="Ajustar trial" onClick={() => onEscolher('trial')} />
      <BotaoAcao icone={<CreditCard size={16} />} label="Ajustar plano" onClick={() => onEscolher('plano')} />
      <BotaoAcao icone={<Pencil size={16} />} label="Corrigir CPF" onClick={() => onEscolher('cpf')} />
    </div>
  )
}

function BotaoAcao({ icone, label, onClick }: { icone: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base text-slate-800 active:bg-slate-100"
    >
      {icone} {label}
    </button>
  )
}

/** Container padrão de modal de ação: título, conteúdo e Cancelar/Confirmar com loading. */
function ModalBase({
  titulo,
  children,
  onCancelar,
  onConfirmar,
  confirmando,
  confirmarDesabilitado,
  textoConfirmar = 'Confirmar',
}: {
  titulo: string
  children: ReactNode
  onCancelar: () => void
  onConfirmar?: () => void
  confirmando: boolean
  confirmarDesabilitado?: boolean
  textoConfirmar?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancelar}>
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-accent">{titulo}</h2>
        <div className="space-y-3">{children}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancelar} className="flex-1" disabled={confirmando}>
            Cancelar
          </Button>
          {onConfirmar && (
            <Button onClick={onConfirmar} className="flex-1" disabled={confirmando || confirmarDesabilitado}>
              {confirmando ? 'Salvando…' : textoConfirmar}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ModalAcao({ tipo, personal, onFechar }: { tipo: 'reset' | 'trial' | 'plano' | 'cpf'; personal: PersonalAdmin; onFechar: () => void }) {
  if (tipo === 'reset') return <ModalResetSenha personal={personal} onFechar={onFechar} />
  if (tipo === 'trial') return <ModalAjustarTrial personal={personal} onFechar={onFechar} />
  if (tipo === 'plano') return <ModalAjustarPlano personal={personal} onFechar={onFechar} />
  return <ModalCorrigirCpf personal={personal} onFechar={onFechar} />
}

function ModalResetSenha({ personal, onFechar }: { personal: PersonalAdmin; onFechar: () => void }) {
  const resetSenha = useAdminResetSenha()
  const [enviado, setEnviado] = useState(false)

  const gerar = async () => {
    if (!personal.email) return mostrarErroGlobal('Este personal não tem e-mail cadastrado.')
    try {
      await resetSenha.mutateAsync(personal.email)
      setEnviado(true)
      mostrarInfoGlobal('Link de recuperação enviado para o e-mail do personal.')
    } catch {
      // o erro já aparece uma vez no toast global das mutations (com o motivo real); aqui não repete
    }
  }

  return (
    <ModalBase
      titulo={`Reset de senha — ${personal.name || personal.email}`}
      onCancelar={onFechar}
      onConfirmar={enviado ? undefined : gerar}
      confirmando={resetSenha.isPending}
      textoConfirmar="Enviar link"
    >
      <p className="text-sm text-slate-600">Envia um e-mail de redefinição de senha para {personal.email}. O link não aparece aqui: o personal recebe direto na caixa de entrada.</p>
      {enviado && <p className="rounded-lg bg-slate-50 p-2 text-sm text-slate-600">Link de recuperação enviado para o e-mail do personal.</p>}
    </ModalBase>
  )
}

function ModalAjustarTrial({ personal, onFechar }: { personal: PersonalAdmin; onFechar: () => void }) {
  const alterarTrial = useAdminAlterarTrial()
  const [novoTrialFim, setNovoTrialFim] = useState(hojeSP())

  const salvar = async () => {
    try {
      await alterarTrial.mutateAsync({ professionalId: personal.id, novoFim: montarDataHoraSP(novoTrialFim, '23:59').toISOString() })
      mostrarInfoGlobal('Trial atualizado.')
      onFechar()
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <ModalBase titulo={`Ajustar trial — ${personal.name || personal.email}`} onCancelar={onFechar} onConfirmar={salvar} confirmando={alterarTrial.isPending}>
      <Field label="Novo fim do trial">
        <Input type="date" value={novoTrialFim} onChange={(e) => setNovoTrialFim(e.target.value)} />
      </Field>
    </ModalBase>
  )
}

function ModalAjustarPlano({ personal, onFechar }: { personal: PersonalAdmin; onFechar: () => void }) {
  const alterarPlano = useAdminAlterarPlano()
  const [novaAssinaturaFim, setNovaAssinaturaFim] = useState(hojeSP())
  const [plano, setPlano] = useState<Plano>('mensal')

  const salvar = async () => {
    try {
      await alterarPlano.mutateAsync({ professionalId: personal.id, assinaturaFim: montarDataHoraSP(novaAssinaturaFim, '23:59').toISOString(), plano })
      mostrarInfoGlobal('Assinatura atualizada.')
      onFechar()
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <ModalBase titulo={`Ajustar plano — ${personal.name || personal.email}`} onCancelar={onFechar} onConfirmar={salvar} confirmando={alterarPlano.isPending}>
      <Field label="Novo fim da assinatura">
        <Input type="date" value={novaAssinaturaFim} onChange={(e) => setNovaAssinaturaFim(e.target.value)} />
      </Field>
      <Field label="Plano">
        <select value={plano} onChange={(e) => setPlano(e.target.value as Plano)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3">
          <option value="mensal">Mensal</option>
          <option value="trimestral">Trimestral</option>
          <option value="semestral">Semestral</option>
        </select>
      </Field>
    </ModalBase>
  )
}

function ModalCorrigirCpf({ personal, onFechar }: { personal: PersonalAdmin; onFechar: () => void }) {
  const alterarCpf = useAdminAlterarCpf()
  const [novoCpf, setNovoCpf] = useState('')

  const salvar = async () => {
    if (!validarCPF(novoCpf)) return mostrarErroGlobal(ERROS.CPF.invalido)
    try {
      await alterarCpf.mutateAsync({ professionalId: personal.id, cpf: novoCpf })
      mostrarInfoGlobal('CPF atualizado.')
      onFechar()
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <ModalBase
      titulo={`Corrigir CPF — ${personal.name || personal.email}`}
      onCancelar={onFechar}
      onConfirmar={salvar}
      confirmando={alterarCpf.isPending}
      confirmarDesabilitado={!novoCpf}
    >
      <p className="text-xs text-slate-500">O CPF não pode ser alterado pelo próprio personal depois do cadastro — use só pra corrigir erro de digitação.</p>
      <Field label="Novo CPF">
        <Input value={novoCpf} onChange={(e) => setNovoCpf(mascararCPF(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" autoFocus />
      </Field>
    </ModalBase>
  )
}
