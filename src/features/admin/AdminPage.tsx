import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button, Field, Input } from '@/components/ui'
import { montarDataHoraSP, hojeSP } from '@/lib/datas'
import { mapearErroSupabase } from '@/lib/erros'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { APP_NAME } from '@/config/app'
import {
  useAdminAlterarPlano,
  useAdminAlterarTrial,
  useAdminPersonais,
  useAdminRegioes,
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

function useIsAdmin() {
  const { session, loading: authLoading } = useAuth()
  const query = useQuery({
    queryKey: ['admin', 'sou-admin', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('professionals').select('is_admin').eq('id', session!.user.id).single()
      if (error) throw error
      return data.is_admin as boolean
    },
    enabled: !!session,
  })
  return { isAdmin: query.data ?? false, loading: authLoading || (!!session && query.isLoading) }
}

export function AdminPage() {
  const { session, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  if (authLoading || adminLoading) return <div className="p-8 text-center text-slate-500">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />
  // Nunca mostra nada pra quem não é admin — nem uma tela de "sem permissão".
  if (!isAdmin) return <Navigate to="/" replace />

  return <AdminDashboard />
}

function AdminDashboard() {
  const resumo = useAdminResumo()
  const personais = useAdminPersonais()
  const regioes = useAdminRegioes()
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'' | StatusAssinatura>('')
  const [gerenciando, setGerenciando] = useState<PersonalAdmin | null>(null)

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (personais.data ?? []).filter((p) => {
      const bateBusca = !termo || p.name.toLowerCase().includes(termo) || (p.email ?? '').toLowerCase().includes(termo)
      const bateStatus = !filtroStatus || p.status === filtroStatus
      return bateBusca && bateStatus
    })
  }, [personais.data, busca, filtroStatus])

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold text-[#0f2537]">Painel administrativo</h1>
        <p className="text-sm text-slate-500">{APP_NAME} — visão geral dos personais cadastrados</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CardResumo icone="👥" label="Total de personais" valor={resumo.data?.total_personais} />
        <CardResumo icone="🎓" label="Total de alunos" valor={resumo.data?.total_alunos} />
        <CardResumo icone="🗺️" label="Cidades com Pix configurado" valor={resumo.data?.regioes_ativas} />
      </div>
      <p className="-mt-3 text-xs text-slate-400">
        "Cidades com Pix configurado" é uma aproximação: não existe hoje um campo de região de atuação no cadastro do personal, só a cidade informada
        opcionalmente pra receber Pix.
      </p>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-[#0f2537]">Personais</h2>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} className="sm:max-w-xs" />
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">E-mail</th>
                <th className="py-2 pr-3">Cidade (Pix)</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Trial expira / plano até</th>
                <th className="py-2 pr-3">Alunos</th>
                <th className="py-2 pr-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-800">{p.name || '—'}</td>
                  <td className="py-2 pr-3 text-slate-600">{p.email ?? '—'}</td>
                  <td className="py-2 pr-3 text-slate-600">{p.cidade ?? '—'}</td>
                  <td className="py-2 pr-3 text-slate-600">{p.status ? ROTULO_STATUS[p.status] : '—'}</td>
                  <td className="py-2 pr-3 text-slate-600">{formatarDataHoraBR(p.status === 'ativa' ? p.assinatura_fim : p.trial_fim)}</td>
                  <td className="py-2 pr-3 text-slate-600">{p.qtd_alunos}</td>
                  <td className="py-2 pr-3">
                    <Button variant="outline" className="min-h-9 px-3 text-xs" onClick={() => setGerenciando(p)}>
                      <Settings size={14} /> Gerenciar
                    </Button>
                  </td>
                </tr>
              ))}
              {listaFiltrada.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    Nenhum personal encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-[#0f2537]">Cidades (por Pix configurado)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Cidade</th>
                <th className="py-2 pr-3">Personais</th>
              </tr>
            </thead>
            <tbody>
              {(regioes.data ?? []).map((r) => (
                <tr key={r.cidade} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-700">{r.cidade}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.qtd}</td>
                </tr>
              ))}
              {(regioes.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-slate-400">
                    Nenhum personal com cidade de Pix configurada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {gerenciando && <GerenciarPersonalSheet personal={gerenciando} onClose={() => setGerenciando(null)} />}
    </div>
  )
}

function CardResumo({ icone, label, valor }: { icone: string; label: string; valor: number | undefined }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <p className="text-2xl">{icone}</p>
      <p className="text-2xl font-bold text-[#0f2537]">{valor ?? '—'}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function GerenciarPersonalSheet({ personal, onClose }: { personal: PersonalAdmin; onClose: () => void }) {
  const alterarTrial = useAdminAlterarTrial()
  const alterarPlano = useAdminAlterarPlano()
  const resetSenha = useAdminResetSenha()
  const [novoTrialFim, setNovoTrialFim] = useState(hojeSP())
  const [novaAssinaturaFim, setNovaAssinaturaFim] = useState(hojeSP())
  const [plano, setPlano] = useState<Plano>('mensal')
  const [linkReset, setLinkReset] = useState<string | null>(null)

  const salvarTrial = async () => {
    try {
      await alterarTrial.mutateAsync({ professionalId: personal.id, novoFim: montarDataHoraSP(novoTrialFim, '23:59').toISOString() })
      mostrarInfoGlobal('Trial atualizado.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  const salvarPlano = async () => {
    try {
      await alterarPlano.mutateAsync({ professionalId: personal.id, assinaturaFim: montarDataHoraSP(novaAssinaturaFim, '23:59').toISOString(), plano })
      mostrarInfoGlobal('Assinatura atualizada.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  const enviarReset = async () => {
    if (!personal.email) return mostrarErroGlobal('Este personal não tem e-mail cadastrado.')
    try {
      const resultado = await resetSenha.mutateAsync(personal.email)
      setLinkReset(resultado?.actionLink ?? null)
      mostrarInfoGlobal('Link de reset gerado — copie e envie pro personal.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-10" onClick={onClose}>
      <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-semibold text-[#0f2537]">Gerenciar — {personal.name || personal.email}</h2>
          <p className="text-xs text-slate-500">{personal.email}</p>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700">Reset de senha</h3>
          <Button onClick={enviarReset} disabled={resetSenha.isPending} className="w-full">
            {resetSenha.isPending ? 'Gerando…' : 'Gerar link de reset de senha'}
          </Button>
          {linkReset && (
            <div className="space-y-1">
              <p className="break-all rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{linkReset}</p>
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  navigator.clipboard?.writeText(linkReset)
                  mostrarInfoGlobal('Link copiado.')
                }}
              >
                Copiar link
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700">Trial</h3>
          <Field label="Novo fim do trial">
            <Input type="date" value={novoTrialFim} onChange={(e) => setNovoTrialFim(e.target.value)} />
          </Field>
          <Button variant="outline" onClick={salvarTrial} disabled={alterarTrial.isPending} className="w-full">
            Salvar trial
          </Button>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700">Plano pago</h3>
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
          <Button variant="outline" onClick={salvarPlano} disabled={alterarPlano.isPending} className="w-full">
            Salvar assinatura
          </Button>
        </div>

        <Button variant="ghost" onClick={onClose} className="w-full">
          Fechar
        </Button>
      </div>
    </div>
  )
}
