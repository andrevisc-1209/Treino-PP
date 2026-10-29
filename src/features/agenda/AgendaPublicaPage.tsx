import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarCheck, ChevronLeft, ChevronRight, CircleCheck, Clock, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import logoPP from '@/assets/brand/logo-personal-perto-sm.png'
import { Turnstile } from '@/components/Turnstile'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatarDataCompleta } from '@/lib/datas'
import { cn, formatarTelefone } from '@/lib/utils'
import { agruparPorDia, agruparPorTurno, cartaoDoDia, iniciais, lerConsulta, mensagemDeErroDoPedido, tituloDoDia, validarPedidoNoCliente, type ErrosDoPedido, type RespostaConsulta } from './publica'
import type { Vaga } from './vagas'

async function corpoDoErro(error: unknown): Promise<{ status: number | undefined; mensagem: string | null }> {
  const contexto = (error as { context?: Response } | null)?.context
  if (!contexto || typeof contexto.status !== 'number') return { status: undefined, mensagem: null }
  let mensagem: string | null = null
  try {
    const corpo = await contexto.json()
    if (typeof corpo?.error === 'string') mensagem = corpo.error
  } catch {
    /* corpo ausente ou não-JSON */
  }
  return { status: contexto.status, mensagem }
}

const campo = 'min-h-12 w-full rounded-xl border bg-white px-3 text-base'

function Erro({ id, texto }: { id: string; texto?: string }) {
  return texto ? (
    <p id={id} className="mt-1 text-sm text-red-700" role="alert">
      {texto}
    </p>
  ) : null
}

function Esqueleto() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="size-14 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
        </div>
      </div>
      <div className="h-20 rounded-2xl bg-slate-200" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-20 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-24 rounded-2xl bg-slate-200" />
    </div>
  )
}

