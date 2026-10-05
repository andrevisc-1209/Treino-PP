import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Lock, LogOut } from 'lucide-react'
import { Button, Field, Input, Switch } from '@/components/ui'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { normalizarChavePix, normalizarNomePix, type PixTipo } from '@/lib/pix'
import { mascararCPF } from '@/lib/cpf'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAtualizarWhatsappOptIn, usePerfilProfissional, useSalvarLocalidade } from '@/features/auth/api'
import { SeletorCidade } from '@/components/SeletorCidade'
import { useProfessionalConfig, useSalvarProfessionalConfig } from './api'

const TIPOS_PIX: { value: PixTipo; label: string }[] = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

export function ConfiguracoesPage() {
  const { session } = useAuth()
  const { data: config, isLoading } = useProfessionalConfig()
  const salvar = useSalvarProfessionalConfig()
  const { data: perfil } = usePerfilProfissional(session?.user.id)
  const atualizarWhatsapp = useAtualizarWhatsappOptIn(session?.user.id ?? '')
  const salvarLocalidade = useSalvarLocalidade(session?.user.id ?? '')
  const [locUf, setLocUf] = useState('')
  const [locCidade, setLocCidade] = useState('')
  const [locSalvo, setLocSalvo] = useState(false)
  const [erroLoc, setErroLoc] = useState<string | null>(null)

  const [cobrarFalta, setCobrarFalta] = useState(true)
  const [cobrarCancel, setCobrarCancel] = useState(false)
  const [duracao, setDuracao] = useState('60')
  const [salvo, setSalvo] = useState(false)

  const [pixTipo, setPixTipo] = useState<PixTipo>('cpf')
  const [pixChave, setPixChave] = useState('')
  const [pixNome, setPixNome] = useState('')
  const [erroPix, setErroPix] = useState<string | null>(null)
  const [pixSalvo, setPixSalvo] = useState(false)

  useEffect(() => {
    if (perfil) {
      setLocUf(perfil.uf ?? '')
      setLocCidade(perfil.cidade ?? '')
    }
  }, [perfil])

  useEffect(() => {
    if (config) {
      setCobrarFalta(config.cobrar_falta_padrao)
      setCobrarCancel(config.cobrar_cancel_padrao)
      setDuracao(String(config.duracao_padrao_min))
      setPixTipo((config.pix_tipo as PixTipo) ?? 'cpf')
      setPixChave(config.pix_chave ?? '')
      setPixNome(config.pix_nome ?? '')
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
    if (!pixChave.trim() || !pixNome.trim()) {
      setErroPix('Preencha a chave e o nome')
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
            <input type="checkbox" checked={cobrarFalta} onChange={(e) => setCobrarFalta(e.target.checked)} className="size-5 accent-brand" />
          </label>

          <label className="flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3">
            <span className="font-medium">Cobrar cancelamento do aluno por padrão</span>
            <input type="checkbox" checked={cobrarCancel} onChange={(e) => setCobrarCancel(e.target.checked)} className="size-5 accent-brand" />
          </label>

          {salvo && <p className="text-sm text-brand-hover">Configurações salvas.</p>}
          <Button onClick={handleSalvar} className="w-full" disabled={salvar.isPending}>
            Salvar
          </Button>
        </div>
      )}

      {!isLoading && (
        <div className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Dados pessoais</h2>

          {perfil?.cpf && (
            <Field label="CPF">
              <div className="relative">
                <Input value={mascararCPF(perfil.cpf)} disabled readOnly className="cursor-not-allowed border-dashed bg-slate-100 pr-10 text-slate-500" />
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400">CPF não editável após o cadastro.</p>
            </Field>
          )}

          <SeletorCidade
            uf={locUf}
            cidade={locCidade}
            onChange={(uf, cidade) => {
              setLocUf(uf)
              setLocCidade(cidade)
              setLocSalvo(false)
            }}
          />
          {!perfil?.uf && <p className="text-sm text-amber-700">Informe seu estado e cidade — são obrigatórios no cadastro.</p>}
          {erroLoc && <p className="text-sm text-red-600">{erroLoc}</p>}
          {locSalvo && <p className="text-sm text-brand-hover">Localização salva.</p>}
          <Button
            variant="outline"
            className="w-full"
            disabled={salvarLocalidade.isPending}
            onClick={() => {
              if (!locUf || !locCidade) return setErroLoc('Selecione o estado e a cidade')
              setErroLoc(null)
              salvarLocalidade.mutate({ uf: locUf, cidade: locCidade }, { onSuccess: () => setLocSalvo(true) })
            }}
          >
            Salvar localização
          </Button>

          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="font-medium">Alertas de aulas via WhatsApp</span>
            <Switch
              checked={perfil?.whatsappOptIn ?? false}
              onChange={(v) => atualizarWhatsapp.mutate(v)}
              disabled={!session || atualizarWhatsapp.isPending}
              label="Alertas de aulas via WhatsApp"
            />
          </div>
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

          {perfil?.cidade ? (
            <p className="text-sm text-slate-500">
              O QR Code Pix usa a cidade dos seus Dados pessoais: <span className="font-medium text-slate-700">{perfil.cidade}</span>.
            </p>
          ) : (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Cadastre sua cidade nos Dados pessoais acima para habilitar o QR Code Pix.</p>
          )}

          {erroPix && <p className="text-sm text-red-600">{erroPix}</p>}
          {pixSalvo && <p className="text-sm text-brand-hover">Pix salvo.</p>}
          <Button onClick={handleSalvarPix} className="w-full" disabled={salvar.isPending}>
            Salvar Pix
          </Button>

          <Button variant="ghost" className="w-full text-red-600" onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} /> Sair
          </Button>
        </div>
      )}
    </div>
  )
}
