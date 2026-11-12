import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { Button, Field, Input } from '@/components/ui'
import { APP_NAME, APP_URL } from '@/config/app'
import { Turnstile } from '@/components/Turnstile'
import { TERMOS_USO_VERSAO, PRIVACIDADE_VERSAO } from '@/features/legal/textos'
import { mapearErroAuth } from '@/lib/errosAuth'
import { formatarIdentificador, identificadorValido, tipoIdentificador } from './identificador'
import { entrarComCpf } from './loginCpf'
import { ErroAmigavel, mensagemDaFuncao } from '@/lib/erroAmigavel'
import { mostrarInfoGlobal } from '@/components/Toast'
import { SocialLoginButtons } from '@/components/SocialLoginButtons'
import { mascararCPF, validarCPF } from '@/lib/cpf'
import { emailParecido, useCadastroExistente, useCaptchaVerificacao } from './verificarCadastro'
import { ERROS } from '@/lib/mensagens'
import { PasswordInput } from '@/components/PasswordInput'
import { MedidorDeSenha } from '@/components/MedidorDeSenha'
import { avaliarSenha, SENHA_MIN } from '@/lib/senha'
import { sugerirEmail } from './sugestaoEmail'
import iconMark from '@/assets/brand/icon-mark.png'
import { AvisoAnalytics } from '@/features/analytics/AvisoAnalytics'
import { guardarCodigoDoLink } from '@/features/indicacao/indicacao'
import { guardarOrigemDoLink } from '@/features/analytics/origem'
import { evento } from '@/features/analytics/analytics'

const CAPTCHA_ATIVO = !!import.meta.env.VITE_TURNSTILE_SITE_KEY
const ALLOW_SIGNUP = import.meta.env.VITE_ALLOW_SIGNUP === 'true'
const REENVIO_ESPERA_SEGUNDOS = 60
const DICA_SPAM = 'Se não chegar em alguns minutos, olhe a caixa de spam.'

function buildSchema(mode: 'login' | 'signup' | 'recuperar') {
  const base = z.object({
    name: mode === 'signup' ? z.string().min(1, 'Nome é obrigatório') : z.string().optional(),
    email: mode === 'login' ? z.string().refine(identificadorValido, 'Informe um e-mail ou CPF válido') : z.string().email('E-mail inválido'),
    password:
      mode === 'signup'
        ? z.string().refine((s) => avaliarSenha(s).valida, `Use pelo menos ${SENHA_MIN} caracteres e evite sequências e senhas comuns`)
        : z.string().min(6, 'Mínimo 6 caracteres'),
    cpf: mode === 'signup' ? z.string().refine(validarCPF, ERROS.CPF.invalido) : z.string().optional(),
    termosAceitos:
      mode === 'signup'
        ? z.boolean().refine((v) => v === true, { message: 'Você precisa aceitar os Termos de Uso e a Política de Privacidade' })
        : z.boolean().optional(),
  })
  return base
}
type Form = z.infer<ReturnType<typeof buildSchema>>

const schemaRecuperar = z.object({ email: z.string().refine(identificadorValido, 'Informe um e-mail ou CPF válido') })
type FormRecuperar = z.infer<typeof schemaRecuperar>

/**
 * Logo no topo das telas de entrada. No navegador leva de volta à página inicial (quem chegou pelo cadastro e quer rever a oferta não fica
 * sem saída); no app instalado (PWA) fica só a imagem, porque a página inicial é de divulgação e tiraria a pessoa do app.
 */
function LogoDaMarca({ className }: { className: string }) {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const imagem = <img src={iconMark} alt="Personal Perto" className={className} />
  if (standalone) return imagem
  return (
    <a href="/landing.html" aria-label="Voltar à página inicial do Treino" className="mx-auto block w-fit">
      {imagem}
    </a>
  )
}

