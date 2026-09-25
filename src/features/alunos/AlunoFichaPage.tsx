import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Play, Scale } from 'lucide-react'
import { cn, idade } from '@/lib/utils'
import { Button, Field, Input } from '@/components/ui'
import { PlanosTab } from '@/features/planos/PlanosTab'
import { HorariosFixosBlock } from '@/features/agenda/HorariosFixosBlock'
import { CobrancaBlock } from '@/features/financeiro/CobrancaBlock'
import { FinanceiroBlock } from '@/features/financeiro/FinanceiroBlock'
import { HistoricoTab } from '@/features/sessoes/HistoricoTab'
import { EvolucaoTab } from '@/features/evolucao/EvolucaoTab'
import { useSessaoEmAndamento } from '@/features/sessoes/api'
import { useAluno, useArquivarAluno, useConsentimentoDetalhado, usePesos, useRegistrarPeso, useRevogarConsentimento } from './api'
import { rotuloBadge, rotuloObjetivos } from './format'
import { BotaoWhatsApp } from '@/components/BotaoWhatsApp'
import { formatarDataBR, formatarPesoKg, formatarSexo } from '@/lib/format'

const TABS = ['Resumo', 'Treinos', 'Histórico', 'Evolução'] as const
type Tab = (typeof TABS)[number]

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{children}</span>
}

