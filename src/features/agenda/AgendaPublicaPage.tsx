import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import logoPP from '@/assets/brand/logo-personal-perto-sm.png'
import { Turnstile } from '@/components/Turnstile'
import { Button, Field, Input } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatarDataCompleta } from '@/lib/datas'
import { cn, formatarTelefone } from '@/lib/utils'
import { agruparPorDia, lerConsulta, type RespostaConsulta } from './publica'
import type { Vaga } from './vagas'

const DIAS_INICIAIS = 7

async function mensagemDoErro(error: unknown, padrao: string): Promise<string> {
  const contexto = (error as { context?: Response } | null)?.context
  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json()
      if (typeof corpo?.error === 'string') return corpo.error
    } catch {
      /* corpo ausente ou não-JSON: usa a mensagem padrão */
    }
  }
  return padrao
}

/** Página pública (sem login): o visitante vê as vagas do personal e pede uma aula. O personal aprova depois, pelo app. */
export function AgendaPublicaPage() {
  const { slug = '' } = useParams()
  const [dados, setDados] = useState<RespostaConsulta | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [escolhida, setEscolhida] = useState<Vaga | null>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [consentimento, setConsentimento] = useState(false)
  const [token, setToken] = useState('')
  const [reiniciarCaptcha, setReiniciarCaptcha] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState<Vaga | null>(null)
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

  const enviar = async () => {
    if (!escolhida) return
    setErro(null)
    setEnviando(true)
    const { data, error } = await supabase.functions.invoke('agenda-publica', {
      body: { slug, acao: 'pedir', data: escolhida.dataISO, hora: escolhida.inicio, nome, telefone, mensagem, consentimento, turnstile: token },
    })
    setEnviando(false)
    if (error) {
      const contexto = (error as { context?: Response }).context
      setErro(await mensagemDoErro(error, 'Não foi possível enviar agora. Confira sua conexão e tente novamente.'))
      setToken('')
      setReiniciarCaptcha((n) => n + 1)
      if (contexto?.status === 409) {
        setEscolhida(null)
        void carregar()
      }
      return
    }
    if ((data as { estado?: string } | null)?.estado === 'enviado') setEnviado(escolhida)
    else setErro('Não foi possível enviar agora. Tente novamente.')
  }

  const ok = dados?.estado === 'ok' ? dados : null
  const dias = ok ? agruparPorDia(ok.vagas) : []
  const diasVisiveis = mostrarTodos ? dias : dias.slice(0, DIAS_INICIAIS)
  const pronto = !!escolhida && nome.trim().length >= 2 && telefone.replace(/\D/g, '').length >= 10 && consentimento && (token !== '' || !temCaptcha)

  return (
    <div className="mx-auto min-h-screen max-w-xl space-y-4 p-4">
      <header className="flex items-center gap-3">
        <img src={logoPP} alt="Treino · Personal Perto" className="h-9 w-auto" />
      </header>

      {!dados && !falhou && <p className="py-8 text-center text-slate-600">Carregando as vagas…</p>}
      {falhou && (
        <div className="space-y-3 py-8 text-center">
          <p className="text-slate-700">Não foi possível carregar agora. Confira sua conexão.</p>
          <Button variant="outline" onClick={() => void carregar()}>
            Tentar de novo
          </Button>
        </div>
      )}
      {dados?.estado === 'indisponivel' && (
        <div className="space-y-2 py-8 text-center">
          <h1 className="text-xl font-bold">Agenda indisponível</h1>
          <p className="text-slate-600">Este link não está recebendo pedidos agora. Fale diretamente com o seu personal.</p>
        </div>
      )}

      {ok && enviado && (
        <div className="space-y-3 rounded-2xl bg-white p-5 text-center shadow-sm" role="status">
          <CircleCheck size={40} className="mx-auto text-brand-hover" aria-hidden />
          <h1 className="text-xl font-bold">Pedido enviado!</h1>
          <p className="text-slate-700">
            {formatarDataCompleta(enviado.dataISO)}, às {enviado.inicio}.
          </p>
          <p className="text-slate-600">{ok.nome_personal || 'O personal'} vai responder pelo WhatsApp, no número que você informou, para confirmar.</p>
        </div>
      )}

      {ok && !enviado && (
        <>
          <div>
            <h1 className="text-2xl font-bold">Agende uma aula{ok.nome_personal ? ` com ${ok.nome_personal}` : ''}</h1>
            <p className="text-sm text-slate-600">
              {ok.cidade ? `${ok.cidade} · ` : ''}aulas de {ok.duracao_min} min. Escolha um horário e envie o pedido: {ok.nome_personal || 'o personal'} confirma pelo WhatsApp.
            </p>
          </div>

          {dias.length === 0 && <p className="rounded-2xl bg-white p-4 text-slate-700 shadow-sm">Não há horários livres nas próximas semanas. Fale diretamente com {ok.nome_personal || 'o personal'}.</p>}

          {diasVisiveis.map((d) => (
            <section key={d.dataISO} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm" aria-label={formatarDataCompleta(d.dataISO)}>
              <h2 className="font-semibold">{formatarDataCompleta(d.dataISO)}</h2>
              <div className="flex flex-wrap gap-2">
                {d.vagas.map((v) => {
                  const marcada = escolhida?.dataISO === v.dataISO && escolhida.inicio === v.inicio
                  return (
                    <button
                      key={v.inicio}
                      type="button"
                      aria-pressed={marcada}
                      onClick={() => setEscolhida(v)}
                      className={cn('min-h-11 rounded-full border px-4 text-sm font-medium', marcada ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
                    >
                      {v.inicio}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
          {!mostrarTodos && dias.length > DIAS_INICIAIS && (
            <Button variant="outline" className="w-full" onClick={() => setMostrarTodos(true)}>
              Ver mais dias
            </Button>
          )}

          {escolhida && (
            <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Seus dados">
              <h2 className="font-semibold">
                {formatarDataCompleta(escolhida.dataISO)}, às {escolhida.inicio}
              </h2>
              <Field label="Seu nome">
                <Input value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
              </Field>
              <Field label="Telefone com WhatsApp">
                <Input type="tel" inputMode="numeric" placeholder="(21) 99999-9999" value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} autoComplete="tel" />
              </Field>
              <Field label="Mensagem (opcional)">
                <textarea value={mensagem} maxLength={140} rows={2} onChange={(e) => setMensagem(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                <span className="text-xs text-slate-600">{mensagem.length}/140. Não escreva dados de saúde aqui.</span>
              </Field>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-slate-800">
                <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#367c39]" />
                <span>Autorizo {ok.nome_personal || 'o personal'} a entrar em contato comigo pelo WhatsApp sobre este pedido.</span>
              </label>
              <p className="text-xs text-slate-600">
                Seu nome, telefone e mensagem são enviados só a {ok.nome_personal || 'o personal'}, para responder ao pedido, e apagados em até 30 dias se ele não virar aula. Veja a{' '}
                <Link to="/privacidade" className="underline">
                  Política de Privacidade
                </Link>
                .
              </p>
              <Turnstile onToken={aoReceberToken} reiniciar={reiniciarCaptcha} />
              {erro && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
                  {erro}
                </p>
              )}
              <Button className="w-full" disabled={!pronto || enviando} onClick={() => void enviar()}>
                {enviando ? 'Enviando…' : 'Enviar pedido'}
              </Button>
            </section>
          )}
        </>
      )}
    </div>
  )
}
