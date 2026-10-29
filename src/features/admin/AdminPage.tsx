import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  ClipboardPen,
  CreditCard,
  GraduationCap,
  Hourglass,
  KeyRound,
  LogOut,
  MapPin,
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
import {
  ABAS_ADMIN,
  abaDaUrl,
  cidadeDaUrl,
  filtrarPorCidade,
  FILTROS_RAPIDOS,
  linkMapsCidade,
  ordenarPersonais,
  ORDENS_PERSONAIS,
  passaFiltroRapido,
  rotuloCidade,
  situacaoDoPersonal,
  usoDoPersonal,
  type AbaAdmin,
  type FiltroRapido,
  type MetricasPersonal,
  type OrdemPersonais,
} from './personais'
import { HistoricoSection } from './HistoricoSection'
import { FinanceiroSection } from './FinanceiroSection'
import { IndicadoresSection } from './IndicadoresSection'
import { ModalBase } from './ModalBase'
import { ContatoModal } from './ContatoModal'
import { rotuloUltimaAtividade, rotuloUltimoContato, type ResumoContato } from './contatos'
import { BlocoMeta, CartaoAcao, FunilCompacto } from './BiV1Section'
import { SEM_FILTROS } from './biV1'
import { confirmarAcao } from '@/components/ConfirmSheet'
import {
  useAdminAlterarCpf,
  useAdminAlterarPlano,
  useAdminAlterarTrial,
  useAdminPersonais,
  useAdminRegioes,
  useAdminBonus,
  useAdminBIv1,
  useAdminAtividade,
  useAdminContatosResumo,
  useAdminListaAcao,
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
  // a cidade filtra a lista de personais (?cidade=): vem do clique na cidade da Visão geral ou da própria lista
  const cidade = cidadeDaUrl(params.get('cidade'))
  const verPersonaisDaCidade = (c: string) => setParams({ aba: 'personais', cidade: c }, { replace: true })
  const limparCidade = () => setParams({ aba: 'personais' }, { replace: true })
  const bi = useAdminBIv1(30, SEM_FILTROS)
  const listaAcao = useAdminListaAcao()
  const contatos = useAdminContatosResumo()
  const atividade = useAdminAtividade()
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
  const [acao, setAcao] = useState<{ tipo: 'reset' | 'trial' | 'plano' | 'cpf' | 'contato'; personal: PersonalAdmin; motivo?: string } | null>(null)

  const [filtroRapido, setFiltroRapido] = useState<'' | FiltroRapido>('')
  const [ordem, setOrdem] = useState<OrdemPersonais>('nome')

  // cidade, busca e status valem para tudo; os filtros rápidos contam em cima deles
  const baseFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return filtrarPorCidade(personais.data ?? [], cidade).filter((p) => {
      const bateBusca = !termo || p.name.toLowerCase().includes(termo) || (p.email ?? '').toLowerCase().includes(termo)
      const bateStatus = !filtroStatus || p.status === filtroStatus
      return bateBusca && bateStatus
    })
  }, [personais.data, busca, filtroStatus, cidade])

  const contagemRapidos = useMemo(
    () => Object.fromEntries(FILTROS_RAPIDOS.map((f) => [f.id, baseFiltrada.filter((p) => passaFiltroRapido(f.id, p, bonus.data?.get(p.id), metricas.data?.get(p.id))).length])) as Record<FiltroRapido, number>,
    [baseFiltrada, bonus.data, metricas.data],
  )

  const listaFiltrada = useMemo(() => {
    const filtrada = filtroRapido ? baseFiltrada.filter((p) => passaFiltroRapido(filtroRapido, p, bonus.data?.get(p.id), metricas.data?.get(p.id))) : baseFiltrada
    return ordenarPersonais(filtrada, ordem, bonus.data, metricas.data, atividade.data)
  }, [baseFiltrada, filtroRapido, ordem, bonus.data, metricas.data, atividade.data])

  const abrirContato = (professionalId: string, motivo: string) => {
    const personal = personais.data?.find((x) => x.id === professionalId)
    if (personal) setAcao({ tipo: 'contato', personal, motivo })
  }

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

      <div className="mx-auto max-w-7xl space-y-6 p-4">
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
        <div className="grid gap-4 lg:grid-cols-2">
          {bi.data && <BlocoMeta meta={bi.data.meta} />}
          <div className="space-y-4">
            <CartaoAcao lista={listaAcao} resumo={contatos.data} onRegistrar={(i) => abrirContato(i.professional_id, i.motivo)} />
            {relatosEmAberto > 0 && (
              <button
                type="button"
                onClick={() => irParaAba('suporte')}
                className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 text-left text-sm font-medium text-amber-950"
              >
                <span>
                  Suporte: {relatosEmAberto} {relatosEmAberto === 1 ? 'relato em aberto' : 'relatos em aberto'}
                </span>
                <span aria-hidden>Ver →</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-heading font-semibold text-accent">Saúde do negócio</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <CardResumo icone={<UserCheck size={20} />} label="Com acesso (trial + pagantes)" valor={visaoGeral.ativos} />
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

        {bi.data && <FunilCompacto funil={bi.data.funil} />}

        <details className="rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="min-h-11 cursor-pointer content-center font-heading font-semibold text-accent">Cidades (por cadastro) — {resumo.data?.regioes_ativas ?? '—'}</summary>
          <div className="mt-3">
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
                      <CidadeComMaps cidade={r.cidade} onFiltrar={verPersonaisDaCidade} />
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
        </details>
          </>
        )}

        {aba === 'personais' && (
          <>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-heading font-semibold text-accent">Personais</h2>
          {cidade && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-hover">
                Cidade: {cidade} · {listaFiltrada.length} {listaFiltrada.length === 1 ? 'personal' : 'personais'}
              </span>
              <button type="button" onClick={limparCidade} className="min-h-11 rounded-xl px-3 text-sm font-medium text-slate-700 active:bg-slate-100">
                Limpar filtro ✕
              </button>
            </div>
          )}
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
            <select
              aria-label="Ordenar por"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as OrdemPersonais)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              {ORDENS_PERSONAIS.map((o) => (
                <option key={o.id} value={o.id}>
                  Ordenar: {o.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtros rápidos">
            {FILTROS_RAPIDOS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filtroRapido === f.id}
                onClick={() => setFiltroRapido(filtroRapido === f.id ? '' : f.id)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${filtroRapido === f.id ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700'}`}
              >
                {f.rotulo} ({contagemRapidos[f.id]})
              </button>
            ))}
          </div>

          {/* Desktop/tablet: tabela com zebra + hover. Mobile: cards empilhados (abaixo). */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Personal</th>
                  <th className="py-2 pr-3">Situação</th>
                  <th className="py-2 pr-3">Cidade</th>
                  <th className="py-2 pr-3">Alunos</th>
                  <th className="py-2 pr-3">Uso recente</th>
                  <th className="py-2 pr-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((p, i) => (
                  <tr key={p.id} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-slate-800">{p.name || '—'}</p>
                      <p className="text-xs text-slate-600">{p.email ?? '—'}</p>
                      <UltimoContato resumo={contatos.data?.get(p.id)} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <SituacaoDoPersonal p={p} bonusAte={bonus.data?.get(p.id)} />
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      <CidadeComMaps cidade={p.cidade} onFiltrar={verPersonaisDaCidade} />
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{p.qtd_alunos}</td>
                    <td className="py-2.5 pr-3">
                      <UsoDoPersonal metricas={metricas.data?.get(p.id)} carregando={metricas.isLoading} atividade={atividade.data?.get(p.id)} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <BotaoMenuPersonal personal={p} onAbrir={() => setMenuPersonal(p)} />
                    </td>
                  </tr>
                ))}
                {listaFiltrada.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
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
                    <UltimoContato resumo={contatos.data?.get(p.id)} />
                  </div>
                  <SituacaoDoPersonal p={p} bonusAte={bonus.data?.get(p.id)} />
                </div>
                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-500">
                  <div>
                    <dt className="inline">Cidade: </dt>
                    <dd className="inline text-slate-700">
                      <CidadeComMaps cidade={p.cidade} onFiltrar={verPersonaisDaCidade} />
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Alunos: </dt>
                    <dd className="inline text-slate-700">{p.qtd_alunos}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="mb-0.5">Uso recente</dt>
                    <dd className="text-slate-700">
                      <UsoDoPersonal metricas={metricas.data?.get(p.id)} carregando={metricas.isLoading} atividade={atividade.data?.get(p.id)} />
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

      {acao && <ModalAcao tipo={acao.tipo} personal={acao.personal} motivo={acao.motivo} onFechar={() => setAcao(null)} />}
    </div>
  )
}

