// Cria uma conta de teste descartável (signup direto via Supabase, sem UI) e
// semeia um aluno + treino + sessão em andamento com um exercício, prontos
// pro teste E2E da fila offline interagir só com o que importa: marcar
// séries offline no navegador de verdade. Precisa de VITE_ALLOW_SIGNUP=true
// (confirmação de e-mail desligada) no projeto Supabase de teste.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Parser mínimo de .env — evita depender do pacote dotenv só por isto. */
function lerEnv(caminho) {
  const env = {}
  let texto
  try {
    texto = readFileSync(caminho, 'utf8')
  } catch {
    return env
  }
  for (const linha of texto.split('\n')) {
    const m = linha.match(/^\s*([\w.]+)\s*=\s*(.*)?\s*$/)
    if (!m) continue
    let valor = (m[2] ?? '').trim()
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) valor = valor.slice(1, -1)
    env[m[1]] = valor
  }
  return env
}

const env = lerEnv(path.resolve(__dirname, '..', '.env'))
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) throw new Error('Faltam VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY no .env')

export async function seedContaDeTeste() {
  const supabase = createClient(url, anonKey, { db: { schema: 'treino' } })

  const sufixo = Date.now()
  const email = `e2e-fila-offline-${sufixo}@example.com`
  const password = 'Teste12345!'

  const { data: signUp, error: errSignUp } = await supabase.auth.signUp({ email, password })
  if (errSignUp) throw errSignUp
  if (!signUp.session) {
    throw new Error(
      'Signup não retornou sessão — o projeto Supabase de teste provavelmente exige confirmação de e-mail. ' +
        'Desative "Confirm email" em Authentication > Providers > Email pra rodar este teste, ou pule-o.',
    )
  }

  const professionalId = signUp.user.id

  const { data: exercicio, error: errEx } = await supabase
    .from('exercicios')
    .insert({ professional_id: professionalId, name: 'E2E Supino', muscle_group: 'Peito' })
    .select('id')
    .single()
  if (errEx) throw errEx

  const { data: aluno, error: errAluno } = await supabase
    .from('alunos')
    .insert({ professional_id: professionalId, name: 'E2E Aluno Offline' })
    .select('id')
    .single()
  if (errAluno) throw errAluno

  const { data: plano, error: errPlano } = await supabase
    .from('planos')
    .insert({ aluno_id: aluno.id, professional_id: professionalId, name: 'E2E Treino', active: true })
    .select('id')
    .single()
  if (errPlano) throw errPlano

  const { data: planoEx, error: errPlanoEx } = await supabase
    .from('plano_exercicios')
    .insert({ plano_id: plano.id, exercicio_id: exercicio.id, sets: 2, reps: '10', rest_seconds: 5, order_index: 0 })
    .select('id')
    .single()
  if (errPlanoEx) throw errPlanoEx

  const { data: sessao, error: errSessao } = await supabase
    .from('sessoes')
    .insert({ aluno_id: aluno.id, professional_id: professionalId, plano_id: plano.id, status: 'em_andamento' })
    .select('id')
    .single()
  if (errSessao) throw errSessao

  const { data: sessaoEx, error: errSessaoEx } = await supabase
    .from('sessao_exercicios')
    .insert({ sessao_id: sessao.id, exercicio_id: exercicio.id, plano_exercicio_id: planoEx.id, order_index: 0 })
    .select('id')
    .single()
  if (errSessaoEx) throw errSessaoEx

  const { error: errSeries } = await supabase.from('sessao_series').insert([
    { sessao_exercicio_id: sessaoEx.id, set_number: 1, reps: 10, load_kg: null, completed: false },
    { sessao_exercicio_id: sessaoEx.id, set_number: 2, reps: 10, load_kg: null, completed: false },
  ])
  if (errSeries) throw errSeries

  return {
    email,
    password,
    professionalId,
    alunoId: aluno.id,
    sessaoId: sessao.id,
    sessaoExercicioId: sessaoEx.id,
  }
}

// Permite rodar `node e2e/seed.mjs` direto pra testar o seed isoladamente.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dados = await seedContaDeTeste()
  console.log(JSON.stringify(dados, null, 2))
  writeFileSync(path.resolve(__dirname, '.seed.json'), JSON.stringify(dados, null, 2))
}
