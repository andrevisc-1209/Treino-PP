// Envio de WhatsApp pela Evolution API (sem APIs do Deno, para testar com vitest).
// Segredos (só em Supabase Secrets): EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE (nome da instância do Treino).
//
// REGRAS: mensagens nunca levam dado de saúde (lesão, cirurgia, medicamento, prontidão/bem-estar) — LGPD.
// Quem chama escolhe o texto; o NÚMERO sempre vem do cadastro no banco, nunca de um corpo de requisição de cliente.

export type ConfigEvolution = { url: string; apiKey: string; instance: string }

export function configEvolution(env: { get(nome: string): string | undefined }): ConfigEvolution | null {
  const url = env.get('EVOLUTION_API_URL')?.trim().replace(/\/+$/, '')
  const apiKey = env.get('EVOLUTION_API_KEY')?.trim()
  const instance = env.get('EVOLUTION_INSTANCE')?.trim()
  return url && apiKey && instance ? { url, apiKey, instance } : null
}

/** "(21) 99999-0000" → "5521999990000". null se não parecer um telefone brasileiro (10 ou 11 dígitos, com ou sem 55). */
export function numeroWhatsApp(telefone: string | null | undefined): string | null {
  const d = (telefone ?? '').replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) return `55${d}`
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  return null
}

const primeiroNome = (nome: string | null | undefined): string => (nome ?? '').trim().split(/\s+/)[0] || 'tudo bem'

/** Mensagem de teste das notificações (sem dado de aluno nem de saúde). */
export function mensagemDeTeste(nome: string | null | undefined): string {
  return (
    '✅ *Treino · Personal Perto*\n\n' +
    `Olá, *${primeiroNome(nome)}*! Este é um teste das notificações por WhatsApp. Se você recebeu esta mensagem, está tudo certo.\n\n` +
    'Para parar de receber, desligue em Configurações › Notificações.'
  )
}

/** POST {url}/message/sendText/{instance}. Lança Error('evolution:<status>') se a API recusar (sem repassar o corpo, que pode ter detalhes internos). */
export async function enviarTexto(cfg: ConfigEvolution, numero: string, texto: string, fetchFn: typeof fetch = fetch): Promise<void> {
  const resposta = await fetchFn(`${cfg.url}/message/sendText/${encodeURIComponent(cfg.instance)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.apiKey },
    body: JSON.stringify({ number: numero, text: texto }),
  })
  if (!resposta.ok) throw new Error(`evolution:${resposta.status}`)
}
