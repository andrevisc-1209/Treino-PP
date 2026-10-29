// Lógica pura das notificações de WhatsApp ao personal (sem APIs do Deno): datas no fuso de São Paulo, textos das mensagens e
// regras de envio. Testável com vitest. REGRA (LGPD): nenhum texto aqui leva dado de saúde (lesão, cirurgia, medicamento,
// prontidão/bem-estar) — só nomes, horários, locais, valores e contagens.

import { numeroWhatsApp } from './whatsapp.ts'
import { rotuloChuvaMm } from './clima.ts'

/** Onde o personal renova o plano (abre Configurações com a seção Assinatura expandida). */
export const LINK_RENOVAR = 'https://treino.personalperto.com.br/configuracoes?secao=assinatura'

export const TIPOS_NOTIFICACAO = ['briefing_diario', 'pagamento_plano', 'plano_expirando', 'resumo_semanal', 'aluno_inativo', 'plano_vencido', 'treino_concluido', 'relato_novo', 'pedido_aula'] as const
export type TipoNotificacao = (typeof TIPOS_NOTIFICACAO)[number]

// ---------- datas (o Brasil não tem horário de verão desde 2019: São Paulo é sempre UTC-3) ----------
const FUSO = 'America/Sao_Paulo'
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** 'aaaa-mm-dd' do instante, no fuso de São Paulo. */
export function dataSP(instante: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instante))
}

/** 'HH:mm' do instante, no fuso de São Paulo. */
export function horaSP(instante: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(instante))
}

export function somarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const diasEntre = (deISO: string, ateISO: string): number => Math.round((Date.parse(`${ateISO}T12:00:00Z`) - Date.parse(`${deISO}T12:00:00Z`)) / 86_400_000)

/** Segunda-feira da semana de `iso`. */
export function inicioDaSemana(iso: string): string {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay() // 0 = domingo
  return somarDias(iso, -((dow + 6) % 7))
}

export function limitesDoDiaSP(iso: string): { inicio: Date; fim: Date } {
  return { inicio: new Date(`${iso}T00:00:00-03:00`), fim: new Date(`${somarDias(iso, 1)}T00:00:00-03:00`) }
}

