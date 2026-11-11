/** Registro de uma aula que já passou com um toque ("Dei a aula" / "Faltou"), sem abrir a folha de ações. Helpers puros. */

type ParticipanteMinimo = { id: string; aluno_id: string; status: string; aluno?: { name?: string | null } | null }
type AulaMinima = { aula_participantes: ParticipanteMinimo[] }

/**
 * Um toque só vale para aula com UM aluno ainda previsto: sem escolher quem, sem dividir valor em grupo. Aula em grupo, ou com participante
 * que já foi registrado, abre a folha de ações (onde dá para escolher, dividir o valor, remarcar ou cancelar).
 */
export function registroComUmToque(aula: AulaMinima): ParticipanteMinimo | null {
  const previstos = aula.aula_participantes.filter((p) => p.status === 'previsto')
  return aula.aula_participantes.length === 1 && previstos.length === 1 ? previstos[0] : null
}

const primeiroNome = (nome: string | null | undefined): string => (nome ?? '').trim().split(/\s+/)[0] || 'Aluno'

export const mensagemDeAulaRegistrada = (nome: string | null | undefined): string => `Aula de ${primeiroNome(nome)} registrada.`

export const mensagemDeFaltaRegistrada = (nome: string | null | undefined, cobrada: boolean): string =>
  `Falta de ${primeiroNome(nome)} registrada${cobrada ? ' e cobrada' : ', sem cobrança'}.`