function RegistrarPesoForm({ alunoId, onDone }: { alunoId: string; onDone: () => void }) {
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [erro, setErro] = useState<string | null>(null)
  const registrar = useRegistrarPeso(alunoId)

  return (
    <form
      className="space-y-3 rounded-xl bg-slate-50 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        const kg = Number(weight.replace(',', '.'))
        if (!kg || kg <= 0) {
          setErro('Informe um peso válido')
          return
        }
        setErro(null)
        registrar.mutate(
          { weight_kg: kg, measured_at: date },
          { onSuccess: onDone },
        )
      }}
    >
      <div className="flex gap-2">
        <Field label="Peso (kg)">
          <Input type="number" step="0.1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} autoFocus />
        </Field>
        <Field label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {registrar.error && <p className="text-sm text-red-600">{(registrar.error as Error).message}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={registrar.isPending} className="flex-1">
          Salvar
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

export function AlunoFichaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: aluno, isLoading, error } = useAluno(id)
  const { data: pesos } = usePesos(id)
  const { data: sessaoEmAndamento } = useSessaoEmAndamento(id)
  const { data: consentimento } = useConsentimentoDetalhado(id)
  const revogar = useRevogarConsentimento(id ?? '')
  const arquivar = useArquivarAluno()
  const tabDaUrl = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>((TABS as readonly string[]).includes(tabDaUrl ?? '') ? (tabDaUrl as Tab) : 'Resumo')
  const [registrandoPeso, setRegistrandoPeso] = useState(false)

  if (!id) return <Navigate to="/alunos" replace />
  if (isLoading) return <p className="p-4 text-slate-500">Carregando…</p>
  if (error) return <p className="p-4 text-red-600">{(error as Error).message}</p>
  if (!aluno) return <p className="p-4 text-slate-500">Aluno não encontrado.</p>

  const ultimoPeso = pesos?.[0]

  const handleArquivar = () => {
    if (!confirm(`Arquivar ${aluno.name}? Ele deixará de aparecer na lista de alunos.`)) return
    arquivar.mutate(aluno.id, { onSuccess: () => navigate('/alunos') })
  }

  const handleRevogar = () => {
    if (!consentimento) return
    if (!confirm('Revogar o consentimento LGPD? Os dados de lesão e medicamentos serão apagados e os campos de saúde ficarão travados até um novo consentimento.'))
      return
    revogar.mutate(consentimento.id)
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/alunos" className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="flex-1 truncate text-xl font-bold">{aluno.name}</h1>
        {aluno.phone ? (
          <BotaoWhatsApp telefone={aluno.phone} label={`WhatsApp de ${aluno.name}`} />
        ) : (
          <Link to={`/alunos/${aluno.id}/editar`} className="text-sm font-medium text-brand-dark">
            Adicionar telefone
          </Link>
        )}
        <Link
          to={`/alunos/${aluno.id}/editar`}
          className="flex size-11 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100"
          aria-label="Editar aluno"
        >
          <Pencil size={20} />
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {idade(aluno.birth_date) != null && <Badge>{idade(aluno.birth_date)} anos</Badge>}
        {aluno.sex && <Badge>{formatarSexo(aluno.sex)}</Badge>}
        {aluno.height_cm && <Badge>{aluno.height_cm} cm</Badge>}
        {ultimoPeso && <Badge>{formatarPesoKg(ultimoPeso.weight_kg)}</Badge>}
        {aluno.objetivos.length > 0 && <Badge>Objetivo: {rotuloObjetivos(aluno.objetivos, aluno.objetivo_notes)}</Badge>}
        {aluno.injury && <Badge>{rotuloBadge('Lesão', aluno.injury_regions, aluno.injury_notes)}</Badge>}
        {aluno.surgery && <Badge>{rotuloBadge('Cirurgia', aluno.surgery_regions, aluno.surgery_notes)}</Badge>}
        {aluno.practices_sport && <Badge>{rotuloBadge('Esportes', aluno.sports, aluno.sport_name)}</Badge>}
        {aluno.medications && <Badge>Medicamentos</Badge>}
      </div>

      <Link
        to={sessaoEmAndamento ? `/alunos/${aluno.id}/sessoes/${sessaoEmAndamento.id}` : `/alunos/${aluno.id}/sessoes/nova`}
        className="mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-medium text-white active:bg-brand-dark"
      >
        <Play size={18} /> {sessaoEmAndamento ? 'Continuar treino' : 'Iniciar treino'}
      </Link>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'min-h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Resumo' && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Dados</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Nascimento</dt>
              <dd>{aluno.birth_date ?? '—'}</dd>
              <dt className="text-slate-500">Telefone</dt>
              <dd>{aluno.phone ?? '—'}</dd>
              <dt className="text-slate-500">E-mail</dt>
              <dd className="truncate">{aluno.email ?? '—'}</dd>
              <dt className="text-slate-500">Medicamentos</dt>
              <dd>{aluno.medications ?? '—'}</dd>
            </dl>
          </div>

          <HorariosFixosBlock alunoId={aluno.id} />

          <CobrancaBlock alunoId={aluno.id} />

          <FinanceiroBlock alunoId={aluno.id} />

          {consentimento && (
            <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">
                Consentimento LGPD v{consentimento.consent_version} em {formatarDataBR(consentimento.consented_at)}
              </p>
              <Button variant="ghost" onClick={handleRevogar} disabled={revogar.isPending} className="shrink-0 text-red-600">
                Revogar
              </Button>
            </div>
          )}

          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Scale size={18} /> Peso
              </h2>
              {!registrandoPeso && (
                <Button variant="ghost" onClick={() => setRegistrandoPeso(true)}>
                  Registrar peso
                </Button>
              )}
            </div>
            {registrandoPeso && <RegistrarPesoForm alunoId={aluno.id} onDone={() => setRegistrandoPeso(false)} />}
            {pesos && pesos.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {pesos.map((p) => (
                  <li key={p.id} className="flex justify-between py-2 text-sm">
                    <span className="text-slate-500">{formatarDataBR(p.measured_at)}</span>
                    <span className="font-medium">{formatarPesoKg(p.weight_kg)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              !registrandoPeso && <p className="text-sm text-slate-500">Nenhum registro de peso ainda.</p>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full text-red-600"
            onClick={handleArquivar}
            disabled={arquivar.isPending}
          >
            Arquivar aluno
          </Button>
        </div>
      )}

      {tab === 'Treinos' && <PlanosTab alunoId={aluno.id} />}

      {tab === 'Histórico' && <HistoricoTab alunoId={aluno.id} />}

      {tab === 'Evolução' && <EvolucaoTab alunoId={aluno.id} />}
    </div>
  )
}
