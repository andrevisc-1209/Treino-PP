import { Link } from 'react-router-dom'
import { Copy, Link2, MessageCircle } from 'lucide-react'
import { mostrarInfoGlobal } from '@/components/Toast'
import { linkWhatsAppComTexto } from '@/lib/whatsapp'
import { useProfessionalConfig } from './api'
import { linkDaAgendaPublica } from './publica'

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
