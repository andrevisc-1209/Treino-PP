/**
 * Erro cuja mensagem JÁ está em português e foi escrita para o usuário (ex.: a que uma Edge Function devolve em `{ error }`).
 * `mapearErroSupabase` mostra o texto como está, em vez de trocar por "Algo deu errado".
 */
export class ErroAmigavel extends Error {
  readonly amigavel = true
}

/** Extrai a mensagem `{ error }` que uma Edge Function devolve em status não-2xx (FunctionsHttpError); `padrao` se não houver. */
export async function mensagemDaFuncao(error: unknown, padrao: string): Promise<string> {
  const contexto = (error as { context?: Response } | null)?.context
  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json()
      if (typeof corpo?.error === 'string' && corpo.error.trim()) return corpo.error
    } catch {
      // corpo ausente ou não-JSON: cai no texto padrão
    }
  }
  return padrao
}
