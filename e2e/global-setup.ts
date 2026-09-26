import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedContaDeTeste } from './seed.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Roda uma vez antes da suíte: cria a conta + dados de teste e grava pra o spec ler. */
export default async function globalSetup() {
  const dados = await seedContaDeTeste()
  writeFileSync(path.resolve(__dirname, '.seed.json'), JSON.stringify(dados))
}
