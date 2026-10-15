// Lógica pura das notificações de WhatsApp ao personal (sem APIs do Deno): datas no fuso de São Paulo, textos das mensagens e
// regras de envio. Testável com vitest. REGRA (LGPD): nenhum texto aqui leva dado de saúde (lesão, cirurgia, medicamento,
// prontidão/bem-estar) — só nomes, horários, locais, valores e contagens.

import { numeroWhatsApp } from './whatsapp.ts'

export const TIPOS_NOTIFICACAO = ['briefing_diario', 'pagamento_plano', 'plano_expirando', 'resumo_semanal', 'aluno_inativo'] as const
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
const primeiroNome = (nome: string | null | undefined): string => (nome ?? '').trim().split(/\s+/)[0] || ''

// ---------- regra de envio ----------
export type DecisaoEnvio = { enviar: true; numero: string } | { enviar: false; motivo: 'sem_opt_in' | 'sem_telefone' | 'ja_enviado_hoje' }

/** Só envia com opt-in ligado, telefone válido e nenhuma mensagem desse tipo já enviada hoje. */
export function decidirEnvio(args: { optIn: boolean | null | undefined; phone: string | null | undefined; jaEnviadoHoje: boolean }): DecisaoEnvio {
  if (!args.optIn) return { enviar: false, motivo: 'sem_opt_in' }
  const numero = numeroWhatsApp(args.phone)
  if (!numero) return { enviar: false, motivo: 'sem_telefone' }
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
export type ClimaDoDia = { emoji: string; texto: string; min: number; max: number; chuvaProb: number }

/** Mensagem da agenda do dia; null (não enviar) quando não há aula. */
export function montarBriefing(args: { nome: string | null; aulas: AulaDoDia[]; clima: ClimaDoDia | null }): string | null {
  if (args.aulas.length === 0) return null
  const aulas = [...args.aulas].sort((a, b) => a.horario.localeCompare(b.horario))
  const linhas = aulas.map((a) => `${a.horario} ${primeiroNome(a.aluno) || a.aluno} @ ${a.local?.trim() || 'sem local definido'}`)
  const partes = [`☀️ Bom dia${primeiroNome(args.nome) ? `, ${primeiroNome(args.nome)}` : ''}!`, '', `📅 Sua agenda de hoje (${aulas.length} ${aulas.length === 1 ? 'aluno' : 'alunos'})`, ...linhas]
  if (args.clima) {
    partes.push('', '🌤️ Previsão para hoje', `${args.clima.emoji} ${args.clima.texto} | ${args.clima.min}–${args.clima.max}°C`, `Chuva: ${args.clima.chuvaProb}% de probabilidade`)
    if (args.clima.chuvaProb >= 40) partes.push('⚠️ Considere avisar alunos de treino ao ar livre.')
  }
  partes.push('', 'Bom trabalho! 💪')
  return partes.join('\n')
}

// ---------- 2. financeiro (plano do próprio personal) ----------
export function montarPagamentoPlano(args: { plano: string; valor: number; ate: string }): string {
  return `💰 Pagamento confirmado!\nPlano: ${args.plano}\nValor: ${brl(args.valor)}\nAcesso até: ${dataBR(args.ate)}`
}

export function montarPlanoExpirando(args: { plano: string | null; ate: string }): string {
  return `⏰ Seu acesso vence em breve\nVence em ${diaSemanaCurto(args.ate)}${args.plano ? `\nPlano atual: ${args.plano}` : ''}\nRenove em Configurações › Assinatura para não perder o acesso.`
}

// ---------- 3. resumo semanal ----------
export type Inativo = { nome: string; dias: number }
export type ResumoSemana = { realizados: number; agendados: number; novosAlunos: number; receita: number; inativos: Inativo[] }

/** Resumo de domingo à noite; null quando não houve nenhuma atividade na semana. */
export function montarResumoSemanal(r: ResumoSemana): string | null {
  if (r.realizados === 0 && r.agendados === 0 && r.novosAlunos === 0 && r.receita === 0) return null
  const partes = ['📊 Resumo da semana', `🏋️ Treinos: ${r.realizados} realizados / ${r.agendados} agendados`, `👥 Novos alunos: ${r.novosAlunos}`, `💰 Receita: ${brl(r.receita)}`]
  if (r.inativos.length > 0) {
    const lista = [...r.inativos].sort((a, b) => b.dias - a.dias)
    partes.push('', '⚠️ Sem treino há 10+ dias:', ...lista.slice(0, 8).map((i) => `— ${i.nome} (${i.dias} dias)`))
    if (lista.length > 8) partes.push(`— e mais ${lista.length - 8}`)
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

export function montarAlunosInativos(lista: (Inativo & { ultimo: string })[]): string | null {
  if (lista.length === 0) return null
  const linhas = lista.map((i) => `${i.nome} não registra treino há ${i.dias} dias.\nÚltimo: ${dataBR(i.ultimo)}`)
  return ['👋 ' + (lista.length === 1 ? 'Aluno inativo' : 'Alunos inativos'), ...linhas].join('\n')
}
