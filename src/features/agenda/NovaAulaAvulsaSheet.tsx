import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAlunos } from '@/features/alunos/api'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { cn, desambiguarPorNome } from '@/lib/utils'
import { hojeSP, limitesDoDiaSP, montarDataHoraSP } from '@/lib/datas'
import { aulasSobrepoe } from './conflitos'
import { useAulasNoIntervalo, useCriarAulaAvulsa, useProfessionalConfig, type Aula } from './api'

function useLocaisUsados() {
  return useQuery({
    queryKey: ['locais-usados'],
    queryFn: async () => {
      const { data, error } = await supabase.from('aulas').select('local').not('local', 'is', null).order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      const vistos = new Set<string>()
      const locais: string[] = []
      for (const row of data as { local: string | null }[]) {
        if (row.local && !vistos.has(row.local)) {
          vistos.add(row.local)
          locais.push(row.local)
        }
      }
      return locais.slice(0, 8)
    },
  })
}

export function NovaAulaAvulsaSheet({ open, onClose, dataInicial }: { open: boolean; onClose: () => void; dataInicial?: string }) {
  const { data: alunos } = useAlunos()
  const { data: config } = useProfessionalConfig()
  const { data: locais } = useLocaisUsados()
  const criar = useCriarAulaAvulsa()

  const [alunoIds, setAlunoIds] = useState<string[]>([])
  const [data, setData] = useState(dataInicial ?? hojeSP())
  const [hora, setHora] = useState('07:00')
  const [duracao, setDuracao] = useState(String(config?.duracao_padrao_min ?? 60))
  const [local, setLocal] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const limites = data ? limitesDoDiaSP(data) : undefined
  const { data: aulasDoDia } = useAulasNoIntervalo(limites?.inicio, limites?.fim)

  const startsAt = data && hora ? montarDataHoraSP(data, hora) : null
  const conflito = useMemo(() => {
    if (!startsAt || !aulasDoDia) return null
    const nova = { starts_at: startsAt.toISOString(), duration_min: Number(duracao) || 0 }
    const encontrada = (aulasDoDia as Aula[]).find((a) => a.status !== 'cancelada' && aulasSobrepoe(nova, a))
    return encontrada ?? null
  }, [startsAt, duracao, aulasDoDia])

  const toggleAluno = (id: string) => setAlunoIds((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  const fechar = () => {
    setAlunoIds([])
    setLocal('')
    setErro(null)
    onClose()
  }

  const salvar = () => {
    if (alunoIds.length === 0) {
      setErro('Selecione ao menos um aluno')
      return
    }
    if (!startsAt || !duracao.trim() || Number(duracao) <= 0) {
      setErro('Informe data, hora e duração')
      return
    }
    setErro(null)
    criar.mutate(
      { alunoIds, startsAt, durationMin: Number(duracao), local: local.trim() || null },
      { onSuccess: fechar, onError: (e) => setErro((e as Error).message) },
    )
  }

  return (
    <BottomSheet open={open} onClose={fechar} title="Aula avulsa">
      <div className="space-y-4">
        <Field label="Alunos">
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {alunos?.map((a) => {
              const desambiguar = alunos ? desambiguarPorNome(alunos)(a) : null
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAluno(a.id)}
                  className={cn(
                    'min-h-9 rounded-full border px-3 text-sm font-medium',
                    alunoIds.includes(a.id) ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                  )}
                >
                  {a.name}
                  {desambiguar && <span className="opacity-70"> · {desambiguar}</span>}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="flex gap-2">
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field label="Hora">
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Field>
        </div>

        <Field label="Duração (min)">
          <Input type="number" inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        </Field>

        <Field label="Local">
          <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Opcional" list="locais-usados" />
          <datalist id="locais-usados">
            {locais?.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>

        {conflito && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span>Conflita com outra aula às {new Date(conflito.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}.</span>
          </div>
        )}

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <Button onClick={salvar} className="w-full" disabled={criar.isPending}>
          Marcar aula
        </Button>
      </div>
    </BottomSheet>
  )
}
