// Lembretes de renovação do plano pago (o pagamento é avulso, sem renovação automática: quem esquece perde a gravação).
// Regras puras e textos; o envio fica em avisos-diarios. Nunca inclui dado de aluno nem de saúde: só nome, plano e data.

import { dataSP, diaSemanaCurto } from './notificacoes.ts'

/** Dias antes do fim do acesso em que o WhatsApp sai (o de 3 dias já existia; o de 1 dia foi pedido pelo dono). */
export const DIAS_WHATSAPP_RENOVACAO = [3, 1] as const
/** Dias em que o e-mail sai: 5 e 1 antes, e no dia do vencimento. */
export const DIAS_EMAIL_RENOVACAO = [5, 1, 0] as const

/** Fim real do acesso: o mês grátis de indicação (`bonus_ate`) vale depois da assinatura, então vale o que for mais tarde. */
export function fimEfetivoDoAcesso(assinaturaFim: string | null, bonusAte: string | null): string | null {
  const datas = [assinaturaFim, bonusAte].filter((d): d is string => !!d)
  if (datas.length === 0) return null
  return datas.reduce((a, b) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b))
}

/** Dias de calendário (São Paulo) de hoje até o dia do fim do acesso; 0 = termina hoje, negativo = já terminou. */
export function diasParaVencer(fimIso: string, hojeIso: string): number {
  const [a1, m1, d1] = hojeIso.split('-').map(Number)
  const [a2, m2, d2] = dataSP(fimIso).split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

export type LembreteDoDia = { whatsapp: 3 | 1 | null; email: 5 | 1 | 0 | null }

export function lembretesDoDia(dias: number): LembreteDoDia {
  return {
    whatsapp: (DIAS_WHATSAPP_RENOVACAO as readonly number[]).includes(dias) ? (dias as 3 | 1) : null,
    email: (DIAS_EMAIL_RENOVACAO as readonly number[]).includes(dias) ? (dias as 5 | 1 | 0) : null,
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const dataBR = (iso: string) => dataSP(iso).split('-').reverse().join('/')
/** Só o dia da semana, sem a data (diaSemanaCurto devolve "segunda, 02/nov"). */
const diaDaSemana = (iso: string) => diaSemanaCurto(dataSP(iso)).split(',')[0]
const primeiro = (nome: string | null) => (nome ?? '').trim().split(/\s+/)[0] ?? ''

const QUANDO: Record<5 | 1 | 0, string> = { 5: 'termina em 5 dias', 1: 'termina amanhã', 0: 'termina hoje' }

export function montarEmailRenovacao(args: { nome: string | null; plano: string | null; fimIso: string; dias: 5 | 1 | 0; appUrl: string }) {
  const nome = primeiro(args.nome)
  const quando = QUANDO[args.dias]
  const data = dataBR(args.fimIso)
  const assunto = `Seu acesso ao Treino PP ${quando}`
  const plano = args.plano ? ` (plano ${args.plano})` : ''
  const link = `${args.appUrl}/configuracoes?secao=assinatura`
  const texto = [
    `${nome ? `Olá, ${nome}.` : 'Olá.'}`,
    '',
    `Seu acesso ao Treino PP${plano} ${quando}: ${diaDaSemana(args.fimIso)}, ${data}.`,
    '',
    'O pagamento é avulso e não renova sozinho. Renove antes do fim para continuar registrando treinos, aulas e cobranças.',
    'Se o prazo passar, você continua vendo todos os seus dados, mas não consegue gravar novidades até renovar.',
    '',
    `Renovar agora: ${link}`,
    '',
    'Dúvidas: contato@personalperto.com.br',
    'Você recebe este aviso porque tem uma assinatura ativa no Treino PP.',
  ].join('\n')
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="color-scheme" content="light only" /><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f7f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f6;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="background-color:#ffffff;padding:28px 24px 20px;border-bottom:3px solid #367c39;"><img src="${esc(args.appUrl)}/brand/logo-email-branco.png" alt="Personal Perto" width="240" style="display:block;width:240px;max-width:100%;height:auto;" /></td></tr>
<tr><td style="padding:32px 32px 8px;">
<h1 style="margin:0 0 16px;font-size:22px;color:#0f2537;">Seu acesso ${esc(quando)}</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#334155;">${nome ? `Olá, ${esc(nome)}. ` : ''}Seu acesso ao Treino PP${esc(plano)} vai até <strong>${esc(diaDaSemana(args.fimIso))}, ${esc(data)}</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#334155;">O pagamento é avulso e <strong>não renova sozinho</strong>. Renove antes do fim para continuar registrando treinos, aulas e cobranças. Se o prazo passar, você continua vendo todos os seus dados, mas não consegue gravar novidades até renovar.</p>
<p style="margin:0 0 24px;text-align:center;"><a href="${esc(link)}" style="display:inline-block;background-color:#367c39;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:10px;">Renovar agora</a></p>
</td></tr>
<tr><td align="center" style="padding:20px 24px;background-color:#f4f7f6;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#64748b;">Você recebe este aviso porque tem uma assinatura ativa no Treino PP.<br />Dúvidas: contato@personalperto.com.br</td></tr>
</table></td></tr></table></body></html>`
  return { assunto, html, texto }
}
