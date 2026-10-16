import { useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import { useAluno } from '@/features/alunos/api'
import { BottomSheet, Button } from '@/components/ui'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { gerarMensagemTreino } from '@/lib/mensagemTreino'
import { linkWhatsAppComTexto } from '@/lib/whatsapp'
import type { ModalidadeDetalhes, ModalidadeTipo } from '@/types/modalidades'
import { buscarExerciciosParaMensagem, gerarLinkTreino } from './api'
import { avisoValidade, lerValidadePadrao, salvarValidadePadrao, SeletorValidadeLink, type ValidadeLink } from './validadeLink'

export type TreinoParaEnvio = { id: string; name: string; modalidade: ModalidadeTipo; detalhes: ModalidadeDetalhes }
type Treino = TreinoParaEnvio | (() => Promise<TreinoParaEnvio>)

/**
 * Envia o treino ao aluno pelo WhatsApp (mensagem pronta + link público para registrar a execução).
 * A aba do WhatsApp é aberta ANTES de esperar a rede — senão o navegador do celular bloqueia o pop-up — por isso
 * o treino pode vir como função assíncrona (ex.: criar o treino a partir de um treino planejado primeiro).
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

  const executar = async (treino: Treino, escolhida: ValidadeLink) => {
    const janela = window.open('about:blank', '_blank')
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
      const url = linkWhatsAppComTexto(aluno?.phone, mensagem)
      if (janela && !janela.closed) janela.location.href = url
      else window.location.assign(url)
      mostrarInfoGlobal(avisoValidade(escolhida, gerado.expiraEm))
    } catch (e) {
      janela?.close()
      mostrarErroGlobal((e as Error).message)
    }
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
    // o clique do botão ainda é o gesto do usuário: window.open dentro de executar() não é bloqueado
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

  return { enviar, seletor }
}
