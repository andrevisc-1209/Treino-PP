import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Lock, LogOut } from 'lucide-react'
import { Acordeao } from '@/components/Acordeao'
import { SeletorCidade } from '@/components/SeletorCidade'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { Button, Field, Input, Switch } from '@/components/ui'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mapearErroSupabase } from '@/lib/erros'
import { normalizarChavePix, normalizarNomePix, type PixTipo } from '@/lib/pix'
import { mascararCPF } from '@/lib/cpf'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAtualizarWhatsappOptIn, usePerfilProfissional, useSalvarLocalidade } from '@/features/auth/api'
import { useProfessionalConfig, useSalvarProfessionalConfig, type SalvarProfessionalConfigInput } from './api'

const TIPOS_PIX: { value: PixTipo; label: string }[] = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

type SecaoId = 'dados' | 'localizacao' | 'aulas' | 'pix' | 'notificacoes'

// Valores quando o personal ainda não tem linha em professional_config.
const PADRAO = { cobrarFalta: true, cobrarCancel: false, duracao: '60', pixTipo: 'cpf' as PixTipo, pixChave: '', pixNome: '' }

export function ConfiguracoesPage() {
  const { session } = useAuth()
  const { data: config, isLoading } = useProfessionalConfig()
  const salvarConfig = useSalvarProfessionalConfig()
  const { data: perfil } = usePerfilProfissional(session?.user.id)
  const atualizarWhatsapp = useAtualizarWhatsappOptIn(session?.user.id ?? '')
  const salvarLocalidade = useSalvarLocalidade(session?.user.id ?? '')

  const [locUf, setLocUf] = useState('')
  const [locCidade, setLocCidade] = useState('')
  const [cobrarFalta, setCobrarFalta] = useState(PADRAO.cobrarFalta)
  const [cobrarCancel, setCobrarCancel] = useState(PADRAO.cobrarCancel)
  const [duracao, setDuracao] = useState(PADRAO.duracao)
  const [pixTipo, setPixTipo] = useState<PixTipo>(PADRAO.pixTipo)
  const [pixChave, setPixChave] = useState(PADRAO.pixChave)
  const [pixNome, setPixNome] = useState(PADRAO.pixNome)

  const [erros, setErros] = useState<Partial<Record<SecaoId, string>>>({})
  const [salvando, setSalvando] = useState(false)
  // true/false = escolha da pessoa; ausente = usa o padrão da seção (abre sozinha só quando falta algo importante)
  const [abertas, setAbertas] = useState<Partial<Record<SecaoId, boolean>>>({})

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
      setPixTipo((config.pix_tipo as PixTipo) ?? PADRAO.pixTipo)
      setPixChave(config.pix_chave ?? '')
      setPixNome(config.pix_nome ?? '')
    }
  }, [config])

  // ---- "sujo": o que mudou em relação ao que está salvo
  const salvoAulas = {
    cobrarFalta: config?.cobrar_falta_padrao ?? PADRAO.cobrarFalta,
    cobrarCancel: config?.cobrar_cancel_padrao ?? PADRAO.cobrarCancel,
    duracao: config ? String(config.duracao_padrao_min) : PADRAO.duracao,
  }
  const aulasSujas = cobrarFalta !== salvoAulas.cobrarFalta || cobrarCancel !== salvoAulas.cobrarCancel || duracao !== salvoAulas.duracao
  const pixSujo =
    pixTipo !== ((config?.pix_tipo as PixTipo | null) ?? PADRAO.pixTipo) ||
    pixChave !== (config?.pix_chave ?? PADRAO.pixChave) ||
    pixNome !== (config?.pix_nome ?? PADRAO.pixNome)
  const localizacaoSuja = !!perfil && (locUf !== (perfil.uf ?? '') || locCidade !== (perfil.cidade ?? ''))
  const algoSujo = aulasSujas || pixSujo || localizacaoSuja

  const estaAberta = (id: SecaoId, padrao: boolean) => abertas[id] ?? padrao
  const alternar = (id: SecaoId, padrao: boolean) => setAbertas((a) => ({ ...a, [id]: !(a[id] ?? padrao) }))

  const validarPix = (): string | null => {
    if (!pixChave.trim() || !pixNome.trim()) return 'Preencha a chave e o nome'
    const chave = normalizarChavePix(pixTipo, pixChave)
    if (pixTipo === 'cpf' && chave.length !== 11) return 'CPF inválido'
    if (pixTipo === 'cnpj' && chave.length !== 14) return 'CNPJ inválido'
    if (pixTipo === 'email' && !chave.includes('@')) return 'E-mail inválido'
    if (pixTipo === 'telefone' && chave.replace(/\D/g, '').length < 12) return 'Telefone inválido'
    return null
  }

  const salvarTudo = async () => {
    const novosErros: Partial<Record<SecaoId, string>> = {}
    if (localizacaoSuja && (!locUf || !locCidade)) novosErros.localizacao = 'Selecione o estado e a cidade'
    if (pixSujo) {
      const e = validarPix()
      if (e) novosErros.pix = e
    }
    setErros(novosErros)
    const comErro = Object.keys(novosErros) as SecaoId[]
    if (comErro.length > 0) {
      setAbertas((a) => ({ ...a, ...Object.fromEntries(comErro.map((id) => [id, true])) }))
      return
    }

    setSalvando(true)
    try {
      const cfg: SalvarProfessionalConfigInput = {}
      if (aulasSujas) {
        cfg.cobrar_falta_padrao = cobrarFalta
        cfg.cobrar_cancel_padrao = cobrarCancel
        cfg.duracao_padrao_min = Number(duracao) || 60
      }
      if (pixSujo) {
        cfg.pix_tipo = pixTipo
        cfg.pix_chave = normalizarChavePix(pixTipo, pixChave)
        cfg.pix_nome = normalizarNomePix(pixNome)
      }
      if (Object.keys(cfg).length > 0) await salvarConfig.mutateAsync(cfg)
      if (localizacaoSuja) await salvarLocalidade.mutateAsync({ uf: locUf, cidade: locCidade })
      mostrarInfoGlobal('Alterações salvas.')
      ;(document.activeElement as HTMLElement | null)?.blur()
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    } finally {
      setSalvando(false)
    }
  }

  const semLocalizacao = !!perfil && !perfil.uf

  return (
    <div className="mx-auto max-w-2xl p-4 pb-40">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="flex size-12 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Configurações</h1>
      </header>

      {isLoading ? (
        <p className="text-slate-500">Carregando…</p>
      ) : (
        <div className="space-y-3">
          <Acordeao titulo="Dados pessoais" aberto={estaAberta('dados', false)} onAlternar={() => alternar('dados', false)}>
            <dl className="space-y-1 text-sm">
              {perfil?.name && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Nome</dt>
                  <dd className="truncate font-medium">{perfil.name}</dd>
                </div>
              )}
              {session?.user.email && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">E-mail</dt>
                  <dd className="truncate font-medium">{session.user.email}</dd>
                </div>
              )}
            </dl>
            {perfil?.cpf && (
              <Field label="CPF">
                <div className="relative">
                  <Input value={mascararCPF(perfil.cpf)} disabled readOnly className="cursor-not-allowed border-dashed bg-slate-100 pr-10 text-slate-500" />
                  <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400">CPF não editável após o cadastro.</p>
              </Field>
            )}
          </Acordeao>

          <Acordeao
            titulo="Localização"
            aberto={estaAberta('localizacao', semLocalizacao)}
            onAlternar={() => alternar('localizacao', semLocalizacao)}
            alterado={localizacaoSuja}
          >
            <SeletorCidade
              uf={locUf}
              cidade={locCidade}
              onChange={(uf, cidade) => {
                setLocUf(uf)
                setLocCidade(cidade)
                setErros((e) => ({ ...e, localizacao: undefined }))
              }}
            />
            {semLocalizacao && <p className="text-sm text-amber-700">Informe seu estado e cidade — são obrigatórios no cadastro.</p>}
            {erros.localizacao && <p className="text-sm text-red-600">{erros.localizacao}</p>}
          </Acordeao>

          <Acordeao titulo="Aulas e cobrança" aberto={estaAberta('aulas', false)} onAlternar={() => alternar('aulas', false)} alterado={aulasSujas}>
            <Field label="Duração padrão da aula (minutos)">
              <Input type="number" inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
            </Field>
            <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3">
              <span className="font-medium">Cobrar falta por padrão</span>
              <input type="checkbox" checked={cobrarFalta} onChange={(e) => setCobrarFalta(e.target.checked)} className="size-6 accent-brand" />
            </label>
            <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3">
              <span className="font-medium">Cobrar cancelamento do aluno por padrão</span>
              <input type="checkbox" checked={cobrarCancel} onChange={(e) => setCobrarCancel(e.target.checked)} className="size-6 accent-brand" />
            </label>
          </Acordeao>

          <Acordeao titulo="Recebimento via Pix" aberto={estaAberta('pix', false)} onAlternar={() => alternar('pix', false)} alterado={pixSujo}>
            <Field label="Tipo de chave">
              <div className="flex flex-wrap gap-2">
                {TIPOS_PIX.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={pixTipo === t.value}
                    onClick={() => setPixTipo(t.value)}
                    className={cn(
                      'min-h-11 rounded-full border px-4 text-sm font-medium',
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
                O QR Code Pix usa a cidade da sua Localização: <span className="font-medium text-slate-700">{perfil.cidade}</span>.
              </p>
            ) : (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Cadastre sua cidade em Localização acima para habilitar o QR Code Pix.</p>
            )}
            {erros.pix && <p className="text-sm text-red-600">{erros.pix}</p>}
          </Acordeao>

          <Acordeao titulo="Notificações" aberto={estaAberta('notificacoes', false)} onAlternar={() => alternar('notificacoes', false)}>
            <div className="flex min-h-12 items-center justify-between gap-3">
              <span className="font-medium">Alertas de aulas via WhatsApp</span>
              <Switch
                checked={perfil?.whatsappOptIn ?? false}
                onChange={(v) => atualizarWhatsapp.mutate(v)}
                disabled={!session || atualizarWhatsapp.isPending}
                label="Alertas de aulas via WhatsApp"
              />
            </div>
            <p className="text-xs text-slate-400">Este interruptor salva na hora, sem precisar de “Salvar alterações”.</p>
          </Acordeao>

          <Button variant="ghost" className="w-full text-red-600" onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} /> Sair
          </Button>
        </div>
      )}

      {algoSujo && (
        // O mousedown tira o foco do campo; com o teclado fechando, a barra sobe e a bottom nav reaparece embaixo do dedo
        // antes do clique chegar. Segurar o foco aqui mantém o layout parado até o toque terminar.
        <div
          data-barra-fixa
          onMouseDown={(e) => e.preventDefault()}
          className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 px-4"
        >
          <div className="mx-auto max-w-2xl">
            <Button onClick={salvarTudo} disabled={salvando} className="min-h-12 w-full shadow-lg">
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
