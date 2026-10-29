import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, CircleCheck } from 'lucide-react'
import { Turnstile } from '@/components/Turnstile'
import { Button } from '@/components/ui'
import { hojeSP } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { cn, formatarTelefone } from '@/lib/utils'
import { diasParaEspera, rotuloTurnoEspera, TURNOS_ESPERA, type TurnoEspera } from './espera'
import { corpoDoErro, mensagemDeErroDoPedido, tituloDoDia, validarPedidoNoCliente, type ErrosDoPedido } from './publica'

const campo = 'min-h-12 w-full rounded-xl border bg-white px-3 text-base'

/** Página pública: "Avisar se abrir uma vaga". O visitante deixa nome, telefone, dia e turno; quem avisa é o personal, pelo WhatsApp. */
export function EsperaPublica({ slug, personal, diaInicial }: { slug: string; personal: string; diaInicial: string | null }) {
  const dias = diasParaEspera(hojeSP())
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(diaInicial && dias.some((d) => d.dataISO === diaInicial) ? diaInicial : dias[0].dataISO)
  const [turno, setTurno] = useState<TurnoEspera>('qualquer')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [consentimento, setConsentimento] = useState(false)
  const [token, setToken] = useState('')
  const [reiniciarCaptcha, setReiniciarCaptcha] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [erros, setErros] = useState<ErrosDoPedido>({})
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const temCaptcha = !!import.meta.env.VITE_TURNSTILE_SITE_KEY
  const aoReceberToken = useCallback((t: string) => setToken(t), [])

  const enviar = async () => {
    setErroEnvio(null)
    const e = validarPedidoNoCliente({ nome, telefone, consentimento, temHorario: true })
    setErros(e)
    if (Object.keys(e).length > 0) return
    if (temCaptcha && !token) {
      setErroEnvio('Aguarde a verificação de segurança terminar e toque em enviar de novo.')
      return
    }
    setEnviando(true)
    const { data: resposta, error } = await supabase.functions.invoke('agenda-publica', { body: { slug, acao: 'espera', data, turno, nome, telefone, consentimento, turnstile: token } })
    setEnviando(false)
    if (error) {
      const { status, mensagem } = await corpoDoErro(error)
      setErroEnvio(mensagemDeErroDoPedido(status, mensagem).texto)
      setToken('')
      setReiniciarCaptcha((n) => n + 1)
      return
    }
    if ((resposta as { estado?: string } | null)?.estado === 'enviado') setEnviado(true)
    else setErroEnvio(mensagemDeErroDoPedido(500, null).texto)
  }

  if (enviado) {
    return (
      <section className="space-y-2 rounded-2xl bg-white p-5 text-center shadow-sm" role="status" aria-label="Na lista de espera">
        <CircleCheck size={40} className="mx-auto text-brand-hover" aria-hidden />
        <h2 className="text-lg font-bold">Você está na lista de espera</h2>
        <p className="text-slate-700">
          {personal} chama você pelo WhatsApp se abrir uma vaga em {tituloDoDia(data).toLowerCase()} ({rotuloTurnoEspera(turno).toLowerCase()}).
        </p>
        <p className="text-sm font-medium text-slate-700">Isso não é uma aula marcada. A espera vale por até 14 dias.</p>
      </section>
    )
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-base font-medium text-slate-800 active:bg-slate-50"
      >
        <BellRing size={18} aria-hidden /> Não achou um horário? Avisar se abrir uma vaga
      </button>
    )
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm" aria-label="Lista de espera">
      <div>
        <h2 className="text-lg font-semibold">Avisar se abrir uma vaga</h2>
        <p className="text-sm text-slate-600">{personal} vê seu nome na lista e, se abrir um horário, chama você pelo WhatsApp. Nada é marcado sozinho.</p>
      </div>

      <div>
        <label htmlFor="espera-dia" className="mb-1 block text-sm font-medium">
          Dia
        </label>
        <select id="espera-dia" value={data} onChange={(e) => setData(e.target.value)} className={cn(campo, 'border-slate-300')}>
          {dias.map((d) => (
            <option key={d.dataISO} value={d.dataISO}>
              {d.rotulo}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="espera-turno" className="mb-1 block text-sm font-medium">
          Turno
        </label>
        <select id="espera-turno" value={turno} onChange={(e) => setTurno(e.target.value as TurnoEspera)} className={cn(campo, 'border-slate-300')}>
          {TURNOS_ESPERA.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="espera-nome" className="mb-1 block text-sm font-medium">
          Seu nome
        </label>
        <input
          id="espera-nome"
          value={nome}
          maxLength={80}
          autoComplete="name"
          placeholder="Como podemos te chamar?"
          onChange={(e) => {
            setNome(e.target.value)
            setErros((x) => ({ ...x, nome: undefined }))
          }}
          aria-invalid={!!erros.nome}
          className={cn(campo, erros.nome ? 'border-red-500' : 'border-slate-300')}
        />
        {erros.nome && <p className="mt-1 text-sm text-red-700" role="alert">{erros.nome}</p>}
      </div>
      <div>
        <label htmlFor="espera-telefone" className="mb-1 block text-sm font-medium">
          WhatsApp com DDD
        </label>
        <input
          id="espera-telefone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(21) 99999-9999"
          value={telefone}
          onChange={(e) => {
            setTelefone(formatarTelefone(e.target.value))
            setErros((x) => ({ ...x, telefone: undefined }))
          }}
          aria-invalid={!!erros.telefone}
          className={cn(campo, erros.telefone ? 'border-red-500' : 'border-slate-300')}
        />
        {erros.telefone && <p className="mt-1 text-sm text-red-700" role="alert">{erros.telefone}</p>}
      </div>
      <div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={consentimento}
            onChange={(e) => {
              setConsentimento(e.target.checked)
              setErros((x) => ({ ...x, consentimento: undefined }))
            }}
            className="mt-0.5 size-5 shrink-0 accent-[#367c39]"
          />
          <span>Autorizo {personal} a me chamar pelo WhatsApp se abrir uma vaga.</span>
        </label>
        {erros.consentimento && <p className="text-sm text-red-700" role="alert">{erros.consentimento}</p>}
        <p className="mt-1 text-xs text-slate-600">
          Seu nome e telefone vão só para {personal} e são apagados em até 14 dias. Veja a{' '}
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
          {enviando ? 'Enviando…' : 'Entrar na lista de espera'}
        </Button>
        <button type="button" onClick={() => setAberto(false)} className="flex min-h-11 w-full items-center justify-center text-sm font-medium text-slate-700 underline">
          Cancelar
        </button>
      </div>
    </section>
  )
}
