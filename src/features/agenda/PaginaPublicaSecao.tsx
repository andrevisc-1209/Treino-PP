import { useState } from 'react'
import { Link } from 'react-router-dom'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { Button, Switch } from '@/components/ui'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { mapearErroSupabase } from '@/lib/erros'
import { useConfigurarAgendaPublica, useDisponibilidade, useProfessionalConfig, useSalvarProfessionalConfig } from './api'
import { BotoesDoLink } from './LinkDaAgenda'
import { linkDaAgendaPublica } from './publica'

const LIMITE_APRESENTACAO = 160

/** Texto curto que aparece no topo da página pública; só é gravado ao tocar em Salvar. */
function ApresentacaoCampo({ salva }: { salva: string }) {
  const { exigir } = useExigirAssinatura()
  const salvar = useSalvarProfessionalConfig()
  const [rascunho, setRascunho] = useState<string | null>(null)
  const texto = rascunho ?? salva
  const alterado = texto.trim() !== salva.trim()

  const gravar = async () => {
    try {
      await salvar.mutateAsync({ apresentacao: texto.trim() || null })
      setRascunho(null)
      mostrarInfoGlobal('Apresentação salva.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <div className="space-y-1">
      <label htmlFor="apresentacao-agenda" className="block text-sm font-medium">
        Apresentação <span className="font-normal text-slate-600">(opcional)</span>
      </label>
      <textarea
        id="apresentacao-agenda"
        value={texto}
        maxLength={LIMITE_APRESENTACAO}
        rows={3}
        placeholder="Ex.: Personal trainer há 8 anos. Aulas de musculação e funcional na Barra."
        onChange={(e) => setRascunho(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
      />
      <p className="text-xs text-slate-600">{texto.length}/{LIMITE_APRESENTACAO}. Aparece no topo da página, para qualquer visitante. Não escreva telefone nem dados de saúde.</p>
      {alterado && (
        <Button type="button" onClick={exigir(() => void gravar())} disabled={salvar.isPending}>
          Salvar apresentação
        </Button>
      )}
    </div>
  )
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
      {ativa && <ApresentacaoCampo salva={config?.apresentacao ?? ''} />}
      {ativa && link && (
        <div className="space-y-2">
          <p className="break-all rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{link}</p>
          <BotoesDoLink link={link} />
          <a href={link} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center text-sm font-medium text-brand-hover underline">
            Ver como visitante
          </a>
          <button type="button" onClick={exigir(() => void trocar())} disabled={configurar.isPending} className="min-h-11 text-sm font-medium text-slate-700 underline">
            Trocar o link
          </button>
        </div>
      )}
      {!ativa && slug && <p className="text-xs text-slate-600">Desligada. O link guardado volta a funcionar se você ligar de novo.</p>}
    </div>
  )
}
