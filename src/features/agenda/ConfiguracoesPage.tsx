import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Field, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { normalizarChavePix, normalizarCidadePix, normalizarNomePix, type PixTipo } from '@/lib/pix'
import { useProfessionalConfig, useSalvarProfessionalConfig } from './api'

const TIPOS_PIX: { value: PixTipo; label: string }[] = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

export function ConfiguracoesPage() {
  const { data: config, isLoading } = useProfessionalConfig()
  const salvar = useSalvarProfessionalConfig()

  const [cobrarFalta, setCobrarFalta] = useState(true)
  const [cobrarCancel, setCobrarCancel] = useState(false)
  const [duracao, setDuracao] = useState('60')
  const [salvo, setSalvo] = useState(false)

  const [pixTipo, setPixTipo] = useState<PixTipo>('cpf')
  const [pixChave, setPixChave] = useState('')
  const [pixNome, setPixNome] = useState('')
  const [pixCidade, setPixCidade] = useState('')
  const [erroPix, setErroPix] = useState<string | null>(null)
  const [pixSalvo, setPixSalvo] = useState(false)

  useEffect(() => {
    if (config) {
      setCobrarFalta(config.cobrar_falta_padrao)
      setCobrarCancel(config.cobrar_cancel_padrao)
      setDuracao(String(config.duracao_padrao_min))
      setPixTipo((config.pix_tipo as PixTipo) ?? 'cpf')
      setPixChave(config.pix_chave ?? '')
      setPixNome(config.pix_nome ?? '')
      setPixCidade(config.pix_cidade ?? '')
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

  const handleSalvarPix = () => {
    setErroPix(null)
    setPixSalvo(false)
    if (!pixChave.trim() || !pixNome.trim() || !pixCidade.trim()) {
      setErroPix('Preencha a chave, o nome e a cidade')
      return
    }
    const chave = normalizarChavePix(pixTipo, pixChave)
    if (pixTipo === 'cpf' && chave.length !== 11) return setErroPix('CPF inválido')
    if (pixTipo === 'cnpj' && chave.length !== 14) return setErroPix('CNPJ inválido')
    if (pixTipo === 'email' && !chave.includes('@')) return setErroPix('E-mail inválido')
    if (pixTipo === 'telefone' && chave.replace(/\D/g, '').length < 12) return setErroPix('Telefone inválido')

    salvar.mutate(
      {
        pix_tipo: pixTipo,
        pix_chave: chave,
        pix_nome: normalizarNomePix(pixNome),
        pix_cidade: normalizarCidadePix(pixCidade),
      },
      { onSuccess: () => setPixSalvo(true), onError: (e) => setErroPix((e as Error).message) },
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

      {!isLoading && (
        <div className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Recebimento via Pix</h2>

          <Field label="Tipo de chave">
            <div className="flex flex-wrap gap-2">
              {TIPOS_PIX.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPixTipo(t.value)}
                  className={cn(
                    'min-h-9 rounded-full border px-3 text-sm font-medium',
                    pixTipo === t.value ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Chave Pix">
            <Input value={pixChave} onChange={(e) => setPixChave(e.target.value)} placeholder="Sua chave Pix" />
          </Field>

          <Field label="Nome do recebedor">
            <Input value={pixNome} onChange={(e) => setPixNome(e.target.value)} placeholder="Como aparece no Pix, até 25 caracteres" />
          </Field>

          <Field label="Cidade">
            <Input value={pixCidade} onChange={(e) => setPixCidade(e.target.value)} placeholder="Sua cidade" />
          </Field>

          {erroPix && <p className="text-sm text-red-600">{erroPix}</p>}
          {pixSalvo && <p className="text-sm text-emerald-700">Pix salvo.</p>}
          <Button onClick={handleSalvarPix} className="w-full" disabled={salvar.isPending}>
            Salvar Pix
          </Button>
        </div>
      )}
    </div>
  )
}
