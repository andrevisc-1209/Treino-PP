import { Link } from 'react-router-dom'
import { Copy, Link2, MessageCircle } from 'lucide-react'
import { mostrarInfoGlobal } from '@/components/Toast'
import { linkWhatsAppComTexto } from '@/lib/whatsapp'
import { useProfessionalConfig, useResumoAgendaPublica } from './api'
import { linkDaAgendaPublica } from './publica'
import { rotuloTempo, semMovimento } from './resumoPublica'

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

/** Copiar e enviar por WhatsApp o link da página pública da agenda. */
export function BotoesDoLink({ link }: { link: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={async () => mostrarInfoGlobal((await copiar(link)) ? 'Link copiado.' : 'Não consegui copiar. Selecione o link e copie.')}
        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 active:bg-slate-50"
      >
        <Copy size={16} aria-hidden /> Copiar link
      </button>
      <a
        href={linkWhatsAppComTexto(null, `Quer marcar uma aula comigo? Veja meus horários livres e peça o seu: ${link}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 px-3 text-sm font-medium text-emerald-800 active:bg-emerald-50"
      >
        <MessageCircle size={16} aria-hidden /> Enviar no WhatsApp
      </a>
    </div>
  )
}

function Numero({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${destaque ? 'bg-amber-50' : 'bg-slate-50'}`}>
      <p className="text-lg font-bold leading-tight text-slate-900">{valor}</p>
      <p className="text-xs text-slate-600">{rotulo}</p>
    </div>
  )
}

/** Resultado da página pública: pedidos da semana, os que esperam resposta, o tempo de resposta e as aulas feitas pelo link. Some se não carregar. */
function ResumoDaPagina() {
  const { data } = useResumoAgendaPublica(true)
  if (!data) return null
  if (semMovimento(data)) {
    return <p className="text-xs text-slate-600">Ainda não chegou nenhum pedido. Divulgue o link para seus alunos e contatos.</p>
  }
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Numero valor={String(data.pedidos7d)} rotulo={data.pedidos7d === 1 ? 'pedido nos últimos 7 dias' : 'pedidos nos últimos 7 dias'} />
        <Numero valor={String(data.pendentes)} rotulo="aguardando sua resposta" destaque={data.pendentes > 0} />
        <Numero valor={rotuloTempo(data.medianaRespostaMin)} rotulo="seu tempo de resposta (típico)" />
        <Numero valor={String(data.aulasRealizadas)} rotulo={data.aulasRealizadas === 1 ? 'aula feita pelo link' : 'aulas feitas pelo link'} />
      </div>
      {data.pendentes > 0 && (
        <Link to="/agenda?pedidos=1" className="mt-2 flex min-h-11 items-center text-sm font-medium text-brand-hover underline">
          Responder pedidos
        </Link>
      )}
    </div>
  )
}

/**
 * Cartão da Agenda com o link da página pública para divulgar (aparece só com a página ligada). Com a página desligada e os horários já definidos,
 * mostra só um convite discreto para ligá-la.
 */
export function LinkDaAgendaCard() {
  const { data: config } = useProfessionalConfig()
  if (!config) return null
  const slug = config.agenda_publica_slug
  if (config.agenda_publica_ativa && slug) {
    const link = linkDaAgendaPublica(slug)
    return (
      <section className="mb-4 space-y-2 rounded-2xl bg-white p-3 shadow-sm" aria-label="Link da sua agenda">
        <div className="flex items-start gap-2">
          <Link2 size={18} className="mt-0.5 shrink-0 text-brand-hover" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Seu link de agenda</p>
            <p className="break-all text-xs text-slate-600">{link}</p>
          </div>
          <Link to="/configuracoes?secao=pagina" className="flex min-h-11 shrink-0 items-center text-xs font-medium text-slate-700 underline">
            Ajustes
          </Link>
        </div>
        <BotoesDoLink link={link} />
        <ResumoDaPagina />
      </section>
    )
  }
  if (config.agenda_ajustada_em) {
    return (
      <Link to="/configuracoes?secao=pagina" className="mb-4 flex min-h-11 items-center text-sm font-medium text-brand-hover underline">
        Deixe seus alunos pedirem horário pelo seu link de agenda
      </Link>
    )
  }
  return null
}
