import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { loadEnv } from 'vite'
import { defineConfig, type Plugin } from 'vitest/config'
import { APP_NAME, APP_SHORT_NAME } from './src/config/app.ts'
import { montarCsp } from './src/config/csp.ts'

/** Troca %APP_NAME%/%APP_SHORT_NAME% no index.html pelos valores de src/config/app.ts — um só lugar de verdade. */
function htmlAppNamePlugin(): Plugin {
  return {
    name: 'html-app-name',
    transformIndexHtml(html) {
      return html.replace(/%APP_NAME%/g, APP_NAME).replace(/%APP_SHORT_NAME%/g, APP_SHORT_NAME)
    },
  }
}

/** CSP e referrer via <meta>, só no build. A política em si fica em src/config/csp.ts (testada). */
function htmlCspPlugin(csp: string): Plugin {
  return {
    name: 'html-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
        ),
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const supabaseUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL
  if (command === 'build' && !supabaseUrl) console.warn('[csp] VITE_SUPABASE_URL ausente no build: connect-src ficou com o curinga *.supabase.co')
  return {
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    htmlAppNamePlugin(),
    htmlCspPlugin(montarCsp(supabaseUrl)),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: 'Assistente do personal trainer para gerenciar alunos e treinos.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#367c39',
        background_color: '#f8fafc',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // /landing.html é página estática à parte, não uma rota do React — sem isso o
        // service worker devolveria o index.html do app no lugar dela (e entraria em loop).
        navigateFallbackDenylist: [/^\/landing\.html$/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  // Produção: sem console.* e debugger no bundle (só no build; dev não é afetado). Vite 8 usa Rolldown/Oxc, não esbuild.
  build: {
    rolldownOptions: command === 'build' ? { output: { minify: { compress: { dropConsole: true, dropDebugger: true } } } } : {},
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    // e2e/ são specs do Playwright (test:e2e), não do Vitest.
    exclude: ['node_modules/**', 'e2e/**'],
  },
}
})
