// Fila local (localStorage) de séries marcadas sem conexão. O upsert do
// Supabase já é idempotente (onConflict sessao_exercicio_id+set_number), então
// reenviar o mesmo item várias vezes é seguro — não duplica nem perde nada.

export type ItemFila = {
  id: string
  sessao_exercicio_id: string
  set_number: number
  reps: number | null
  load_kg: number | null
  completed: boolean
  criadoEm: number
  /** O servidor recusou esta série (erro permanente, não é falta de sinal): sai do reenvio automático e espera a decisão do personal. */
  recusadoMotivo?: string
}

const PREFIXO = 'treino-fila-offline:'

function chave(sessaoId: string): string {
  return `${PREFIXO}${sessaoId}`
}

function idDoItem(item: { sessao_exercicio_id: string; set_number: number }): string {
  return `${item.sessao_exercicio_id}:${item.set_number}`
}

export function lerFila(sessaoId: string): ItemFila[] {
  try {
    const raw = localStorage.getItem(chave(sessaoId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function gravarFila(sessaoId: string, itens: ItemFila[]) {
  try {
    localStorage.setItem(chave(sessaoId), JSON.stringify(itens))
  } catch {
    // localStorage indisponível (modo privado, cota cheia) — a fila fica só
    // em memória nesta aba; melhor que travar o app.
  }
}

/** Adiciona (ou substitui, se já houver uma pendente pra mesma série) um item à fila. */
export function enfileirar(sessaoId: string, item: Omit<ItemFila, 'id' | 'criadoEm'>): ItemFila[] {
  const id = idDoItem(item)
  const atual = lerFila(sessaoId).filter((i) => i.id !== id)
  const nova = [...atual, { ...item, id, criadoEm: Date.now() }]
  gravarFila(sessaoId, nova)
  return nova
}

export function removerDaFila(sessaoId: string, id: string): ItemFila[] {
  const nova = lerFila(sessaoId).filter((i) => i.id !== id)
  gravarFila(sessaoId, nova)
  return nova
}

/** Marca o item como recusado pelo servidor (guarda o motivo já em português); ele continua guardado, só deixa de ser reenviado sozinho. */
export function marcarRecusado(sessaoId: string, id: string, motivo: string): ItemFila[] {
  const nova = lerFila(sessaoId).map((i) => (i.id === id ? { ...i, recusadoMotivo: motivo } : i))
  gravarFila(sessaoId, nova)
  return nova
}

/** Tira a marca de recusado de todos os itens (o personal pediu para tentar de novo). */
export function liberarRecusados(sessaoId: string): ItemFila[] {
  const nova = lerFila(sessaoId).map(({ recusadoMotivo: _motivo, ...resto }) => resto)
  gravarFila(sessaoId, nova)
  return nova
}

export const aguardandoEnvio = (fila: ItemFila[]): ItemFila[] => fila.filter((i) => !i.recusadoMotivo)
export const recusadas = (fila: ItemFila[]): ItemFila[] => fila.filter((i) => !!i.recusadoMotivo)

/**
 * 'rede' = vale tentar de novo (sem sinal, timeout, servidor fora, limite de requisições): a série fica na fila e é reenviada sozinha.
 * 'recusado' = o servidor respondeu e disse não (permissão/assinatura vencida, valor inválido, sessão expirada...): repetir não adianta.
 */
export function classificarErroSerie(erro: unknown): 'rede' | 'recusado' {
  const e = (typeof erro === 'object' && erro !== null ? erro : {}) as { message?: unknown; code?: unknown; status?: unknown }
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed') || msg.includes('timeout') || msg.includes('timed out')) return 'rede'
  const status = typeof e.status === 'number' ? e.status : null
  if (status !== null && (status >= 500 || status === 408 || status === 429)) return 'rede'
  // erro do Postgres/PostgREST (42501, 23514, 22001, PGRST301...) ou HTTP 4xx: o servidor entendeu e recusou
  if (typeof e.code === 'string' && e.code.length > 0) return 'recusado'
  if (status !== null && status >= 400) return 'recusado'
  // sem código nem status: não deu para falar com o servidor
  return 'rede'
}

export function limparFila(sessaoId: string) {
  gravarFila(sessaoId, [])
}