/** Aviso de que o CPF/e-mail digitado já tem conta: só diz que existe (nada da conta aparece) e leva para entrar ou recuperar a senha. */
function AvisoJaCadastrado({ oque, onEntrar, onRecuperar }: { oque: 'CPF' | 'e-mail'; onEntrar: () => void; onRecuperar: () => void }) {
  return (
    <div role="alert" className="space-y-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      <p>Já existe uma conta com este {oque}. Entre ou recupere a senha em vez de criar outra.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onEntrar} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-medium">
          Entrar
        </button>
        <button type="button" onClick={onRecuperar} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-medium">
          Esqueci minha senha
        </button>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { session } = useAuth()
  const [searchParams] = useSearchParams()
  // A landing aponta pra /login?modo=cadastro — abre direto na aba de criar conta.
  const [mode, setMode] = useState<'login' | 'signup' | 'recuperar'>(
    ALLOW_SIGNUP && searchParams.get('modo') === 'cadastro' ? 'signup' : 'login',
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaVez, setCaptchaVez] = useState(0)
  const [emailPendente, setEmailPendente] = useState<string | null>(null)
  const [emailPendenteOrigem, setEmailPendenteOrigem] = useState<'signup' | 'login'>('signup')
  const [reenviando, setReenviando] = useState(false)
  const [esperaReenvio, setEsperaReenvio] = useState(0)
  // recuperar senha: depois de enviar, o botão espera 60 s (o Supabase só manda 1 e-mail por minuto)
  const [esperaRecuperar, setEsperaRecuperar] = useState(0)
  const [captchaDemorou, setCaptchaDemorou] = useState(false)

  const { register, handleSubmit, formState, setValue, watch, trigger } = useForm<Form>({
    resolver: zodResolver(buildSchema(mode)),
    defaultValues: { termosAceitos: false },
  })
  const recuperarForm = useForm<FormRecuperar>({ resolver: zodResolver(schemaRecuperar) })
  const termosAceitos = watch('termosAceitos')
  const senhaValor = watch('password')
  const cpfValor = watch('cpf')
  const emailCadastro = watch('email')
  // avisa já ao digitar (CPF completo / e-mail válido) se existe conta; só no cadastro
  const captchaCpf = useCaptchaVerificacao()
  const captchaEmail = useCaptchaVerificacao()
  const cpfJaExiste = useCadastroExistente('cpf', cpfValor ?? '', mode === 'signup' && validarCPF(cpfValor ?? ''), captchaCpf) === true
  const sugestaoDeEmail = mode === 'signup' ? sugerirEmail(emailCadastro ?? '') : null
  const emailJaExiste = useCadastroExistente('email', emailCadastro ?? '', mode === 'signup' && emailParecido(emailCadastro ?? ''), captchaEmail) === true

  // sem token depois de 12 s (rede lenta, bloqueador de anúncios): em vez de ficar travado em "Verificando…", oferece tentar de novo
  useEffect(() => {
    if (!CAPTCHA_ATIVO || captchaToken) return
    const t = setTimeout(() => setCaptchaDemorou(true), 12_000)
    return () => {
      clearTimeout(t)
      setCaptchaDemorou(false)
    }
  }, [captchaToken, captchaVez, mode])

  useEffect(() => {
    if (esperaReenvio <= 0) return
    const t = setTimeout(() => setEsperaReenvio((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [esperaReenvio])

  useEffect(() => {
    if (esperaRecuperar <= 0) return
    const t = setTimeout(() => setEsperaRecuperar((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [esperaRecuperar])

  // link de indicação (?ref=): guarda o código até a pessoa entrar (o servidor valida depois)
  useEffect(() => {
    guardarCodigoDoLink(window.location.search, !!session)
    guardarOrigemDoLink(window.location.search, !!session)
  }, [session])

  // funil: a pessoa abriu o formulário de cadastro (1 evento por abertura da tela)
  useEffect(() => {
    if (mode === 'signup') evento('cadastro_aberto')
  }, [mode])

  if (session) return <Navigate to="/" replace />

  // O token do Turnstile vale para uma única chamada ao Auth: depois de usar (com sucesso ou erro) pede-se um novo ao widget.
  const gastarCaptcha = () => {
    setCaptchaToken('')
    setCaptchaVez((v) => v + 1)
  }
  // Com o captcha ligado no Auth, enviar sem token só gera erro: espera o widget terminar em vez de chamar a rede.
  const faltaCaptcha = (): boolean => {
    if (!CAPTCHA_ATIVO || captchaToken) return false
    setMsg('Aguarde a verificação de segurança terminar (alguns segundos) e tente de novo.')
    return true
  }

  const irParaEntrar = (identificador: string) => {
    setMode('login')
    setValue('email', identificador)
    setMsg(null)
  }
  const irParaRecuperar = (email: string) => {
    setMode('recuperar')
    recuperarForm.setValue('email', email)
    setMsg(null)
  }

  if (emailPendente) {
    const reenviar = async () => {
      if (faltaCaptcha()) return
      setReenviando(true)
      setMsg(null)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailPendente,
        options: { captchaToken: captchaToken || undefined },
      })
      setReenviando(false)
      gastarCaptcha()
      if (error) setMsg(mapearErroAuth(error))
      else {
        mostrarInfoGlobal('E-mail reenviado')
        setEsperaReenvio(REENVIO_ESPERA_SEGUNDOS)
      }
    }
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow">
          <LogoDaMarca className="logo-marca mx-auto h-12 w-auto" />
          <h1 className="text-xl font-bold">Confirme seu e-mail</h1>
          <p className="text-sm text-slate-600">
            {emailPendenteOrigem === 'login'
              ? `Confirme seu e-mail antes de entrar. Enviamos um link para ${emailPendente}.`
              : `Enviamos um link de confirmação para ${emailPendente}. Abra o e-mail e clique no link pra ativar sua conta.`}
          </p>
          {emailPendenteOrigem !== 'login' && (
            <p className="text-xs text-slate-600">
              Se este e-mail já tinha conta, nenhum e-mail novo chega: entre com e-mail e senha ou com o Google, ou recupere a senha.
            </p>
          )}
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <div className="flex justify-center">
            <Turnstile onToken={setCaptchaToken} reiniciar={captchaVez} />
          </div>
          <Button onClick={reenviar} variant="outline" className="w-full" disabled={reenviando || esperaReenvio > 0}>
            {esperaReenvio > 0
              ? `Reenviar e-mail de confirmação (${esperaReenvio}s)`
              : reenviando
                ? 'Reenviando…'
                : 'Reenviar e-mail de confirmação'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEmailPendente(null)
              setMode('login')
              setMsg(null)
            }}
          >
            Ir para o login
          </Button>
          {emailPendenteOrigem !== 'login' && (
            <button
              type="button"
              className="min-h-11 w-full text-sm text-slate-600 underline"
              onClick={() => {
                const email = emailPendente
                setEmailPendente(null)
                irParaRecuperar(email)
              }}
            >
              Esqueci minha senha
            </button>
          )}
        </div>
      </div>
    )
  }

  const onSubmit = async (f: Form) => {
    setMsg(null)
    if (faltaCaptcha()) return
    if (mode === 'login' && tipoIdentificador(f.email) === 'cpf') {
      try {
        await entrarComCpf(f.email, f.password, captchaToken)
      } catch (e) {
        setMsg(e instanceof ErroAmigavel ? e.message : 'Não foi possível entrar agora. Tente de novo.')
      }
      gastarCaptcha()
      return
    }
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: f.email,
        password: f.password,
        options: { captchaToken: captchaToken || undefined },
      })
      gastarCaptcha()
      if (error) {
        if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
          setEmailPendenteOrigem('login')
          setEmailPendente(f.email)
        } else {
          setMsg(mapearErroAuth(error))
        }
      }
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: {
        data: {
          name: f.name ?? '',
          cpf: (f.cpf ?? '').replace(/\D/g, ''),
          termos_versao: TERMOS_USO_VERSAO,
          privacidade_versao: PRIVACIDADE_VERSAO,
        },
        emailRedirectTo: APP_URL,
        captchaToken: captchaToken || undefined,
      },
    })
    gastarCaptcha()
    if (error) {
      setMsg(mapearErroAuth(error))
      return
    }
    evento('cadastro_enviado')
    // E-mail que já tem conta (ex.: criada antes via Google): com "Confirm email" ativo o Supabase não devolve erro, só um user
    // "fake" com identities: [] e sem sessão — de propósito, para não revelar quem já é cliente. Antes o app desfazia isso na tela
    // ("Este e-mail já está cadastrado"); agora mostra a MESMA tela de confirmação de um cadastro novo (que já orienta quem tem conta).
    if (data.user && data.user.identities?.length === 0) {
      setEmailPendenteOrigem('signup')
      setEmailPendente(f.email)
      return
    }
    if (!data.session) {
      // Projeto exige confirmação de e-mail — o AuthProvider ainda não tem sessão,
      // então o guard de "session" no topo deste componente não redireciona sozinho.
      setEmailPendenteOrigem('signup')
      setEmailPendente(f.email)
    }
    // Se já veio sessão (confirmação de e-mail desligada no projeto), o
    // AuthProvider atualiza e o guard acima redireciona pra "/" sozinho.
  }

  const onSubmitRecuperar = async (f: FormRecuperar) => {
    setMsg(null)
    if (faltaCaptcha()) return
    if (tipoIdentificador(f.email) === 'cpf') {
      // CPF: a função resolve o e-mail no servidor e responde sempre igual (não revela se o CPF tem conta nem o e-mail).
      const { data, error } = await supabase.functions.invoke('recuperar-senha-cpf', { body: { cpf: f.email.replace(/\D/g, ''), captchaToken: captchaToken || undefined } })
      gastarCaptcha()
      if (error) setMsg(await mensagemDaFuncao(error, 'Não foi possível enviar agora. Tente de novo.'))
      else {
        setMsg(`${(data as { mensagem?: string } | null)?.mensagem ?? 'Se houver uma conta com esse CPF, enviamos o link para o e-mail do cadastro.'} ${DICA_SPAM}`)
        setEsperaRecuperar(REENVIO_ESPERA_SEGUNDOS)
      }
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), {
      redirectTo: APP_URL + 'definir-senha',
      captchaToken: captchaToken || undefined,
    })
    gastarCaptcha()
    if (error) setMsg(mapearErroAuth(error))
    else {
      setMsg(`Se o e-mail existir, enviamos um link para redefinir a senha. ${DICA_SPAM}`)
      setEsperaRecuperar(REENVIO_ESPERA_SEGUNDOS)
    }
  }

  if (mode === 'recuperar') {
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <form onSubmit={recuperarForm.handleSubmit(onSubmitRecuperar)} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
          <div>
            <LogoDaMarca className="logo-marca mx-auto mb-3 h-12 w-auto" />
            <h1 className="text-2xl font-bold">Recuperar senha</h1>
            <p className="text-sm text-slate-500">Informe seu CPF ou e-mail para receber o link de redefinição no e-mail do cadastro.</p>
          </div>
          <Field label="CPF ou e-mail" error={recuperarForm.formState.errors.email?.message}>
            <Input
              type="text"
              inputMode="email"
              {...recuperarForm.register('email', { onChange: (e) => recuperarForm.setValue('email', formatarIdentificador(e.target.value)) })}
              autoComplete="username"
              autoFocus
            />
          </Field>
          <div className="flex justify-center">
            <Turnstile onToken={setCaptchaToken} reiniciar={captchaVez} />
          </div>
          {msg && <p className="text-sm text-slate-600">{msg}</p>}
          <Button type="submit" className="w-full" disabled={recuperarForm.formState.isSubmitting || esperaRecuperar > 0}>
            {esperaRecuperar > 0 ? `Enviar de novo em ${esperaRecuperar}s` : 'Enviar link'}
          </Button>
          <button
            type="button"
            className="min-h-11 w-full text-sm text-brand-hover"
            onClick={() => {
              setMode('login')
              setMsg(null)
            }}
          >
            Voltar para o login
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div className="text-center">
          <LogoDaMarca className="logo-marca mx-auto h-12 w-auto" />
          <h1 className="mt-2 text-xl font-bold">{APP_NAME}</h1>
          {mode === 'signup' ? (
            // a oferta da página inicial segue na tela do cadastro: a pessoa lembra o que ganha ao preencher
            <p className="text-sm font-medium text-brand-hover">Comece seus 15 dias grátis · sem cartão</p>
          ) : (
            <p className="text-sm text-slate-500">Assistente do personal</p>
          )}
        </div>
        {/* Google primeiro nas duas telas: quem tem conta Google resolve em um toque, sem ler campo nenhum */}
        <SocialLoginButtons acao={mode === 'login' ? 'entrar' : 'criar'} />
        {mode === 'signup' && (
          <>
            <Field label="Nome" error={formState.errors.name?.message}>
              <Input {...register('name')} autoComplete="name" autoFocus />
            </Field>
            <Field label="CPF" error={formState.errors.cpf?.message}>
              <Input
                value={cpfValor ?? ''}
                onChange={(e) => setValue('cpf', mascararCPF(e.target.value), { shouldValidate: true })}
                onBlur={() => trigger('cpf')}
                inputMode="numeric"
                placeholder="000.000.000-00"
                className={formState.errors.cpf ? 'border-red-600 focus:border-red-600' : undefined}
              />
            </Field>
            {cpfJaExiste && (
              <AvisoJaCadastrado oque="CPF" onEntrar={() => irParaEntrar(cpfValor ?? '')} onRecuperar={() => irParaRecuperar('')} />
            )}
          </>
        )}
        <Field label={mode === 'login' ? 'CPF ou e-mail' : 'E-mail'} error={formState.errors.email?.message}>
          {mode === 'login' ? (
            <Input
              {...register('email', { onChange: (e) => setValue('email', formatarIdentificador(e.target.value)) })}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="000.000.000-00 ou voce@email.com"
            />
          ) : (
            <Input type="email" {...register('email', { onBlur: () => void trigger('email') })} autoComplete="email" />
          )}
        </Field>
        {mode === 'signup' && sugestaoDeEmail && (
          <p className="text-sm text-slate-700">
            Você quis dizer <strong>{sugestaoDeEmail}</strong>?{' '}
            <button
              type="button"
              className="inline-flex min-h-11 items-center font-medium text-brand-hover underline"
              onClick={() => {
                setValue('email', sugestaoDeEmail, { shouldValidate: true })
              }}
            >
              Corrigir
            </button>
          </p>
        )}
        {mode === 'signup' && emailJaExiste && (
          <AvisoJaCadastrado oque="e-mail" onEntrar={() => irParaEntrar(emailCadastro ?? '')} onRecuperar={() => irParaRecuperar(emailCadastro ?? '')} />
        )}
        <Field label="Senha" error={formState.errors.password?.message}>
          <PasswordInput {...register('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </Field>
        {mode === 'signup' && <MedidorDeSenha senha={senhaValor ?? ''} />}

        {mode === 'signup' && (
          <>
            <label className="flex min-h-11 items-start gap-3 py-1">
              <input
                type="checkbox"
                className="mt-0.5 size-6 shrink-0 accent-brand"
                checked={!!termosAceitos}
                onChange={(e) => setValue('termosAceitos', e.target.checked, { shouldValidate: true })}
              />
              <span className="text-sm text-slate-600">
                Li e aceito os{' '}
                <a href={`${import.meta.env.BASE_URL}termos`} target="_blank" rel="noreferrer" className="font-medium text-brand-hover underline">
                  Termos de Uso
                </a>{' '}
                e a{' '}
                <a href={`${import.meta.env.BASE_URL}privacidade`} target="_blank" rel="noreferrer" className="font-medium text-brand-hover underline">
                  Política de Privacidade
                </a>
              </span>
            </label>
            {formState.errors.termosAceitos && <p className="text-xs text-red-600">{formState.errors.termosAceitos.message}</p>}

            <div className="flex justify-center">
              <Turnstile onToken={setCaptchaToken} reiniciar={captchaVez} />
            </div>
            {/* tokens próprios do aviso "já tem conta?" (um por campo): não gastam o do cadastro; invisíveis, salvo se o Cloudflare pedir um clique */}
            <div className="flex justify-center">
              <Turnstile onToken={captchaCpf.aoReceber} reiniciar={captchaCpf.vez} />
            </div>
            <div className="flex justify-center">
              <Turnstile onToken={captchaEmail.aoReceber} reiniciar={captchaEmail.vez} />
            </div>
          </>
        )}

        {mode === 'login' && (
          <div className="flex justify-center">
            <Turnstile onToken={setCaptchaToken} reiniciar={captchaVez} />
          </div>
        )}

        {msg && <p className="text-sm text-slate-600">{msg}</p>}
        {(() => {
          // o que impede de continuar, em palavras (o botão cinza sem explicação era um beco sem saída)
          const faltas: string[] = []
          if (mode === 'signup' && formState.errors.cpf) faltas.push('um CPF válido')
          if (mode === 'signup' && (cpfJaExiste || emailJaExiste)) faltas.push('outro CPF/e-mail, ou entre na conta que já existe')
          if (mode === 'signup' && formState.errors.email) faltas.push('um e-mail válido')
          if (mode === 'signup' && !avaliarSenha(senhaValor ?? '').valida) faltas.push(`uma senha com pelo menos ${SENHA_MIN} caracteres, sem ser óbvia`)
          const verificando = CAPTCHA_ATIVO && !captchaToken
          return (
            <>
              {faltas.length > 0 && <p className="text-xs text-slate-600">Para continuar, informe {faltas.join(' e ')}.</p>}
              {verificando && captchaDemorou && (
                <p className="text-sm text-slate-600">
                  A verificação de segurança está demorando. Confira a conexão ou desative o bloqueador de anúncios e{' '}
                  <button type="button" className="font-medium text-brand-hover underline" onClick={() => setCaptchaVez((v) => v + 1)}>
                    tente de novo
                  </button>
                  .
                </p>
              )}
              <Button type="submit" className="w-full" disabled={formState.isSubmitting || faltas.length > 0 || verificando}>
                {formState.isSubmitting
                  ? mode === 'login'
                    ? 'Entrando…'
                    : 'Criando conta…'
                  : verificando && faltas.length === 0
                    ? 'Verificando segurança…'
                    : mode === 'login'
                      ? 'Entrar'
                      : 'Criar conta'}
              </Button>
            </>
          )
        })()}

        {mode === 'login' && (
          <button type="button" className="min-h-11 w-full text-sm text-slate-600 underline" onClick={() => irParaRecuperar(emailCadastro ?? '')}>
            Esqueci minha senha
          </button>
        )}

        {ALLOW_SIGNUP && (
          <button
            type="button"
            className={
              mode === 'login'
                ? 'min-h-12 w-full rounded-xl border border-brand text-sm font-semibold text-brand-hover active:bg-brand-soft'
                : 'min-h-11 w-full text-sm text-brand-hover'
            }
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setMsg(null)
            }}
          >
            {mode === 'login' ? 'Criar minha conta' : 'Fazer login'}
          </button>
        )}
      </form>
      <AvisoAnalytics />
    </div>
  )
}