/**
 * Cidade/UF do cadastro do personal: tocar nela abre a lista de personais daquela cidade; o ícone ao lado abre o Google Maps.
 * Vazio = "Não informado" (sem link).
 */
function CidadeComMaps({ cidade, onFiltrar }: { cidade: string | null; onFiltrar: (cidade: string) => void }) {
  const link = linkMapsCidade(cidade)
  const rotulo = rotuloCidade(cidade)
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={() => onFiltrar(rotulo)} className="min-h-8 text-left text-brand-hover underline" aria-label={`Ver personais de ${rotulo}`}>
        {rotulo}
      </button>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100" aria-label={`${rotulo} no Google Maps`}>
          <MapPin size={14} aria-hidden />
        </a>
      )}
    </span>
  )
}

/** Quantidades de treinos do personal (só números; nada de dados de alunos). */
function UltimoContato({ resumo }: { resumo: ResumoContato | undefined }) {
  const r = rotuloUltimoContato(resumo)
  return r ? <p className="text-xs text-slate-600">Último contato: {r}</p> : null
}

function UsoDoPersonal({ metricas, carregando, atividade }: { metricas: MetricasPersonal | undefined; carregando: boolean; atividade: string | null | undefined }) {
  if (carregando) return <span className="text-slate-500">…</span>
  const u = usoDoPersonal(metricas)
  return (
    <span className="block" title={u.detalhe}>
      <span className={`block text-sm font-medium ${u.semUso ? 'text-red-700' : 'text-slate-800'}`}>{u.principal}</span>
      {u.secundario && <span className="block text-xs text-slate-600">{u.secundario}</span>}
      <span className="block text-xs text-slate-600">Último uso do app: {rotuloUltimaAtividade(atividade)}</span>
    </span>
  )
}

