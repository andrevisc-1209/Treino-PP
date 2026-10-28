import { useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import { useAluno } from '@/features/alunos/api'
import { BottomSheet, Button } from '@/components/ui'
import { Copy, MessageCircle } from 'lucide-react'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { gerarMensagemTreino } from '@/lib/mensagemTreino'
import { linkWhatsApp, linkWhatsAppComTexto } from '@/lib/whatsapp'
import type { ModalidadeDetalhes, ModalidadeTipo } from '@/types/modalidades'
import { buscarExerciciosParaMensagem, gerarLinkTreino } from './api'
import { avisoValidade, lerValidadePadrao, salvarValidadePadrao, SeletorValidadeLink, type ValidadeLink } from './validadeLink'
import { mapearErroSupabase } from '@/lib/erros'

export type TreinoParaEnvio = { id: string; name: string; modalidade: ModalidadeTipo; detalhes: ModalidadeDetalhes }
type Treino = TreinoParaEnvio | (() => Promise<TreinoParaEnvio>)

type Previa = { texto: string; telefone: string | null | undefined; avisoDoPrazo: string }

/**
 * Envia o treino ao aluno pelo WhatsApp (mensagem pronta + link público para registrar a execução).
 * A mensagem NÃO vai mais direto no link `wa.me?text=`: dependendo do aparelho/aplicativo o WhatsApp corrompe os emojis (vira "�")
 * e a formatação se perde. Em vez disso o personal vê a mensagem numa folha, **copia e abre a conversa** e cola: o texto chega intacto.
 * O treino pode vir como função assíncrona (ex.: criar o treino a partir de um treino planejado primeiro).
 *
 * `enviar(treino, validade)`: com a validade já escolhida (ex.: na folha "Tipo de sessão"), envia direto.
 * Sem ela, abre a folha `seletor` (renderize-a na tela) para o personal escolher a validade do link antes de confirmar.
 */
export function useEnviarTreinoAoAluno(alunoId: string): { enviar: (treino: Treino, validade?: ValidadeLink) => Promise<void>; seletor: ReactNode } {
  const { session } = useAuth()
  const { data: aluno } = useAluno(alunoId)
  const { data: perfil } = usePerfilProfissional(session?.user.id)
  const [pendente, setPendente] = useState<Treino | null>(null)
  const [validade, setValidade] = useState<ValidadeLink>(lerValidadePadrao)
  const resolverRef = useRef<(() => void) | null>(null)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [textoEditavel, setTextoEditavel] = useState('')

  const executar = async (treino: Treino, escolhida: ValidadeLink) => {
    try {
      const t = typeof treino === 'function' ? await treino() : treino
      const [exercicios, gerado] = await Promise.all([
        t.modalidade === 'musculacao' ? buscarExerciciosParaMensagem(t.id) : Promise.resolve(undefined),
        gerarLinkTreino(t.id, escolhida),
      ])
      const mensagem = gerarMensagemTreino({
        nomeAluno: aluno?.name ?? 'aluno',
        nomePersonal: perfil?.name || 'Seu personal',
        nomeTreino: t.name,
        modalidade: t.modalidade,
        detalhes: t.detalhes,
        exercicios,
        link: gerado.link,
        expiraEm: gerado.expiraEm,
      })
      setTextoEditavel(mensagem)
      setPrevia({ texto: mensagem, telefone: aluno?.phone, avisoDoPrazo: avisoValidade(escolhida, gerado.expiraEm) })
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  /** Copia a mensagem (a cópia começa no toque, antes de abrir o WhatsApp) e, se pedido, abre a conversa do aluno. */
  const copiarEAbrir = async (abrir: boolean) => {
    if (!previa) return
    const copia = navigator.clipboard?.writeText(textoEditavel)
    if (abrir) window.open(linkWhatsApp(previa.telefone) ?? 'https://wa.me/', '_blank', 'noopener,noreferrer')
    try {
      await copia
      mostrarInfoGlobal(abrir ? 'Mensagem copiada: cole na conversa do WhatsApp.' : 'Mensagem copiada.')
    } catch {
      mostrarErroGlobal('Não deu para copiar. Toque no texto, selecione tudo e copie.')
    }
  }

  const abrirComTexto = () => {
    if (!previa) return
    window.open(linkWhatsAppComTexto(previa.telefone, textoEditavel), '_blank', 'noopener,noreferrer')
  }

  const enviar = async (treino: Treino, validadeEscolhida?: ValidadeLink) => {
    if (validadeEscolhida !== undefined) {
      salvarValidadePadrao(validadeEscolhida)
      return executar(treino, validadeEscolhida)
    }
    setValidade(lerValidadePadrao())
    setPendente(treino)
    await new Promise<void>((resolve) => {
      resolverRef.current = resolve
    })
  }

  const fechar = () => {
    setPendente(null)
    resolverRef.current?.()
    resolverRef.current = null
  }

  const confirmar = () => {
    const t = pendente
    if (!t) return
    salvarValidadePadrao(validade)
    const feito = executar(t, validade)
    setPendente(null)
    feito.finally(() => {
      resolverRef.current?.()
      resolverRef.current = null
    })
  }

  const seletor = (
    <BottomSheet open={!!pendente} onClose={fechar} title="Enviar ao aluno">
      <div className="space-y-4">
        <SeletorValidadeLink valor={validade} onChange={setValidade} />
        <p className="text-sm text-slate-600">
          {validade === 'sem_prazo'
            ? 'Sem prazo definido: o link vale até o aluno registrar o treino, no máximo por 30 dias.'
            : `Depois de ${validade}h o link deixa de abrir e o aluno precisa pedir outro.`}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Enviar</Button>
        </div>
      </div>
    </BottomSheet>
  )

  const fecharPrevia = () => {
    if (previa) mostrarInfoGlobal(previa.avisoDoPrazo)
    setPrevia(null)
  }

  const seletorComPrevia = (
    <>
      {seletor}
      <BottomSheet open={!!previa} onClose={fecharPrevia} title="Mensagem para o aluno">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Copie a mensagem e cole na conversa do WhatsApp: assim os emojis e a formatação chegam certinhos. Você pode ajustar o texto antes.
          </p>
          <textarea
            aria-label="Mensagem para o aluno"
            value={textoEditavel}
            onChange={(e) => setTextoEditavel(e.target.value)}
            rows={12}
            className="max-h-72 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <Button onClick={() => copiarEAbrir(true)} className="w-full">
            <MessageCircle size={18} aria-hidden /> Copiar e abrir WhatsApp
          </Button>
          <Button variant="outline" onClick={() => copiarEAbrir(false)} className="w-full">
            <Copy size={18} aria-hidden /> Só copiar mensagem
          </Button>
          <button type="button" onClick={abrirComTexto} className="flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-brand-hover active:bg-slate-100">
            Abrir WhatsApp com o texto pronto
          </button>
        </div>
      </BottomSheet>
    </>
  )

  return { enviar, seletor: seletorComPrevia }
}
