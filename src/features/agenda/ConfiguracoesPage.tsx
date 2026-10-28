import { useEffect, useState } from 'react'
import { ListaSkeleton } from '@/components/Skeleton'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, LifeBuoy, Lock, LogOut, ShieldCheck } from 'lucide-react'
import { IndicacaoCard } from '@/features/indicacao/IndicacaoCard'
import { AvisoAnalytics } from '@/features/analytics/AvisoAnalytics'
import { Acordeao } from '@/components/Acordeao'
import { LocalizacaoCep, type Localizacao } from '@/components/LocalizacaoCep'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { Button, Field, Input, Switch } from '@/components/ui'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mapearErroSupabase } from '@/lib/erros'
import { normalizarChavePix, normalizarNomePix, type PixTipo } from '@/lib/pix'
import { mascararCPF } from '@/lib/cpf'
import { mascararTelefone, validarTelefone } from '@/lib/telefone'
import { enviarTesteWhatsapp } from './whatsapp'
import { AssinaturaSecao } from '@/features/assinatura/AssinaturaSecao'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAtualizarWhatsappOptIn, usePerfilProfissional, useSalvarDadosPessoais, useSalvarLocalidade } from '@/features/auth/api'
import { useTelefoneVerificadoEm } from '@/features/auth/verificacaoTelefone'
import { VerificacaoTelefone } from './VerificacaoTelefone'
import { useProfessionalConfig, useSalvarProfessionalConfig, type SalvarProfessionalConfigInput } from './api'

const TIPOS_PIX: { value: PixTipo; label: string }[] = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

type SecaoId = 'dados' | 'assinatura' | 'localizacao' | 'aulas' | 'pix' | 'notificacoes'

/** `?secao=assinatura` (links do e-mail e do WhatsApp de renovação) abre a seção já expandida. */
const SECOES: SecaoId[] = ['dados', 'assinatura', 'localizacao', 'aulas', 'pix', 'notificacoes']

// Valores quando o personal ainda não tem linha em professional_config.
const PADRAO = { cobrarFalta: true, cobrarCancel: false, duracao: '60', pixTipo: 'cpf' as PixTipo, pixChave: '', pixNome: '' }

