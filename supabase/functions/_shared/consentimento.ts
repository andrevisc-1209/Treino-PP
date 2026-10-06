// Lógica pura do consentimento de saúde por e-mail (sem APIs do Deno) —
// compartilhada entre enviar-consentimento-saude e confirmar-consentimento-saude
// e testável com vitest.

export const EXPIRA_DIAS = 7
export const INTERVALO_REENVIO_SEG = 60
// Mantenha igual a TERMO_VERSAO em src/features/alunos/termo.ts.
export const TERMO_VERSAO = '1.1'

export function emailValido(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

export function expiraEm(agora: Date = new Date()): string {
  return new Date(agora.getTime() + EXPIRA_DIAS * 86_400_000).toISOString()
}

/** Reenvio só depois de um intervalo curto (evita virar disparador de spam para o e-mail do aluno). */
export function podeEnviarAgora(enviadoAt: string | null | undefined, agora: Date = new Date()): boolean {
  if (!enviadoAt) return true
  const t = new Date(enviadoAt).getTime()
  return Number.isNaN(t) || agora.getTime() - t >= INTERVALO_REENVIO_SEG * 1000
}

export type EstadoToken = 'valido' | 'invalido' | 'expirado' | 'usado' | 'cancelado'

/**
 * Situação de um token. `statusAluno` precisa ser 'pendente' para ainda valer: se o personal
 * revogou/cancelou depois do envio (status voltou a NULL) o link antigo não funciona mais.
 */
export function estadoDoToken(
  token: { used_at: string | null; expires_at: string } | null,
  statusAluno: string | null | undefined,
  agora: Date = new Date(),
): EstadoToken {
  if (!token) return 'invalido'
  if (token.used_at) return 'usado'
  if (new Date(token.expires_at).getTime() < agora.getTime()) return 'expirado'
  if (statusAluno !== 'pendente') return 'cancelado'
  return 'valido'
}

export function escaparHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function montarEmailConsentimento(args: { nomeAluno: string; nomePersonal: string; linkAutorizar: string; linkNegar: string }) {
  const aluno = escaparHtml(args.nomeAluno)
  const personal = escaparHtml(args.nomePersonal)
  const assunto = `Autorização para registro de dados de saúde — ${args.nomePersonal}`
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escaparHtml(assunto)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f7f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f6;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="background-color:#0f2537;padding:32px 24px;"><img src="https://treino.personalperto.com.br/brand/logo-email.png" alt="Treino · Personal Perto" width="180" style="display:block;width:180px;max-width:100%;height:auto;" /></td></tr>
<tr><td style="padding:32px 32px 8px;">
<h1 style="margin:0 0 16px;font-size:22px;color:#0f2537;">Olá, ${aluno}!</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#334155;">O(a) personal <strong>${personal}</strong> está pedindo a sua autorização para registrar, no app Treino, informações de saúde que ajudam a planejar o seu treino com segurança: <strong>lesões, cirurgias e uso de medicamentos</strong>.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#334155;">São dados sensíveis, protegidos pela LGPD (Lei 13.709/2018, art. 11). Eles só são usados para acompanhar o seu treino, não são vendidos nem compartilhados com terceiros, e você pode pedir acesso, correção, exclusão ou revogar esta autorização a qualquer momento, falando com o seu personal.</p>
</td></tr>
<tr><td align="center" style="padding:8px 32px 8px;"><a href="${args.linkAutorizar}" style="display:inline-block;background-color:#367c39;color:#ffffff;font-size:17px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:10px;">Autorizar</a></td></tr>
<tr><td align="center" style="padding:8px 32px 24px;"><a href="${args.linkNegar}" style="font-size:14px;color:#475569;text-decoration:underline;">Não autorizar</a></td></tr>
<tr><td style="padding:0 32px 32px;"><p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">O link vale por ${EXPIRA_DIAS} dias. Se você não reconhece este cadastro, ignore este e-mail — nada será registrado sem a sua autorização.</p></td></tr>
</table></td></tr></table></body></html>`
  const texto = `Olá, ${args.nomeAluno}!\n\nO(a) personal ${args.nomePersonal} pede sua autorização para registrar no app Treino lesões, cirurgias e uso de medicamentos (dados de saúde, LGPD art. 11).\n\nAutorizar: ${args.linkAutorizar}\nNão autorizar: ${args.linkNegar}\n\nO link vale por ${EXPIRA_DIAS} dias. Se você não reconhece este cadastro, ignore este e-mail.`
  return { assunto, html, texto }
}
