import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, type Plugin } from 'vitest/config'
import { APP_NAME, APP_SHORT_NAME } from './src/config/app.ts'

/** Troca %APP_NAME%/%APP_SHORT_NAME% no index.html pelos valores de src/config/app.ts — um só lugar de verdade. */
function htmlAppNamePlugin(): Plugin {
  return {
    name: 'html-app-name',
    transformIndexHtml(html) {
      return html.replace(/%APP_NAME%/g, APP_NAME).replace(/%APP_SHORT_NAME%/g, APP_SHORT_NAME)
    },
  }
}

/**
 * CSP e referrer via <meta> (GitHub Pages não permite headers). Só no BUILD: o dev server do Vite
 * injeta scripts inline/HMR por websocket e quebraria com uma CSP restrita. Sem 'unsafe-eval'.
 * frame-ancestors e X-Content-Type-Options NÃO funcionam via <meta> (ignorados pelos browsers) — ficam de fora.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co https://viacep.com.br https://maps.googleapis.com https://challenges.cloudflare.com",
  'frame-src https://challenges.cloudflare.com',
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

function htmlCspPlugin(): Plugin {
  return {
    name: 'html-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
        ),
    },
  }
}

export default defineConfig(({ command }) => ({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    htmlAppNamePlugin(),
    htmlCspPlugin(),
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
}))
