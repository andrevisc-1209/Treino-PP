import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { confirmarAcao } from './ConfirmSheet'

/**
 * Botão "✕ Sair" usado no lugar da seta de voltar durante os fluxos em modo
 * foco (cadastro de aluno, pré-treino, execução, pós-treino) — confirma
 * antes de sair, já que voltar aqui normalmente significaria abandonar o
 * que está em andamento.
 */
export function BotaoSairModoFoco({
  to,
  mensagem = 'O que já foi salvo fica guardado.',
}: {
  to: string
  mensagem?: string
}) {
  const navigate = useNavigate()

  const sair = async () => {
    const ok = await confirmarAcao({ titulo: 'Sair', mensagem, textoConfirmar: 'Sair' })
    if (ok) navigate(to)
  }

  return (
    <button onClick={sair} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Sair">
      <X size={20} />
    </button>
  )
}
