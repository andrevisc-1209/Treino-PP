// Lógica pura do consentimento de saúde por e-mail (sem APIs do Deno) —
// compartilhada entre enviar-consentimento-saude e confirmar-consentimento-saude
// e testável com vitest.

export const EXPIRA_DIAS = 7
export const INTERVALO_REENVIO_SEG = 60
// Mantenha igual a TERMO_VERSAO em src/features/alunos/termo.ts.
export const TERMO_VERSAO = '1.1'

export const MOTIVOS_REENVIO = [
  'Aluno decidiu liberar acesso',
  "Aluno clicou em 'Não autorizar' por engano",
  'Aluno não recebeu o e-mail',
  'Aluno trocou de e-mail/WhatsApp',
  'Outros',
] as const

export type Canal = 'email' | 'whatsapp'

export function canalValido(v: unknown): v is Canal {
  return v === 'email' || v === 'whatsapp'
}

/** Todo reenvio (status pendente ou negado) precisa de motivo; "Outros" exige texto livre. */
export function validarMotivoReenvio(
  motivo: unknown,
  livre: unknown,
): { ok: true; motivo: string; livre: string | null } | { ok: false; erro: string } {
  if (typeof motivo !== 'string' || !(MOTIVOS_REENVIO as readonly string[]).includes(motivo)) {
    return { ok: false, erro: 'Informe o motivo do reenvio.' }
  }
  if (motivo !== 'Outros') return { ok: true, motivo, livre: null }
  const texto = typeof livre === 'string' ? livre.trim() : ''
  if (texto.length < 3) return { ok: false, erro: 'Descreva o motivo do reenvio.' }
  return { ok: true, motivo, livre: texto.slice(0, 300) }
}

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
<tr><td align="center" style="background-color:#0f2537;padding:28px 24px;"><div style="background:#ffffff;padding:12px;border-radius:6px;display:inline-block;"><img src="https://treino.personalperto.com.br/brand/logo-email.png" alt="Treino PP" style="display:block;height:48px;width:auto;" /></div></td></tr>
<tr><td style="padding:32px 32px 8px;">
<h1 style="margin:0 0 16px;font-size:22px;color:#0f2537;">Olá, ${aluno}! 👋</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#334155;">Seu personal trainer <strong>${personal}</strong> quer cuidar do seu treino com mais atenção e organização — e, para isso, precisa da sua autorização para registrar no app informações sobre a sua saúde. É rápido: clica no botão abaixo e escolhe se topa ou não.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#334155;">Falamos de <strong>lesões, cirurgias e uso de medicamentos</strong>. São dados sensíveis, protegidos pela LGPD (Lei 13.709/2018), então só entram no app com o seu OK. Servem apenas para ajustar o treino com segurança, não são vendidos nem compartilhados, e você pode pedir acesso, correção ou exclusão, ou mudar de ideia quando quiser, falando com o seu personal.</p>
</td></tr>
<tr><td align="center" style="padding:8px 32px 8px;"><a href="${args.linkAutorizar}" style="display:inline-block;background-color:#367c39;color:#ffffff;font-size:17px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:10px;">Autorizar</a></td></tr>
<tr><td align="center" style="padding:8px 32px 24px;"><a href="${args.linkNegar}" style="font-size:14px;color:#475569;text-decoration:underline;">Prefiro não autorizar</a></td></tr>
<tr><td style="padding:0 32px 32px;"><p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">O link vale por ${EXPIRA_DIAS} dias. Não reconhece este cadastro? Pode ignorar este e-mail — nada é registrado sem a sua autorização.</p></td></tr>
</table></td></tr></table></body></html>`
  const texto = `Olá, ${args.nomeAluno}!\n\nSeu personal trainer ${args.nomePersonal} quer cuidar do seu treino com mais atenção e organização e precisa da sua autorização para registrar no app informações sobre a sua saúde (lesões, cirurgias e uso de medicamentos — dados sensíveis, protegidos pela LGPD). É rápido: abre o link e escolhe se topa ou não.\n\nAutorizar: ${args.linkAutorizar}\nPrefiro não autorizar: ${args.linkNegar}\n\nO link vale por ${EXPIRA_DIAS} dias. Não reconhece este cadastro? Pode ignorar este e-mail.`
  return { assunto, html, texto }
}
