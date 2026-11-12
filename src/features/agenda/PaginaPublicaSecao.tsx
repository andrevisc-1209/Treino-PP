import { useState } from 'react'
import { Link } from 'react-router-dom'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { Button, Field, Input, Switch } from '@/components/ui'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { mapearErroSupabase } from '@/lib/erros'
import { useConfigurarAgendaPublica, useDisponibilidade, useProfessionalConfig, useSalvarProfessionalConfig, type ProfessionalConfig } from './api'
import { LIMITES_PERFIL, perfilDigitadoDe, perfilParaSalvar, type PerfilDigitado } from './perfilPagina'
import { mascararCref } from './cref'
import { lerModalidades, OPCOES_DE_MODALIDADE } from './modalidadesAtendimento'
import type { ModalidadeTipo } from '@/types/modalidades'
import { cn } from '@/lib/utils'
import { BotoesDoLink } from './LinkDaAgenda'
import { FotoDoPerfil } from './FotoDoPerfil'
import { LocaisDoPersonal } from './LocaisDoPersonal'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
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


/**
 * Perfil opcional da página: CREF, modalidades, onde atende e o valor "a partir de". Cada campo só aparece para o visitante se for
 * preenchido, e nada é publicado sem o personal tocar em Salvar. Quem preenche é o próprio personal; nada vem de dado de aluno.
 */
function PerfilCampos({ config }: { config: ProfessionalConfig | null | undefined }) {
  const { exigir } = useExigirAssinatura()
  const salvar = useSalvarProfessionalConfig()
  const { session } = useAuth()
  const { data: perfilProf } = usePerfilProfissional(session?.user.id)
  const salvo = perfilDigitadoDe(config)
  const [rascunho, setRascunho] = useState<PerfilDigitado | null>(null)
  const [erro, setErro] = useState<{ campo: 'cref' | 'preco'; texto: string } | null>(null)
  const valor = rascunho ?? salvo
  const alterado = JSON.stringify({ ...valor, cref: valor.cref.trim(), preco: valor.preco.trim() }) !== JSON.stringify({ ...salvo, cref: salvo.cref.trim(), preco: salvo.preco.trim() })
  const mudar = <K extends keyof PerfilDigitado>(campo: K, v: PerfilDigitado[K]) => {
    setRascunho({ ...valor, [campo]: v })
    setErro(null)
  }
  const alternarModalidade = (m: ModalidadeTipo) => mudar('modalidades', lerModalidades(valor.modalidades.includes(m) ? valor.modalidades.filter((x) => x !== m) : [...valor.modalidades, m]))

  const gravar = async () => {
    const r = perfilParaSalvar(valor)
    if (!r.ok) return setErro({ campo: r.campo, texto: r.erro })
    try {
      await salvar.mutateAsync(r.dados)
      setRascunho(null)
      mostrarInfoGlobal('Perfil da página salvo.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-3">
      <div>
        <p className="text-sm font-medium">Perfil na página (opcional)</p>
        <p className="text-xs text-slate-600">Quem abre o seu link vê o que você preencher aqui, para saber com quem está falando. Campo vazio não aparece.</p>
      </div>
      <FotoDoPerfil foto={config?.pagina_foto} nome={perfilProf?.name ?? ''} />
      <Field label="CREF" error={erro?.campo === 'cref' ? erro.texto : undefined}>
        <Input value={valor.cref} inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={LIMITES_PERFIL.cref} placeholder="012345-G/RJ" onChange={(e) => mudar('cref', mascararCref(e.target.value))} />
      </Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Modalidades que você atende</p>
        <p className="text-xs text-slate-600">Quem pede aula pela página escolhe uma delas.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Modalidades que você atende">
          {OPCOES_DE_MODALIDADE.map((o) => {
            const marcada = valor.modalidades.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={marcada}
                onClick={() => alternarModalidade(o.value)}
                className={cn('min-h-11 rounded-full border px-4 text-sm font-medium', marcada ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
      <LocaisDoPersonal config={config} />
      <Field label="Valor por aula, a partir de (R$)" error={erro?.campo === 'preco' ? erro.texto : undefined}>
        <Input value={valor.preco} inputMode="decimal" placeholder="Ex.: 120,00" onChange={(e) => mudar('preco', e.target.value)} />
      </Field>
      <p className="text-xs text-slate-600">Tudo isto, inclusive a foto, fica visível a qualquer pessoa com o link. Não escreva telefone nem dados de saúde.</p>
      {alterado && (
        <Button type="button" onClick={exigir(() => void gravar())} disabled={salvar.isPending}>
          Salvar perfil
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
      {ativa && <PerfilCampos config={config} />}
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
