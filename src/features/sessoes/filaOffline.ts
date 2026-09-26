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

export function limparFila(sessaoId: string) {
  gravarFila(sessaoId, [])
}
