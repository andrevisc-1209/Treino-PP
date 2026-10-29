import { Link } from 'react-router-dom'
import { Copy, MessageCircle } from 'lucide-react'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { Switch } from '@/components/ui'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { mapearErroSupabase } from '@/lib/erros'
import { linkWhatsAppComTexto } from '@/lib/whatsapp'
import { useConfigurarAgendaPublica, useDisponibilidade, useProfessionalConfig } from './api'
import { linkDaAgendaPublica } from './publica'

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

/** Configurações: liga a página pública da agenda, mostra o link para divulgar e permite trocá-lo. Desligada por padrão. */
export function PaginaPublicaSecao() {
  const { exigir } = useExigirAssinatura()
  const { data: config } = useProfessionalConfig()
  const { data: janelas } = useDisponibilidade()
  const configurar = useConfigurarAgendaPublica()
  const ativa = !!config?.agenda_publica_ativa
  const slug = config?.agenda_publica_slug ?? null
  const link = slug ? linkDaAgendaPublica(slug) : null
  const semHorarios = (janelas?.length ?? 0) === 0

  const alternar = async (ligar: boolean) => {
    try {
      await configurar.mutateAsync({ ativa: ligar })
      mostrarInfoGlobal(ligar ? 'Página ligada. Quem tiver o link já pode pedir uma aula.' : 'Página desligada. O link para de receber pedidos.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  const trocar = async () => {
    const seguir = await confirmarAcao({
      titulo: 'Trocar o link?',
      mensagem: 'O link atual para de funcionar na hora. Quem já o recebeu vai ver "agenda indisponível" até você enviar o novo.',
      textoConfirmar: 'Trocar link',
      textoCancelar: 'Manter',
    })
    if (!seguir) return
    try {
      await configurar.mutateAsync({ ativa, trocarLink: true })
      mostrarInfoGlobal('Link trocado.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Com a página ligada, quem tiver o seu link vê os seus horários livres e pede uma aula. Nada é marcado sozinho: você aprova cada pedido na Agenda e é avisado no sino e por WhatsApp.
      </p>
      <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3">
        <span className="font-medium">Aceitar pedidos pelo link</span>
        <Switch checked={ativa} onChange={(v) => exigir(() => void alternar(v))()} disabled={configurar.isPending} label="Aceitar pedidos pelo link" />
      </label>
      {ativa && semHorarios && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
          Você ainda não definiu seus horários, então ninguém verá vagas. <Link to="/agenda/disponibilidade" className="font-medium underline">Definir disponibilidade</Link>.
        </p>
      )}
      {ativa && link && (
        <div className="space-y-2">
          <p className="break-all rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{link}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => mostrarInfoGlobal((await copiar(link)) ? 'Link copiado.' : 'Não consegui copiar. Selecione o link acima e copie.')}
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
          <button type="button" onClick={exigir(() => void trocar())} disabled={configurar.isPending} className="min-h-11 text-sm font-medium text-slate-700 underline">
            Trocar o link
          </button>
        </div>
      )}
      {!ativa && slug && <p className="text-xs text-slate-600">Desligada. O link guardado volta a funcionar se você ligar de novo.</p>}
    </div>
  )
}
