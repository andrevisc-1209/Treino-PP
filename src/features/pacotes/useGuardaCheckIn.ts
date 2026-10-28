import { useNavigate } from 'react-router-dom'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { buscarPacotesAtivos } from './api'
import { pacoteEsgotado } from './pacote'

/**
 * Antes de marcar presença na agenda: se algum desses alunos está com o pacote no total, pergunta se quer renovar (e não marca).
 * Devolve true quando pode seguir. Em erro de rede deixa seguir.
 */
export function useGuardaCheckIn() {
  const navigate = useNavigate()
  return async (alunos: { id: string; name: string }[]): Promise<boolean> => {
    let pacotes
    try {
      pacotes = await buscarPacotesAtivos()
    } catch {
      return true
    }
    const travado = alunos.find((a) => {
      const p = pacotes.get(a.id)
      return p && pacoteEsgotado(p.pacote, p.presencas)
    })
    if (!travado) return true
    const renovar = await confirmarAcao({
      titulo: 'Pacote acabou',
      mensagem: `${travado.name} usou todas as aulas do pacote. Renove o pacote para registrar esta aula.`,
      textoConfirmar: 'Renovar pacote',
      textoCancelar: 'Voltar',
    })
    if (renovar) navigate(`/alunos/${travado.id}?renovar=1`)
    return false
  }
}
