// Script avulso — roda local, uma vez, pra criar a conta do admin do
// painel administrativo (/admin) via convite por e-mail.
//
// Não embute nem lê nenhuma chave do repositório: a service_role key só
// existe na sua máquina, na variável de ambiente, na hora de rodar.
// Nunca cole essa chave em nenhum arquivo do projeto.
//
// Uso:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=xxxx \
//   node scripts/admin-convite.mjs contato@personalperto.com.br
//
// Depois que a conta existir, rode a migration
// supabase/migrations/20261007000000_admin_role.sql no SQL Editor pra
// marcar is_admin = true pra esse e-mail.

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.argv[2]

if (!url || !serviceRoleKey) {
  console.error('Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.')
  process.exit(1)
}
if (!email) {
  console.error('Uso: node scripts/admin-convite.mjs <email>')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey)

const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: 'https://treino.personalperto.com.br/definir-senha',
})

if (error) {
  console.error('Falha ao convidar:', error.message)
  process.exit(1)
}

console.log(`Convite enviado para ${email} (user id: ${data.user.id}).`)
console.log('O e-mail de convite leva a um link pra escolher a senha.')
console.log('Depois de aceitar o convite, rode a migration 20261007000000_admin_role.sql no SQL Editor.')
