import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Play, Scale, TriangleAlert } from 'lucide-react'
import { cn, idade } from '@/lib/utils'
import { Button, Field, Input } from '@/components/ui'
import { PlanosTab } from '@/features/planos/PlanosTab'
import { HorariosFixosBlock } from '@/features/agenda/HorariosFixosBlock'
import { CobrancaBlock } from '@/features/financeiro/CobrancaBlock'
import { FinanceiroBlock } from '@/features/financeiro/FinanceiroBlock'
import { HistoricoTab } from '@/features/sessoes/HistoricoTab'
import { EvolucaoTab } from '@/features/evolucao/EvolucaoTab'
import { useSessaoEmAndamento } from '@/features/sessoes/api'
import {
  useAluno,
  useApagarAluno,
  useArquivarAluno,
  useConsentimentoDetalhado,
  useDesarquivarAluno,
  usePesos,
  useRegistrarPeso,
  useRevogarConsentimento,
  type Peso,
} from './api'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarDesfazer } from '@/components/UndoToast'
import { rotuloBadge, rotuloObjetivos } from './format'
import { BotaoWhatsApp } from '@/components/BotaoWhatsApp'
import { formatarDataBR, formatarPesoKg, formatarSexo } from '@/lib/format'
import { mapearErroSupabase } from '@/lib/erros'

const TABS = ['Resumo', 'Treinos', 'Histórico', 'Evolução'] as const
type Tab = (typeof TABS)[number]

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{children}</span>
}

const CAMPOS_MEDIDA = [
  { campo: 'cintura_cm', label: 'Cintura (cm)' },
  { campo: 'quadril_cm', label: 'Quadril (cm)' },
  { campo: 'peito_cm', label: 'Peito (cm)' },
  { campo: 'braco_dir_cm', label: 'Braço direito (cm)' },
  { campo: 'coxa_dir_cm', label: 'Coxa direita (cm)' },
] as const

