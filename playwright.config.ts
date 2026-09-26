import { defineConfig, devices } from '@playwright/test'

// Só a fila offline (item 5 da Onda 1B) tem cobertura E2E — o resto da onda
// foi validado ao vivo no browser, como na 1A. Só Chromium: é o suficiente
// pra testar context.setOffline()/reload/reconexão, que é o que importa aqui.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173/Treino-PP/',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/Treino-PP/login',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