export function dataBR(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** "sábado, 18/out" */
export function diaSemanaCurto(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${DIAS_SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()]}, ${String(d).padStart(2, '0')}/${MESES_ABREV[m - 1]}`
}

export const brl = (v: number): string => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
/** Tira os caracteres de formatação do WhatsApp (* _ ~ `) de nomes vindos do banco: nome não vira negrito/itálico/riscado. */
export const nomeLimpo = (nome: string | null | undefined): string => (nome ?? '').replace(/[*_~`]/g, '')
const primeiroNome = (nome: string | null | undefined): string => nomeLimpo(nome).trim().split(/\s+/)[0] || ''

// ---------- regra de envio ----------
export type DecisaoEnvio = { enviar: true; numero: string } | { enviar: false; motivo: 'sem_opt_in' | 'sem_telefone' | 'telefone_nao_verificado' | 'ja_enviado_hoje' }

/**
 * Só envia com opt-in ligado, telefone válido E VERIFICADO (o dono provou a posse por código; sem isso o personal poderia
 * cadastrar o número de outra pessoa) e nenhuma mensagem desse tipo já enviada hoje.
 */
export function decidirEnvio(args: { optIn: boolean | null | undefined; phone: string | null | undefined; phoneVerifiedAt: string | null | undefined; jaEnviadoHoje: boolean }): DecisaoEnvio {
  if (!args.optIn) return { enviar: false, motivo: 'sem_opt_in' }
  const numero = numeroWhatsApp(args.phone)
  if (!numero) return { enviar: false, motivo: 'sem_telefone' }
  if (!args.phoneVerifiedAt) return { enviar: false, motivo: 'telefone_nao_verificado' }
  if (args.jaEnviadoHoje) return { enviar: false, motivo: 'ja_enviado_hoje' }
  return { enviar: true, numero }
}

/** Compara o segredo do cron em tempo constante; segredo esperado curto/ausente = tudo recusado (falha fechada). */
export function segredoCronValido(recebido: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!esperado || esperado.length < 16 || !recebido || recebido.length !== esperado.length) return false
  let diff = 0
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i)
  return diff === 0
}

// ---------- 1. briefing diário ----------
export type AulaDoDia = { horario: string; aluno: string; local: string | null }
export type ClimaDoDia = { emoji: string; texto: string; min: number; max: number; chuvaProb: number; chuvaMm?: number }

const LIMITE_AVISO_CHUVA = 40

/** Mensagem da agenda do dia; null (não envia) quando não há aula. O aviso de chuva só aparece com probabilidade >= 40%. */
export function montarBriefing(args: { nome: string | null; aulas: AulaDoDia[]; clima: ClimaDoDia | null }): string | null {
  if (args.aulas.length === 0) return null
  const aulas = [...args.aulas].sort((a, b) => a.horario.localeCompare(b.horario))
  const nome = primeiroNome(args.nome)
  const primeiroDoAluno = (a: AulaDoDia) => primeiroNome(a.aluno) || nomeLimpo(a.aluno)
  const partes = [`Bom dia${nome ? `, ${nome}` : ''}! 👋`, '']
  if (aulas.length === 1) {
    const a = aulas[0]
    partes.push(`Você tem 1 treino hoje — ${primeiroDoAluno(a)} às ${a.horario}${a.local?.trim() ? ` na ${a.local.trim()}` : ''}.`)
  } else {
    partes.push(`Você tem ${aulas.length} treinos hoje:`, ...aulas.map((a) => `• ${primeiroDoAluno(a)} — ${a.horario}${a.local?.trim() ? ` @ ${a.local.trim()}` : ''}`))
  }
  if (args.clima && args.clima.chuvaProb >= LIMITE_AVISO_CHUVA) {
    const mm = rotuloChuvaMm(args.clima.chuvaMm)
    partes.push('', `⚠️ ${args.clima.chuvaProb}% de chance de chuva hoje${mm ? `, ${mm}` : ''} (${args.clima.min}–${args.clima.max}°C) — vale avisar quem treina ao ar livre.`)
  }
  partes.push('', 'Boa sessão! 💪')
  return partes.join('\n')
}

// ---------- 2. financeiro (plano do próprio personal) ----------
export function montarPagamentoPlano(args: { plano: string; valor: number; ate: string }): string {
  return `💰 Pagamento confirmado!\nPlano: ${args.plano}\nValor: ${brl(args.valor)}\nAcesso até: ${dataBR(args.ate)}`
}

/** Aviso do plano do próprio personal (vence em 3 dias, ou amanhã com `dias: 1`, quando a function roda). */
export function montarPlanoExpirando(args: { nome: string | null; plano: string | null; ate: string; dias?: 3 | 1 }): string {
  const nome = primeiroNome(args.nome)
  const quando = args.dias === 1 ? 'vence amanhã' : 'vence em 3 dias'
  // o link vai sozinho na última linha (o WhatsApp mostra a prévia) e já abre a seção Assinatura
  return `${nome ? `${nome}, s` : 'S'}eu plano${args.plano ? ` ${args.plano}` : ''} ${quando} (${diaSemanaCurto(args.ate)}) — vale renovar antes de perder o acesso:\n${LINK_RENOVAR}`
}

// ---------- 3. resumo semanal ----------
export type Inativo = { nome: string; dias: number }
export type ResumoSemana = { nome: string | null; realizados: number; agendados: number; receita: number; inativos: Inativo[] }

const MAX_INATIVOS_LISTADOS = 3

/** Balanço de domingo à noite, em tom de conversa; null quando não houve treino, receita nem aluno parado. */
export function montarResumoSemanal(r: ResumoSemana): string | null {
  if (r.realizados === 0 && r.agendados === 0 && r.receita === 0 && r.inativos.length === 0) return null
  const nome = primeiroNome(r.nome)
  const treinos = r.realizados === 0 && r.agendados === 0 ? 'não teve treinos' : `teve ${r.realizados} ${r.realizados === 1 ? 'treino realizado' : 'treinos realizados'} e ${r.agendados} ${r.agendados === 1 ? 'agendado' : 'agendados'}`
  const partes = [`Boa semana${nome ? `, ${nome}` : ''}! Aqui vai o balanço 📋`, '', `Essa semana você ${treinos}. Receita: ${brl(r.receita)}.`]
  if (r.inativos.length > 0) {
    const lista = [...r.inativos].sort((a, b) => b.dias - a.dias)
    const total = lista.length
    const mostrar = lista.slice(0, MAX_INATIVOS_LISTADOS)
    partes.push('')
    if (total === 1) partes.push('⚠️ 1 aluno está sumido há mais de 10 dias:')
    else partes.push(total > MAX_INATIVOS_LISTADOS ? `⚠️ ${total} alunos estão sumidos há mais de 10 dias. Os mais críticos:` : `⚠️ ${total} alunos estão sumidos há mais de 10 dias:`)
    partes.push(...mostrar.map((i) => `- ${nomeLimpo(i.nome)} — ${i.dias} dias`))
    if (total > MAX_INATIVOS_LISTADOS) partes.push(`...e mais ${total - MAX_INATIVOS_LISTADOS}.`)
    partes.push(total === 1 ? 'Vale dar um oi essa semana!' : 'Vale dar um oi pra eles essa semana!')
  }
  partes.push('', 'Boa semana! 🚀')
  return partes.join('\n')
}

// ---------- 4a. aluno inativo ----------
/** Alunos cujo último treino foi há `dias` dias (ou há pelo menos `dias`, com `exato = false`). Sem nenhum treino registrado = ignorado. */
export function alunosInativos(alunos: { id: string; nome: string }[], ultimoTreino: Map<string, string>, hoje: string, dias: number, exato: boolean): (Inativo & { ultimo: string })[] {
  const saida: (Inativo & { ultimo: string })[] = []
  for (const a of alunos) {
    const ultimo = ultimoTreino.get(a.id)
    if (!ultimo) continue
    const d = diasEntre(ultimo, hoje)
    if (exato ? d === dias : d >= dias) saida.push({ nome: a.nome, dias: d, ultimo })
  }
  return saida
}

/** Um aviso só com os alunos que completam 10 dias sem treinar hoje; null quando não há nenhum. */
export function montarAlunosInativos(nomePersonal: string | null, lista: (Inativo & { ultimo: string })[]): string | null {
  if (lista.length === 0) return null
  const ordenados = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const primeiro = primeiroNome(ordenados[0].nome) || nomeLimpo(ordenados[0].nome)
  const personal = primeiroNome(nomePersonal)
  // singular sem pronome: não presume o gênero do aluno
  if (ordenados.length === 1) return `Oi${personal ? ` ${personal}` : ''}! ${primeiro} está há ${ordenados[0].dias} dias sem treinar. Que tal mandar uma mensagem? 💬`
  const outros = ordenados.length - 1
  return `${primeiro} e mais ${outros} ${outros === 1 ? 'aluno completou' : 'alunos completaram'} 10 dias sem treinar hoje. Vale dar um oi! 💬`
}

// ---------- 5. cobrança de aluno vencida e sem pagamento ----------
export type FaturaVencida = { nome: string; dias: number; valor: number }

const LIMITE_FATURAS_LISTADAS = 3

/** Aviso das cobranças (faturas) de alunos vencidas há 1, 3 ou 7 dias e ainda não pagas; null sem nenhuma. */
export function montarFaturasVencidas(nomePersonal: string | null, lista: FaturaVencida[]): string | null {
  if (lista.length === 0) return null
  const personal = primeiroNome(nomePersonal)
  const ordenadas = [...lista].sort((a, b) => b.dias - a.dias)
  if (ordenadas.length === 1) {
    const { nome, dias, valor } = ordenadas[0]
    const aluno = primeiroNome(nome) || nomeLimpo(nome)
    const cobranca = `a cobrança de ${aluno} (${brl(valor)})`
    if (dias === 1) return `Oi${personal ? ` ${personal}` : ''}! ${cobranca[0].toUpperCase()}${cobranca.slice(1)} venceu ontem e ainda não foi paga. Só pra não deixar passar 👀`
    if (dias >= 7) return `${personal ? `${personal}, f` : 'F'}az ${dias === 7 ? 'uma semana' : `${dias} dias`} que ${cobranca} venceu. Pode ser um bom momento pra entrar em contato.`
    return `${personal ? `${personal}, ` : ''}${cobranca} está vencida há ${dias} dias. Vale uma conversa?`
  }
  const mostrar = ordenadas.slice(0, LIMITE_FATURAS_LISTADAS)
  const partes = [`${personal ? `${personal}, a` : 'A'}lgumas cobranças venceram e ainda não foram pagas:`, ...mostrar.map((f) => `• ${primeiroNome(f.nome) || nomeLimpo(f.nome)} — ${f.dias} ${f.dias === 1 ? 'dia' : 'dias'}`)]
  if (ordenadas.length > LIMITE_FATURAS_LISTADAS) partes.push(`...e mais ${ordenadas.length - LIMITE_FATURAS_LISTADAS}.`)
  return partes.join('\n')
}

// ---------- 6. aluno concluiu treino à distância ----------
export type TreinoConcluido = { aluno: string; modalidade: string | null }

const LIMITE_CONCLUIDOS_LISTADOS = 5

/** Aviso de treinos à distância concluídos (um ou vários de uma vez). Só nome e modalidade: nada de resultado, PSE ou saúde. */
export function montarTreinosConcluidos(lista: TreinoConcluido[]): string | null {
  if (lista.length === 0) return null
  if (lista.length === 1) {
    const { aluno, modalidade } = lista[0]
    const nome = primeiroNome(aluno) || nomeLimpo(aluno)
    return modalidade ? `✅ ${nome} concluiu o treino de ${modalidade.toLowerCase()} à distância. Mandou bem! 💪` : `✅ ${nome} acabou de concluir o treino à distância! 💪`
  }
  const nomes = lista.map((t) => primeiroNome(t.aluno) || nomeLimpo(t.aluno))
  const unicos = [...new Set(nomes)]
  const partes = [`✅ ${lista.length} treinos à distância foram concluídos:`, ...unicos.slice(0, LIMITE_CONCLUIDOS_LISTADOS).map((n) => `• ${n}`)]
  if (unicos.length > LIMITE_CONCLUIDOS_LISTADOS) partes.push(`...e mais ${unicos.length - LIMITE_CONCLUIDOS_LISTADOS}.`)
  return partes.join('\n')
}

const ROTULOS_MODALIDADE: Record<string, string> = { musculacao: 'musculação', corrida: 'corrida', natacao: 'natação', ciclismo: 'ciclismo', brick: 'brick (bike + corrida)', funcional: 'funcional', remo: 'remo', boxe: 'boxe', escalada: 'escalada', pilates: 'pilates', yoga: 'yoga', futebol: 'futebol', futevolei: 'futevôlei' }

/** Nome da modalidade para o texto da mensagem; null se desconhecida. */
export const ehModalidadeRotulo = (modalidade: string | null | undefined): string | null => (modalidade ? (ROTULOS_MODALIDADE[modalidade] ?? null) : null)

// ---------- 7. relato novo na central de ajuda (aviso ao ADMIN) ----------
const ROTULO_RELATO: Record<string, string> = { problema: 'problema', duvida: 'dúvida', sugestao: 'sugestão' }

/**
 * Aviso ao admin de que chegou um relato. Só tipo e nome do personal: o TEXTO do relato fica no painel (/admin), nunca no WhatsApp,
 * porque é texto livre e poderia trazer dado de aluno ou de saúde apesar do aviso no formulário.
 */
/**
 * Aviso ao personal de que chegou um pedido de aula pela página pública. Só o dia e a hora pedidos: o nome, o telefone e a mensagem do
 * visitante ficam no app (texto livre de quem ainda não é aluno; nunca no WhatsApp).
 */
export function montarPedidoAula(dataISO: string, hora: string): string {
  const [, mes, dia] = dataISO.split('-')
  return `Novo pedido de aula na sua agenda para ${dia}/${mes}, às ${hora}. Abra o app para aprovar ou recusar: treino.personalperto.com.br/agenda?pedidos=1`
}

export function montarRelatoNovo(tipo: string, nomePersonal: string | null): string {
  const quem = primeiroNome(nomePersonal) || 'Um personal'
  const rotulo = ROTULO_RELATO[tipo] ?? 'relato'
  return `Novo ${rotulo} de ${quem} na central de ajuda. Veja em treino.personalperto.com.br/admin → Relatos dos personais.`
}
