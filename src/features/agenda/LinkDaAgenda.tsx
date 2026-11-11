import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Copy, Link2, MessageCircle } from 'lucide-react'
import { NumeroComRotulo } from '@/components/NumeroComRotulo'
import { mostrarInfoGlobal } from '@/components/Toast'
import { linkWhatsAppComTexto } from '@/lib/whatsapp'
import { useProfessionalConfig, useResumoAgendaPublica } from './api'
import { linkDaAgendaPublica } from './publica'
import { linhaDoLink, medianaConfiavel, rotuloTempo, semMovimento } from './resumoPublica'

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

/** Copiar e enviar por WhatsApp o link da página pública da agenda. */
export function BotoesDoLink({ link, semCopiar }: { link: string; semCopiar?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {!semCopiar && (
      <button
        type="button"
        onClick={async () => mostrarInfoGlobal((await copiar(link)) ? 'Link copiado.' : 'Não consegui copiar. Selecione o link e copie.')}
        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 active:bg-slate-50"
      >
        <Copy size={16} aria-hidden /> Copiar link
      </button>
      )}
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
        <NumeroComRotulo valor={String(data.pedidos7d)} rotulo={data.pedidos7d === 1 ? 'pedido nos últimos 7 dias' : 'pedidos nos últimos 7 dias'} />
        <NumeroComRotulo valor={String(data.pendentes)} rotulo="aguardando sua resposta" destaque={data.pendentes > 0} />
        <NumeroComRotulo valor={rotuloTempo(medianaConfiavel(data))} rotulo="seu tempo de resposta (típico)" />
        <NumeroComRotulo valor={String(data.aulasRealizadas)} rotulo={data.aulasRealizadas === 1 ? 'aula feita pelo link' : 'aulas feitas pelo link'} />
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
 * Cartão da Agenda com o link da página pública (só com a página ligada). Fechado é uma linha: nome, um resumo curto e "Copiar". Aberto mostra
 * o endereço, o WhatsApp, os números e os ajustes: o link se divulga de vez em quando, a agenda se consulta toda hora, então a agenda vem primeiro.
 * Com a página desligada e os horários já definidos, mostra só um convite discreto para ligá-la.
 */
export function LinkDaAgendaCard() {
  const { data: config } = useProfessionalConfig()
  const { data: resumo } = useResumoAgendaPublica(!!config?.agenda_publica_ativa)
  const [aberto, setAberto] = useState(false)
  if (!config) return null
  const slug = config.agenda_publica_slug
  if (config.agenda_publica_ativa && slug) {
    const link = linkDaAgendaPublica(slug)
    return (
      <section className="mb-4 rounded-2xl bg-white shadow-sm" aria-label="Link da sua agenda">
        <div className="flex items-center gap-1 py-1 pl-3 pr-1">
          <Link2 size={18} className="shrink-0 text-brand-hover" aria-hidden />
          <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center pl-1 text-left">
            <span className="text-sm font-semibold">Link da agenda</span>
            <span className="max-w-full truncate text-xs text-slate-600">{linhaDoLink(resumo)}</span>
          </button>
          <button
            type="button"
            onClick={async () => mostrarInfoGlobal((await copiar(link)) ? 'Link copiado.' : 'Não consegui copiar. Selecione o link e copie.')}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 active:bg-slate-50"
          >
            <Copy size={16} aria-hidden /> Copiar
          </button>
          <button type="button" onClick={() => setAberto((v) => !v)} aria-label={aberto ? 'Recolher detalhes do link' : 'Ver detalhes do link'} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100">
            <ChevronDown size={18} className={aberto ? 'rotate-180' : ''} aria-hidden />
          </button>
        </div>
        {aberto && (
          <div className="space-y-2 border-t border-slate-100 p-3">
            <p className="break-all text-xs text-slate-700">{link}</p>
            <BotoesDoLink link={link} semCopiar />
            <ResumoDaPagina />
            <Link to="/configuracoes?secao=pagina" className="flex min-h-11 items-center text-sm font-medium text-slate-700 underline">
              Ajustes da página
            </Link>
          </div>
        )}
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
