/**
 * Busca TODAS as linhas de uma consulta do Supabase, página por página. O servidor corta cada resposta em 1000 linhas sem avisar, então uma
 * lista que passa disso chegava truncada (faltando justamente as linhas mais antigas). `pagina(de, ate)` precisa de uma ORDEM ESTÁVEL
 * (inclua o id no order) para as páginas não repetirem nem pularem linhas.
 */
export async function buscarTodasAsPaginas<T>(
  pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  tamanho = 1000,
  maxPaginas = 100,
): Promise<T[]> {
  const todas: T[] = []
  for (let i = 0; i < maxPaginas; i++) {
    const de = i * tamanho
    const { data, error } = await pagina(de, de + tamanho - 1)
    if (error) throw error
    const linhas = data ?? []
    todas.push(...linhas)
    if (linhas.length < tamanho) break
  }
  return todas
}