function NovaAvaliacaoForm({ alunoId, alturaCm, onDone }: { alunoId: string; alturaCm: number | null; onDone: () => void }) {
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [gordura, setGordura] = useState('')
  const [medidas, setMedidas] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const registrar = useRegistrarPeso(alunoId)

  const numOrUndef = (v: string) => {
    if (!v.trim()) return undefined
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : undefined
  }

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
          {
            weight_kg: kg,
            measured_at: date,
            gordura_pct: numOrUndef(gordura),
            cintura_cm: numOrUndef(medidas.cintura_cm ?? ''),
            quadril_cm: numOrUndef(medidas.quadril_cm ?? ''),
            peito_cm: numOrUndef(medidas.peito_cm ?? ''),
            braco_dir_cm: numOrUndef(medidas.braco_dir_cm ?? ''),
            coxa_dir_cm: numOrUndef(medidas.coxa_dir_cm ?? ''),
          },
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
      <Field label="% Gordura (opcional)">
        <Input type="number" step="0.1" inputMode="decimal" value={gordura} onChange={(e) => setGordura(e.target.value)} />
      </Field>
      {alturaCm ? (
        <p className="text-xs text-slate-400">Altura cadastrada: {alturaCm} cm — usada pra calcular o IMC na aba Evolução.</p>
      ) : (
        <p className="text-xs text-amber-600">Sem altura cadastrada — edite o aluno pra poder calcular o IMC.</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {CAMPOS_MEDIDA.map(({ campo, label }) => (
          <Field key={campo} label={label}>
            <Input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={medidas[campo] ?? ''}
              onChange={(e) => setMedidas((m) => ({ ...m, [campo]: e.target.value }))}
            />
          </Field>
        ))}
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

function AvaliacaoItem({ peso }: { peso: Peso }) {
  const [aberto, setAberto] = useState(false)
  const detalhes = CAMPOS_MEDIDA.map(({ campo, label }) => ({ label, valor: peso[campo as keyof Peso] as number | null })).filter(
    (d) => d.valor != null,
  )

  return (
    <li className="py-2 text-sm">
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="text-slate-500">{formatarDataBR(peso.measured_at)}</span>
        <span className="flex items-center gap-2">
          <span className="font-medium">{formatarPesoKg(peso.weight_kg)}</span>
          {peso.gordura_pct != null && <span className="text-slate-500">· {peso.gordura_pct}% gordura</span>}
        </span>
      </button>
      {aberto && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          {detalhes.length === 0 ? (
            <span className="col-span-2 text-slate-400">Sem medidas adicionais nesta avaliação.</span>
          ) : (
            detalhes.map((d) => (
              <span key={d.label}>
                {d.label}: <strong>{d.valor} cm</strong>
              </span>
            ))
          )}
        </div>
      )}
    </li>
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
  const desarquivar = useDesarquivarAluno()
  const apagar = useApagarAluno()
  const tabDaUrl = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>((TABS as readonly string[]).includes(tabDaUrl ?? '') ? (tabDaUrl as Tab) : 'Resumo')
  const [registrandoPeso, setRegistrandoPeso] = useState(false)

  if (!id) return <Navigate to="/alunos" replace />
  if (isLoading) return <p className="p-4 text-slate-500">Carregando…</p>
  if (error) return <p className="p-4 text-red-600">{mapearErroSupabase(error)}</p>
  if (!aluno) return <p className="p-4 text-slate-500">Aluno não encontrado.</p>

  const ultimoPeso = pesos?.[0]

  const handleArquivar = () => {
    arquivar.mutate(aluno.id, {
      onSuccess: () => {
        navigate('/alunos')
        mostrarDesfazer(`${aluno.name} foi arquivado.`, () => desarquivar.mutate(aluno.id))
      },
    })
  }

  const handleApagar = async () => {
    const ok = await confirmarAcao({
      titulo: 'Apagar aluno',
      mensagem: `Tem certeza? Isso apaga ${aluno.name} e todo o histórico (treinos, sessões, avaliações). Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Apagar',
      destrutivo: true,
    })
    if (!ok) return
    apagar.mutate(aluno.id, { onSuccess: () => navigate('/alunos') })
  }

  const handleRevogar = async () => {
    if (!consentimento) return
    const ok = await confirmarAcao({
      titulo: 'Revogar consentimento LGPD',
      mensagem: 'Os dados de lesão e medicamentos serão apagados e os campos de saúde ficarão travados até um novo consentimento.',
      textoConfirmar: 'Revogar',
      destrutivo: true,
    })
    if (!ok) return
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
          <Link to={`/alunos/${aluno.id}/editar`} className="text-sm font-medium text-brand-hover">
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

      {(() => {
        const demograficos = [
          idade(aluno.birth_date) != null && `${idade(aluno.birth_date)} anos`,
          aluno.sex && formatarSexo(aluno.sex),
          aluno.height_cm && `${aluno.height_cm} cm`,
          ultimoPeso && formatarPesoKg(ultimoPeso.weight_kg),
        ].filter(Boolean)
        const alertasSaude = [
          aluno.injury && rotuloBadge('Lesão', aluno.injury_regions, aluno.injury_notes),
          aluno.surgery && rotuloBadge('Cirurgia', aluno.surgery_regions, aluno.surgery_notes),
          aluno.medications && 'Medicamentos',
        ].filter((v): v is string => !!v)
        return (
          <div className="mb-4 space-y-2">
            {demograficos.length > 0 && <p className="text-sm text-slate-500">{demograficos.join(' · ')}</p>}

            {alertasSaude.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-700" />
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-amber-800">
                  {alertasSaude.map((a) => (
                    <span key={a}>{a}</span>
                  ))}
                </div>
              </div>
            )}

            {(aluno.objetivos.length > 0 || aluno.practices_sport) && (
              <div className="flex flex-wrap gap-2">
                {aluno.objetivos.length > 0 && <Badge>Objetivo: {rotuloObjetivos(aluno.objetivos, aluno.objetivo_notes)}</Badge>}
                {aluno.practices_sport && <Badge>{rotuloBadge('Esportes', aluno.sports, aluno.sport_name)}</Badge>}
              </div>
            )}
          </div>
        )
      })()}

      <Link
        to={sessaoEmAndamento ? `/alunos/${aluno.id}/sessoes/${sessaoEmAndamento.id}` : `/alunos/${aluno.id}/sessoes/nova`}
        className="mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-medium text-white active:bg-brand-hover"
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
                <Scale size={18} /> Avaliações
              </h2>
              {!registrandoPeso && (
                <Button variant="ghost" onClick={() => setRegistrandoPeso(true)}>
                  Nova avaliação
                </Button>
              )}
            </div>
            {registrandoPeso && <NovaAvaliacaoForm alunoId={aluno.id} alturaCm={aluno.height_cm} onDone={() => setRegistrandoPeso(false)} />}
            {pesos && pesos.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {pesos.map((p) => (
                  <AvaliacaoItem key={p.id} peso={p} />
                ))}
              </ul>
            ) : (
              !registrandoPeso && <p className="text-sm text-slate-500">Nenhuma avaliação registrada ainda.</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 text-slate-600" onClick={handleArquivar} disabled={arquivar.isPending}>
              Arquivar aluno
            </Button>
            <Button variant="ghost" className="flex-1 text-red-600" onClick={handleApagar} disabled={apagar.isPending}>
              Apagar aluno
            </Button>
          </div>
        </div>
      )}

      {tab === 'Treinos' && <PlanosTab alunoId={aluno.id} />}

      {tab === 'Histórico' && <HistoricoTab alunoId={aluno.id} />}

      {tab === 'Evolução' && <EvolucaoTab alunoId={aluno.id} />}
    </div>
  )
}
