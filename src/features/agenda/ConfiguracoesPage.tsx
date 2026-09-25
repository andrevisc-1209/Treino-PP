import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Field, Input } from '@/components/ui'
import { useProfessionalConfig, useSalvarProfessionalConfig } from './api'

export function ConfiguracoesPage() {
  const { data: config, isLoading } = useProfessionalConfig()
  const salvar = useSalvarProfessionalConfig()

  const [cobrarFalta, setCobrarFalta] = useState(true)
  const [cobrarCancel, setCobrarCancel] = useState(false)
  const [duracao, setDuracao] = useState('60')
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (config) {
      setCobrarFalta(config.cobrar_falta_padrao)
      setCobrarCancel(config.cobrar_cancel_padrao)
      setDuracao(String(config.duracao_padrao_min))
    }
  }, [config])

  const handleSalvar = () => {
    setSalvo(false)
    salvar.mutate(
      {
        cobrar_falta_padrao: cobrarFalta,
        cobrar_cancel_padrao: cobrarCancel,
        duracao_padrao_min: Number(duracao) || 60,
      },
      { onSuccess: () => setSalvo(true) },
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Configurações</h1>
      </header>

      {isLoading ? (
        <p className="text-slate-500">Carregando…</p>
      ) : (
        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <Field label="Duração padrão da aula (minutos)">
            <Input type="number" inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
          </Field>

          <label className="flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3">
            <span className="font-medium">Cobrar falta por padrão</span>
            <input type="checkbox" checked={cobrarFalta} onChange={(e) => setCobrarFalta(e.target.checked)} className="size-5" />
          </label>

          <label className="flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3">
            <span className="font-medium">Cobrar cancelamento do aluno por padrão</span>
            <input type="checkbox" checked={cobrarCancel} onChange={(e) => setCobrarCancel(e.target.checked)} className="size-5" />
          </label>

          {salvo && <p className="text-sm text-emerald-700">Configurações salvas.</p>}
          <Button onClick={handleSalvar} className="w-full" disabled={salvar.isPending}>
            Salvar
          </Button>
        </div>
      )}
    </div>
  )
}
