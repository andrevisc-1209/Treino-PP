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

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    htmlAppNamePlugin(),
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
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    // e2e/ são specs do Playwright (test:e2e), não do Vitest.
    exclude: ['node_modules/**', 'e2e/**'],
  },
})
