import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import { useAluno } from '@/features/alunos/api'
import { mostrarErroGlobal } from '@/components/Toast'
import { gerarMensagemTreino } from '@/lib/mensagemTreino'
import { linkWhatsAppComTexto } from '@/lib/whatsapp'
import type { ModalidadeDetalhes, ModalidadeTipo } from '@/types/modalidades'
import { buscarExerciciosParaMensagem, gerarLinkTreino } from './api'

export type TreinoParaEnvio = { id: string; name: string; modalidade: ModalidadeTipo; detalhes: ModalidadeDetalhes }

/**
 * Envia o treino ao aluno pelo WhatsApp (mensagem pronta + link público para registrar a execução).
 * A aba do WhatsApp é aberta ANTES de esperar a rede — senão o navegador do celular bloqueia o pop-up — por isso
 * o treino pode vir como função assíncrona (ex.: criar o treino a partir de um treino planejado primeiro).
 */
export function useEnviarTreinoAoAluno(alunoId: string) {
  const { session } = useAuth()
  const { data: aluno } = useAluno(alunoId)
  const { data: perfil } = usePerfilProfissional(session?.user.id)

  return async (treino: TreinoParaEnvio | (() => Promise<TreinoParaEnvio>)) => {
    const janela = window.open('about:blank', '_blank')
    try {
      const t = typeof treino === 'function' ? await treino() : treino
      const [exercicios, link] = await Promise.all([
        t.modalidade === 'musculacao' ? buscarExerciciosParaMensagem(t.id) : Promise.resolve(undefined),
        gerarLinkTreino(t.id),
      ])
      const mensagem = gerarMensagemTreino({
        nomeAluno: aluno?.name ?? 'aluno',
        nomePersonal: perfil?.name || 'Seu personal',
        nomeTreino: t.name,
        modalidade: t.modalidade,
        detalhes: t.detalhes,
        exercicios,
        link,
      })
      const url = linkWhatsAppComTexto(aluno?.phone, mensagem)
      if (janela && !janela.closed) janela.location.href = url
      else window.location.assign(url)
    } catch (e) {
      janela?.close()
      mostrarErroGlobal((e as Error).message)
    }
  }
}