export function ConfiguracoesPage() {
  const [reabrirAviso, setReabrirAviso] = useState(0)
  const { session } = useAuth()
  const { data: config, isLoading } = useProfessionalConfig()
  const salvarConfig = useSalvarProfessionalConfig()
  const { data: perfil } = usePerfilProfissional(session?.user.id)
  const atualizarWhatsapp = useAtualizarWhatsappOptIn(session?.user.id ?? '')
  const { data: telefoneVerificadoEm } = useTelefoneVerificadoEm(session?.user.id)
  const telefoneVerificado = !!telefoneVerificadoEm
  const salvarLocalidade = useSalvarLocalidade(session?.user.id ?? '')
  const salvarDados = useSalvarDadosPessoais(session?.user.id ?? '')

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [enviandoTeste, setEnviandoTeste] = useState(false)

  const [loc, setLoc] = useState<Localizacao>({ cep: '', bairro: '', cidade: '', uf: '' })
  const [cobrarFalta, setCobrarFalta] = useState(PADRAO.cobrarFalta)
  const [cobrarCancel, setCobrarCancel] = useState(PADRAO.cobrarCancel)
  const [duracao, setDuracao] = useState(PADRAO.duracao)
  const [pixTipo, setPixTipo] = useState<PixTipo>(PADRAO.pixTipo)
  const [pixChave, setPixChave] = useState(PADRAO.pixChave)
  const [pixNome, setPixNome] = useState(PADRAO.pixNome)

  const [erros, setErros] = useState<Partial<Record<SecaoId, string>>>({})
  const [salvando, setSalvando] = useState(false)
  // true/false = escolha da pessoa; ausente = usa o padrão da seção (abre sozinha só quando falta algo importante)
  const [params] = useSearchParams()
  const secaoDoLink = SECOES.find((s) => s === params.get('secao'))
  const [abertas, setAbertas] = useState<Partial<Record<SecaoId, boolean>>>(() => (secaoDoLink ? { [secaoDoLink]: true } : {}))

  useEffect(() => {
    if (perfil) {
      setNome(perfil.name)
      setTelefone(mascararTelefone(perfil.phone ?? ''))
      setLoc({ cep: '', bairro: perfil.bairro ?? '', cidade: perfil.cidade ?? '', uf: perfil.uf ?? '' })
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
  const localizacaoSuja = !!perfil && (loc.uf !== (perfil.uf ?? '') || loc.cidade !== (perfil.cidade ?? '') || loc.bairro !== (perfil.bairro ?? ''))
  const dadosSujos = !!perfil && (nome.trim() !== perfil.name || telefone.replace(/\D/g, '') !== (perfil.phone ?? ''))
  const algoSujo = aulasSujas || pixSujo || localizacaoSuja || dadosSujos

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
    if (dadosSujos) {
      if (!nome.trim()) novosErros.dados = 'Informe seu nome'
      else if (!validarTelefone(telefone)) novosErros.dados = 'Telefone inválido'
    }
    if (localizacaoSuja && (!loc.uf || !loc.cidade)) novosErros.localizacao = 'Informe o CEP para preencher cidade e estado'
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
      if (dadosSujos) await salvarDados.mutateAsync({ name: nome.trim(), phone: telefone.replace(/\D/g, '') })
      if (localizacaoSuja) await salvarLocalidade.mutateAsync({ uf: loc.uf, cidade: loc.cidade, bairro: loc.bairro })
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
        <ListaSkeleton />
      ) : (
        <div className="space-y-3">
          <Acordeao titulo="Dados pessoais" aberto={estaAberta('dados', false)} onAlternar={() => alternar('dados', false)} alterado={dadosSujos}>
            <Field label="Nome">
              <Input
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  setErros((x) => ({ ...x, dados: undefined }))
                }}
                autoComplete="name"
                maxLength={120}
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={telefone}
                onChange={(e) => {
                  setTelefone(mascararTelefone(e.target.value))
                  setErros((x) => ({ ...x, dados: undefined }))
                }}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
              />
            </Field>
            {session && perfil && (
              <VerificacaoTelefone
                userId={session.user.id}
                telefone={perfil.phone ?? ''}
                verificado={telefoneVerificado && !dadosSujos}
                salvo={!!perfil.phone && validarTelefone(perfil.phone) && telefone.replace(/\D/g, '') === perfil.phone}
              />
            )}
            {session?.user.email && (
              <dl className="text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">E-mail</dt>
                  <dd className="truncate font-medium">{session.user.email}</dd>
                </div>
              </dl>
            )}
            {perfil?.cpf && (
              <Field label="CPF">
                <div className="relative">
                  <Input value={mascararCPF(perfil.cpf)} disabled readOnly className="cursor-not-allowed border-dashed bg-slate-100 pr-10 text-slate-500" />
                  <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">CPF não editável após o cadastro.</p>
              </Field>
            )}
            {erros.dados && <p className="text-sm text-red-600">{erros.dados}</p>}
          </Acordeao>

          <Acordeao titulo="Assinatura" aberto={estaAberta('assinatura', false)} onAlternar={() => alternar('assinatura', false)}>
            <AssinaturaSecao />
          </Acordeao>

          <Acordeao
            titulo="Localização"
            aberto={estaAberta('localizacao', semLocalizacao)}
            onAlternar={() => alternar('localizacao', semLocalizacao)}
            alterado={localizacaoSuja}
          >
            <LocalizacaoCep
              valor={loc}
              preservarSalvo
              onChange={(patch) => {
                setLoc((l) => ({ ...l, ...patch }))
                setErros((e) => ({ ...e, localizacao: undefined }))
              }}
            />
            {!semLocalizacao && !!perfil?.cidade && !perfil.bairro && !loc.bairro && <p className="text-sm text-slate-500">Digite seu CEP para completar o bairro (sua cidade e estado continuam salvos).</p>}
            {semLocalizacao && <p className="text-sm text-amber-700">Informe seu CEP — cidade e estado são obrigatórios no cadastro.</p>}
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
            <p className="text-xs text-slate-500">Este interruptor salva na hora, sem precisar de “Salvar alterações”.</p>
            <p className="text-xs text-slate-500">Com ele ligado você recebe no WhatsApp: a agenda e a previsão do dia (8h), o pagamento do seu plano, o aviso de plano vencendo, alunos parados há 10 dias e o resumo da semana (domingo à noite).</p>
            {perfil?.whatsappOptIn && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                <p className="text-sm text-slate-600">
                  {!validarTelefone(perfil.phone ?? '')
                    ? 'Cadastre um telefone válido em Dados pessoais para receber as mensagens.'
                    : telefoneVerificado
                      ? `As mensagens vão para o telefone dos seus Dados pessoais: ${mascararTelefone(perfil.phone ?? '')}.`
                      : 'Verifique seu telefone em Dados pessoais para começar a receber as mensagens.'}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={enviandoTeste || !validarTelefone(perfil.phone ?? '') || !telefoneVerificado}
                  onClick={async () => {
                    setEnviandoTeste(true)
                    try {
                      await enviarTesteWhatsapp()
                      mostrarInfoGlobal('Mensagem de teste enviada. Confira seu WhatsApp.')
                    } catch (e) {
                      mostrarErroGlobal(mapearErroSupabase(e))
                    } finally {
                      setEnviandoTeste(false)
                    }
                  }}
                >
                  {enviandoTeste ? 'Enviando…' : 'Enviar mensagem de teste'}
                </Button>
                <p className="text-xs text-slate-500">As mensagens nunca incluem dados de saúde dos alunos.</p>
              </div>
            )}
          </Acordeao>

          <IndicacaoCard />

          <Link to="/ajuda" className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2 font-semibold shadow-sm active:bg-slate-50">
            <span className="flex items-center gap-2">
              <LifeBuoy size={20} className="text-slate-500" aria-hidden />
              Central de ajuda
            </span>
            <ChevronRight size={20} className="text-slate-400" aria-hidden />
          </Link>

          <h2 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Privacidade e conta</h2>
          <Link to="/consentimentos" className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2 font-semibold shadow-sm active:bg-slate-50">
            <span className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-slate-500" aria-hidden />
              Consentimentos de saúde dos alunos (LGPD)
            </span>
            <ChevronRight size={20} className="text-slate-400" aria-hidden />
          </Link>

          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-center text-sm text-slate-600 underline"
            onClick={() => setReabrirAviso((n) => n + 1)}
          >
            Preferências de cookies
          </button>
          <AvisoAnalytics reabrir={reabrirAviso} />

          <Link to="/configuracoes/excluir-conta" className="flex min-h-11 items-center justify-center text-sm text-red-700 underline">
            Excluir minha conta
          </Link>

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
