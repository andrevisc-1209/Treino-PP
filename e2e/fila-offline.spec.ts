import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

type Seed = {
  email: string
  password: string
  professionalId: string
  alunoId: string
  sessaoId: string
  sessaoExercicioId: string
}

function lerSeed(): Seed {
  return JSON.parse(readFileSync(path.resolve(__dirname, '.seed.json'), 'utf8'))
}

function lerEnvUrl(): { url: string; anonKey: string } {
  const texto = readFileSync(path.resolve(__dirname, '..', '.env'), 'utf8')
  const pega = (chave: string) => texto.match(new RegExp(`^${chave}=(.*)$`, 'm'))?.[1]?.trim() ?? ''
  return { url: pega('VITE_SUPABASE_URL'), anonKey: pega('VITE_SUPABASE_ANON_KEY') }
}

test.afterAll(async () => {
  // Limpa o aluno de teste (planos/sessões/séries somem em cascata). O
  // usuário de auth em si fica órfão — a chave anon não tem permissão pra
  // apagar usuários, só um service_role teria, e não vale a pena introduzir
  // essa chave só pra isso.
  const seed = lerSeed()
  const { url, anonKey } = lerEnvUrl()
  const supabase = createClient(url, anonKey, { db: { schema: 'treino' } })
  await supabase.auth.signInWithPassword({ email: seed.email, password: seed.password })
  await supabase.from('alunos').delete().eq('id', seed.alunoId)
})

test('série marcada offline não se perde nem duplica ao reconectar', async ({ page, context }) => {
  const seed = lerSeed()

  await page.goto('login')
  await page.getByLabel('E-mail').fill(seed.email)
  await page.getByLabel('Senha').fill(seed.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/Treino-PP\/?$/)

  await page.goto(`alunos/${seed.alunoId}/sessoes/${seed.sessaoId}`)
  await expect(page.getByText('E2E Supino')).toBeVisible()

  // --- offline: marca a série 1 ---
  await context.setOffline(true)

  await page.getByLabel('Repetições da série 1').fill('10')
  await page.getByLabel('Carga em kg da série 1').fill('20')
  await page.getByLabel('Salvar série 1').click()

  // vira "pendente" (ícone de relógio) em vez de ficar preso num erro
  await expect(page.getByLabel('Série 1 pendente de sincronizar')).toBeVisible()

  // a fila ficou salva no localStorage, não só em memória
  const filaOffline = await page.evaluate((sessaoId) => localStorage.getItem(`treino-fila-offline:${sessaoId}`), seed.sessaoId)
  expect(filaOffline).toContain(seed.sessaoExercicioId)
  expect(filaOffline).toContain('"reps":10')
  expect(filaOffline).toContain('"load_kg":20')

  // O servidor de dev não tem service worker (devOptions.enabled: false no
  // vite-plugin-pwa), então um reload de verdade com a rede fora do ar falha
  // no próprio navegador (sem HTML pra servir) — isso é uma limitação deste
  // ambiente de teste, não do app (num PWA instalado em produção o shell já
  // estaria em cache). O que dá pra testar aqui sem SW, e que já cobre a
  // garantia que importa — nada se perde nem duplica —, é: a fila fica em
  // localStorage (sobrevive a um reload de verdade, é só ler de novo depois),
  // e reconectar + recarregar ANTES da sincronização terminar não perde nem
  // duplica a série marcada.
  const filaAntesDeReconectar = await page.evaluate((sessaoId) => localStorage.getItem(`treino-fila-offline:${sessaoId}`), seed.sessaoId)
  expect(filaAntesDeReconectar).toContain(seed.sessaoExercicioId)

  // --- volta a ficar online e recarrega imediatamente, antes de qualquer sincronização ---
  await context.setOffline(false)
  await page.reload()
  await expect(page.getByText('Treino em andamento')).toBeVisible()

  // sincroniza sozinho ao montar (useFilaOffline tenta drenar a fila no mount)
  await expect(page.getByLabel('Salvar série 1')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel('Série 1 pendente de sincronizar')).toHaveCount(0)

  const filaFinal = await page.evaluate((sessaoId) => localStorage.getItem(`treino-fila-offline:${sessaoId}`), seed.sessaoId)
  expect(JSON.parse(filaFinal ?? '[]')).toHaveLength(0)

  // --- confirma direto no banco: sem perda nem duplicação ---
  const { url, anonKey } = lerEnvUrl()
  const supabase = createClient(url, anonKey, { db: { schema: 'treino' } })
  await supabase.auth.signInWithPassword({ email: seed.email, password: seed.password })

  const { data: series, error } = await supabase
    .from('sessao_series')
    .select('set_number, reps, load_kg, completed')
    .eq('sessao_exercicio_id', seed.sessaoExercicioId)
    .order('set_number')

  expect(error).toBeNull()
  expect(series).toHaveLength(2) // as 2 séries do seed — nenhuma duplicou

  const serie1 = series!.find((s) => s.set_number === 1)
  expect(serie1?.completed).toBe(true)
  expect(serie1?.reps).toBe(10)
  expect(Number(serie1?.load_kg)).toBe(20)

  const serie2 = series!.find((s) => s.set_number === 2)
  expect(serie2?.completed).toBe(false) // não mexemos nela — continua como o seed deixou
})
