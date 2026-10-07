import { linkWhatsApp } from './whatsapp'

/** Texto do WhatsApp de consentimento. Só pede a autorização: nenhum dado de saúde do aluno vai na mensagem (LGPD). */
export function montarMensagemConsentimento(args: { nomeAluno: string; nomePersonal: string; link: string }): string {
  return (
    `Olá, ${args.nomeAluno}! ${args.nomePersonal} quer te pedir autorização para acessar seus dados de saúde no app Treino PP. ` +
    `É rapidinho — acessa o link aqui embaixo e escolhe se topa ou não 👇\n\n${args.link}\n\nO link expira em 7 dias.`
  )
}

/** Link do WhatsApp já com a mensagem; se o telefone do aluno for válido abre a conversa dele, senão deixa escolher o contato. */
export function linkWhatsappConsentimento(telefone: string | null | undefined, mensagem: string): string {
  const base = linkWhatsApp(telefone) ?? 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(mensagem)}`
}