/** Página pública (sem login): o visitante vê os horários livres do personal e pede uma aula. O personal aprova depois, pelo app. */
export function AgendaPublicaPage() {
  const { slug = '' } = useParams()
  const [dados, setDados] = useState<RespostaConsulta | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null)
  const [escolhida, setEscolhida] = useState<Vaga | null>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [consentimento, setConsentimento] = useState(false)
  const [token, setToken] = useState('')
  const [reiniciarCaptcha, setReiniciarCaptcha] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [erros, setErros] = useState<ErrosDoPedido>({})
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [enviado, setEnviado] = useState<Vaga | null>(null)
  const faixaRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLElement>(null)
  const temCaptcha = !!import.meta.env.VITE_TURNSTILE_SITE_KEY
  const aoReceberToken = useCallback((t: string) => setToken(t), [])

  const carregar = useCallback(async () => {
    setFalhou(false)
    const { data, error } = await supabase.functions.invoke('agenda-publica', { body: { slug, acao: 'consultar' } })
    if (error) {
      setFalhou(true)
      return
    }
    setDados(lerConsulta(data))
  }, [slug])

  useEffect(() => {
    // carregar atualiza o estado só depois da resposta da rede
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar()
  }, [carregar])

  const ok = dados?.estado === 'ok' ? dados : null
  const personal = ok?.nome_personal || 'o personal'
  const dias = ok ? agruparPorDia(ok.vagas) : []
  const diaAtual = dias.find((d) => d.dataISO === diaEscolhido) ?? dias[0] ?? null

  const escolher = (v: Vaga) => {
    setEscolhida(v)
    setErros((e) => ({ ...e, horario: undefined }))
    // o formulário abre logo abaixo: leva o olhar até ele
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const enviar = async () => {
    setErroEnvio(null)
    const e = validarPedidoNoCliente({ nome, telefone, consentimento, temHorario: !!escolhida })
    setErros(e)
    if (Object.keys(e).length > 0 || !escolhida) return
    if (temCaptcha && !token) {
      setErroEnvio('Aguarde a verificação de segurança terminar e toque em enviar de novo.')
      return
    }
    setEnviando(true)
    const { data, error } = await supabase.functions.invoke('agenda-publica', {
      body: { slug, acao: 'pedir', data: escolhida.dataISO, hora: escolhida.inicio, nome, telefone, mensagem, consentimento, turnstile: token },
    })
    setEnviando(false)
    if (error) {
      const { status, mensagem: doServidor } = await corpoDoErro(error)
      const r = mensagemDeErroDoPedido(status, doServidor)
      setErroEnvio(r.texto)
      setToken('')
      setReiniciarCaptcha((n) => n + 1)
      if (r.vagaOcupada) {
        setEscolhida(null)
        void carregar()
      }
      return
    }
    if ((data as { estado?: string } | null)?.estado === 'enviado') setEnviado(escolhida)
    else setErroEnvio(mensagemDeErroDoPedido(500, null).texto)
  }

  const rolarFaixa = (sentido: 1 | -1) => faixaRef.current?.scrollBy({ left: sentido * 240, behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl space-y-4 px-4 pb-10 pt-6">
        {!dados && !falhou && <Esqueleto />}

        {falhou && (
          <div className="space-y-3 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-slate-700">Não foi possível carregar os horários. Confira sua conexão.</p>
            <Button variant="outline" onClick={() => void carregar()}>
              Tentar de novo
            </Button>
          </div>
        )}

        {dados?.estado === 'indisponivel' && (
          <div className="space-y-2 rounded-2xl bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold">Esta página não está disponível</h1>
            <p className="text-slate-600">O link pode ter sido desativado ou não existir. Confira o endereço ou peça um novo link ao seu personal.</p>
          </div>
        )}

        {ok && (
          <>
            <header className="flex items-start gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white" aria-hidden>
                {iniciais(ok.nome_personal) || <CalendarCheck size={24} />}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight">Agende uma aula com {personal}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                  {ok.cidade && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} aria-hidden /> {ok.cidade}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock size={14} aria-hidden /> Aulas de {ok.duracao_min} minutos
                  </span>
                </p>
                {ok.apresentacao && <p className="mt-2 text-sm text-slate-700">{ok.apresentacao}</p>}
              </div>
            </header>

            {enviado ? (
              <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm" role="status" aria-label="Pedido enviado">
                <div className="text-center">
                  <CircleCheck size={44} className="mx-auto text-brand-hover" aria-hidden />
                  <h2 className="mt-2 text-xl font-bold">Pedido enviado!</h2>
                  <p className="mt-1 text-slate-700">
                    Seu pedido para {formatarDataCompleta(enviado.dataISO).toLowerCase()}, às {enviado.inicio}, foi recebido.
                  </p>
                </div>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  <li className="flex items-start gap-3 p-3">
                    <Clock size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
                    <div>
                      <p className="font-semibold">Aguardando confirmação</p>
                      <p className="text-sm text-slate-600">{ok.nome_personal || 'O personal'} precisa aprovar o pedido para a aula ser marcada.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 p-3">
                    <MessageCircle size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
                    <div>
                      <p className="font-semibold">Fique de olho no WhatsApp</p>
                      <p className="text-sm text-slate-600">A resposta vem pelo número que você informou.</p>
                    </div>
                  </li>
                </ul>
                <p className="text-center text-sm font-medium text-slate-700">Você ainda não tem uma aula confirmada.</p>
              </section>
            ) : (
              <>
                <p className="text-slate-700">Escolha um horário disponível e envie seu pedido. {ok.nome_personal || 'O personal'} confirma antes de marcar a aula.</p>
                <div className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-3">
                  <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand-hover" aria-hidden />
                  <div>
                    <p className="font-semibold">Você escolhe. {ok.nome_personal || 'O personal'} confirma.</p>
                    <p className="text-sm text-slate-700">Nenhuma aula é marcada sem aprovação.</p>
                  </div>
                </div>

                {dias.length === 0 ? (
                  <section className="space-y-1 rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="font-semibold">Nenhum horário livre no momento</h2>
                    <p className="text-sm text-slate-600">A agenda está sem vagas para pedir agora. Volte mais tarde ou fale diretamente com {ok.nome_personal || 'o personal'}.</p>
                  </section>
                ) : (
                  <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Escolha do horário">
                    <div>
                      <h2 className="text-lg font-semibold">Escolha um horário</h2>
                      <p className="text-sm text-slate-600">Toque em um dia para ver os horários.</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => rolarFaixa(-1)} aria-label="Dias anteriores" className="hidden size-11 shrink-0 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100 sm:flex">
                        <ChevronLeft size={20} aria-hidden />
                      </button>
                      <div ref={faixaRef} className="flex flex-1 snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Dias com horários livres">
                        {dias.map((d) => {
                          const c = cartaoDoDia(d)
                          const marcado = diaAtual?.dataISO === d.dataISO
                          return (
                            <button
                              key={d.dataISO}
                              type="button"
                              aria-pressed={marcado}
                              aria-label={`${tituloDoDia(d.dataISO)}, ${c.vagas}`}
                              onClick={() => setDiaEscolhido(d.dataISO)}
                              className={cn(
                                'flex min-h-20 w-[4.5rem] shrink-0 snap-start flex-col items-center justify-center rounded-xl border px-1 py-2',
                                marcado ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-800 active:bg-slate-50',
                              )}
                            >
                              <span className="text-xs font-medium tracking-wide">{c.sigla}</span>
                              <span className="text-2xl font-bold leading-tight">{c.numero}</span>
                              <span className={cn('text-xs', marcado ? 'text-white/90' : 'text-slate-600')}>{c.vagas}</span>
                            </button>
                          )
                        })}
                      </div>
                      <button type="button" onClick={() => rolarFaixa(1)} aria-label="Próximos dias" className="hidden size-11 shrink-0 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100 sm:flex">
                        <ChevronRight size={20} aria-hidden />
                      </button>
                    </div>

                    {diaAtual && (
                      <div className="space-y-3 border-t border-slate-100 pt-3">
                        <h3 className="font-semibold">{tituloDoDia(diaAtual.dataISO)}</h3>
                        {agruparPorTurno(diaAtual.vagas).map((g) => (
                          <div key={g.turno} className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{g.rotulo}</p>
                            <div className="grid grid-cols-3 gap-2">
                              {g.vagas.map((v) => {
                                const marcada = escolhida?.dataISO === v.dataISO && escolhida.inicio === v.inicio
                                return (
                                  <button
                                    key={v.inicio}
                                    type="button"
                                    aria-pressed={marcada}
                                    onClick={() => escolher(v)}
                                    className={cn('min-h-12 rounded-xl border text-base font-medium', marcada ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-800 active:bg-slate-50')}
                                  >
                                    {v.inicio}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-slate-600">O horário só é reservado depois da confirmação de {ok.nome_personal || 'o personal'}.</p>
                      </div>
                    )}
                    {erros.horario && <Erro id="erro-horario" texto={erros.horario} />}
                  </section>
                )}

                {escolhida && (
                  <section ref={formRef} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm" aria-label="Solicitar esta aula">
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                      <CalendarCheck size={20} className="mt-0.5 shrink-0 text-brand-hover" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">Solicitar esta aula</p>
                        <p className="text-sm text-slate-700">
                          {formatarDataCompleta(escolhida.dataISO)}, às {escolhida.inicio} · {ok.duracao_min} min
                        </p>
                      </div>
                      <button type="button" onClick={() => setEscolhida(null)} className="min-h-11 shrink-0 text-sm font-medium text-slate-700 underline">
                        Trocar
                      </button>
                    </div>

                    <div>
                      <label htmlFor="pedido-nome" className="mb-1 block text-sm font-medium">
                        Seu nome
                      </label>
                      <input id="pedido-nome" value={nome} maxLength={80} autoComplete="name" placeholder="Como podemos te chamar?" onChange={(e) => {
                          setNome(e.target.value)
                          setErros((x) => ({ ...x, nome: undefined }))
                        }} aria-invalid={!!erros.nome} aria-describedby={erros.nome ? 'erro-nome' : undefined} className={cn(campo, erros.nome ? 'border-red-500' : 'border-slate-300')} />
                      <Erro id="erro-nome" texto={erros.nome} />
                    </div>
                    <div>
                      <label htmlFor="pedido-telefone" className="mb-1 block text-sm font-medium">
                        WhatsApp com DDD
                      </label>
                      <input id="pedido-telefone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="(21) 99999-9999" value={telefone} onChange={(e) => {
                          setTelefone(formatarTelefone(e.target.value))
                          setErros((x) => ({ ...x, telefone: undefined }))
                        }} aria-invalid={!!erros.telefone} aria-describedby={erros.telefone ? 'erro-telefone' : undefined} className={cn(campo, erros.telefone ? 'border-red-500' : 'border-slate-300')} />
                      <Erro id="erro-telefone" texto={erros.telefone} />
                    </div>
                    <div>
                      <label htmlFor="pedido-mensagem" className="mb-1 block text-sm font-medium">
                        Mensagem <span className="font-normal text-slate-600">(opcional)</span>
                      </label>
                      <textarea id="pedido-mensagem" value={mensagem} maxLength={140} rows={3} placeholder="Conte brevemente o que você procura…" onChange={(e) => setMensagem(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base" />
                      <p className="text-xs text-slate-600">{mensagem.length}/140. Não escreva dados de saúde aqui.</p>
                    </div>
                    <div>
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-slate-800">
                        <input type="checkbox" checked={consentimento} onChange={(e) => {
                          setConsentimento(e.target.checked)
                          setErros((x) => ({ ...x, consentimento: undefined }))
                        }} aria-describedby={erros.consentimento ? 'erro-consentimento' : undefined} className="mt-0.5 size-5 shrink-0 accent-[#367c39]" />
                        <span>Autorizo {ok.nome_personal || 'o personal'} a entrar em contato comigo pelo WhatsApp para tratar deste pedido.</span>
                      </label>
                      <Erro id="erro-consentimento" texto={erros.consentimento} />
                      <p className="mt-1 text-xs text-slate-600">
                        Seu nome, telefone e mensagem vão só para {ok.nome_personal || 'o personal'}, que os usa para responder ao pedido. Se ele não virar aula, são apagados em até 30 dias. Veja a{' '}
                        <Link to="/privacidade" className="underline">
                          Política de Privacidade
                        </Link>
                        .
                      </p>
                    </div>

                    <Turnstile onToken={aoReceberToken} reiniciar={reiniciarCaptcha} />
                    {erroEnvio && (
                      <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
                        {erroEnvio}
                      </p>
                    )}
                    <div className="space-y-1">
                      <Button className="min-h-12 w-full text-base" disabled={enviando} onClick={() => void enviar()}>
                        {enviando ? 'Enviando…' : 'Enviar pedido de aula'}
                      </Button>
                      <p className="text-center text-xs text-slate-600">Enviar o pedido não confirma a aula.</p>
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        <footer className="flex items-center justify-center gap-2 pt-4 text-xs text-slate-600">
          <img src={logoPP} alt="" className="h-5 w-auto" aria-hidden />
          <span>Feito com Treino · Personal Perto</span>
        </footer>
      </div>
    </div>
  )
}
