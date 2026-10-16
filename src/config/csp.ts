/**
 * Content-Security-Policy do app (injetada como <meta> só no build — GitHub Pages não permite headers).
 * Pura e sem dependências: o vite.config.ts importa e o teste confere as diretivas.
 *
 * - script-src SEM 'unsafe-inline' e SEM 'unsafe-eval': o build só emite <script type="module" src=…> (conferido em dist/index.html).
 * - connect-src fixa o host EXATO do projeto Supabase (VITE_SUPABASE_URL): o curinga *.supabase.co deixaria um script
 *   injetado enviar dados para um projeto Supabase do invasor. Sem a variável, cai no curinga (e avisa no build).
 * - img-src sem "https:" genérico; só o que o Google Places/Maps usa (lista do guia de CSP do Google).
 * - style-src mantém 'unsafe-inline': o app usa `style=` (React e splash) e o Maps injeta estilos.
 * frame-ancestors e X-Content-Type-Options não funcionam via <meta> e ficam de fora.
 */
export function montarCsp(supabaseUrl?: string): string {
  let supabase = ['https://*.supabase.co', 'wss://*.supabase.co']
  if (supabaseUrl) {
    try {
      const host = new URL(supabaseUrl).host
      supabase = [`https://${host}`, `wss://${host}`]
    } catch {
      // URL inválida: mantém o curinga
    }
  }
  const google = ['https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com']
  return [
    "default-src 'self'",
    `script-src 'self' https://challenges.cloudflare.com ${google.join(' ')} blob:`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${google.join(' ')} https://*.googleusercontent.com https://*.ggpht.com`,
    `connect-src 'self' data: blob: ${supabase.join(' ')} https://viacep.com.br https://challenges.cloudflare.com ${google.join(' ')}`,
    'frame-src https://challenges.cloudflare.com',
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')
}
