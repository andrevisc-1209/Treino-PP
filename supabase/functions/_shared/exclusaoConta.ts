// Regras puras da exclusão de conta (sem I/O, testáveis no vitest). O index.ts da função excluir-conta só orquestra.
// O e-mail NUNCA leva dado de aluno nem de saúde: só o protocolo, a data e o que acontece.

export const PALAVRA_CONFIRMACAO = 'EXCLUIR'

/** Mesma regra do banco: "EXCLUIR" sem diferença de caixa ou espaço nas pontas. */
export const confirmacaoValida = (v: unknown): boolean => typeof v === 'string' && v.trim().toUpperCase() === PALAVRA_CONFIRMACAO

export type SolicitacaoExclusao = { protocolo: string; solicitada_em: string; prevista_em: string; ja_existia: boolean }

export function lerSolicitacao(bruto: unknown): SolicitacaoExclusao | null {
  if (!bruto || typeof bruto !== 'object') return null
  const b = bruto as Record<string, unknown>
  if (typeof b.protocolo !== 'string' || !/^EXC-\d{4}-[A-HJ-NP-Z2-9]{8}$/.test(b.protocolo)) return null
  if (typeof b.solicitada_em !== 'string' || typeof b.prevista_em !== 'string') return null
  return { protocolo: b.protocolo, solicitada_em: b.solicitada_em, prevista_em: b.prevista_em, ja_existia: b.ja_existia === true }
}

/** dd/mm/aaaa no fuso de São Paulo. */
export function dataBR(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function montarEmailExclusao(args: { protocolo: string; prevista_em: string; appUrl: string }) {
  const prevista = dataBR(args.prevista_em)
  const protocolo = esc(args.protocolo)
  const assunto = `Pedido de exclusão da conta registrado (protocolo ${args.protocolo})`
  const texto = [
    'Recebemos o seu pedido de exclusão da conta do Treino PP.',
    '',
    `Protocolo: ${args.protocolo}`,
    `Exclusão definitiva prevista para: ${prevista}`,
    '',
    'O que acontece agora:',
    '• Seu acesso foi bloqueado e os avisos automáticos foram desligados.',
    `• Até ${prevista} você pode mudar de ideia: entre no app e toque em "Cancelar exclusão".`,
    '• Depois dessa data, apagamos seus dados pessoais, seus alunos, treinos, fichas, avaliações e agenda. Não dá para desfazer.',
    '• Ficam guardados por 5 anos, por obrigação legal (Código Tributário Nacional), só os registros dos pagamentos do seu plano (valor, data e plano), sem nome, CPF ou e-mail.',
    '',
    `Se você NÃO pediu isso, entre agora em ${args.appUrl} e cancele a exclusão; depois troque a sua senha.`,
    'Dúvidas: contato@personalperto.com.br (cite o protocolo).',
  ].join('\n')
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="color-scheme" content="light only" /><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f7f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f6;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="background-color:#ffffff;padding:28px 24px 20px;border-bottom:3px solid #367c39;"><img src="${esc(args.appUrl)}/brand/logo-email-branco.png" alt="Personal Perto" width="240" style="display:block;width:240px;max-width:100%;height:auto;" /></td></tr>
<tr><td style="padding:32px 32px 8px;">
<h1 style="margin:0 0 16px;font-size:22px;color:#0f2537;">Pedido de exclusão registrado</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#334155;">Recebemos o seu pedido de exclusão da conta do Treino PP.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#0f2537;"><strong>Protocolo:</strong> ${protocolo}<br /><strong>Exclusão definitiva prevista para:</strong> ${prevista}</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#334155;"><strong>O que acontece agora</strong></p>
<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;color:#334155;">
<li>Seu acesso foi bloqueado e os avisos automáticos foram desligados.</li>
<li>Até ${prevista} você pode mudar de ideia: entre no app e toque em <strong>Cancelar exclusão</strong>.</li>
<li>Depois dessa data, apagamos seus dados pessoais, seus alunos, treinos, fichas, avaliações e agenda. Não dá para desfazer.</li>
<li>Ficam guardados por 5 anos, por obrigação legal (Código Tributário Nacional), só os registros dos pagamentos do seu plano (valor, data e plano), sem nome, CPF ou e-mail.</li>
</ul>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#334155;">Se você <strong>não</strong> pediu isso, <a href="${esc(args.appUrl)}" style="color:#2a602c;">entre agora no app</a>, cancele a exclusão e troque a sua senha.</p>
</td></tr>
<tr><td align="center" style="padding:20px 24px;background-color:#f4f7f6;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">Dúvidas: contato@personalperto.com.br (cite o protocolo).</td></tr>
</table></td></tr></table></body></html>`
  return { assunto, html, texto }
}