const COR_URGENCIA = { alta: 'text-red-700', media: 'text-amber-800', nenhuma: 'text-slate-600' } as const

/** Situação comercial do personal: selo do status e, embaixo, o próximo evento (fim do trial/plano) colorido pela urgência. */
function SituacaoDoPersonal({ p, bonusAte }: { p: PersonalAdmin; bonusAte: string | undefined }) {
  const sit = situacaoDoPersonal(p, bonusAte)
  const { data, comBonus } = fimDoAcesso(p, bonusAte)
  return (
    <span className="block" title={data ? `Acesso até ${formatarDataHoraBR(data)}` : undefined}>
      <StatusBadge status={p.status} rotulo={sit.rotulo} />
      {sit.evento && (
        <span className={`mt-1 block text-xs ${COR_URGENCIA[sit.urgencia]}`}>
          {sit.evento}
          {data && <span className="text-slate-600"> ({formatarDataHoraBR(data)})</span>}
          {comBonus && <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 font-medium text-brand-hover">mês grátis</span>}
        </span>
      )}
    </span>
  )
}

function StatusBadge({ status, rotulo }: { status: StatusAssinatura | null; rotulo?: string }) {
  if (!status) return <span className="text-slate-500">{rotulo ?? '—'}</span>
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_STATUS[status]}`}>{rotulo ?? ROTULO_STATUS[status]}</span>
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

function AcoesPersonal({ personal, onEscolher }: { personal: PersonalAdmin; onEscolher: (tipo: 'reset' | 'trial' | 'plano' | 'cpf' | 'contato') => void }) {
  return (
    <div className="space-y-1" aria-label={`Ações para ${personal.name}`}>
      <BotaoAcao icone={<ClipboardPen size={16} />} label="Registrar contato" onClick={() => onEscolher('contato')} />
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
function ModalAcao({ tipo, personal, motivo, onFechar }: { tipo: 'reset' | 'trial' | 'plano' | 'cpf' | 'contato'; personal: PersonalAdmin; motivo?: string; onFechar: () => void }) {
  if (tipo === 'contato') return <ContatoModal personal={{ id: personal.id, nome: personal.name || personal.email || 'Personal' }} motivo={motivo ?? 'manual'} onFechar={onFechar} />
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
