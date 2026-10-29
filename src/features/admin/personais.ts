/** Helpers puros da lista de personais do /admin (sem I/O). */
import { dataSP, diasEntre } from '@/lib/datas'
import { fimDoAcesso } from './indicacoes'

export const NAO_INFORMADO = 'Não informado'

export type MetricasPersonal = {
  treinos_presencial: number
  treinos_distancia: number
  exec_presencial: number
  exec_distancia: number
  exec_30d: number
}

/** "São Paulo/SP" ou "Não informado" quando o personal não cadastrou a cidade. */
export function rotuloCidade(cidade: string | null | undefined): string {
  const c = (cidade ?? '').trim()
  return c || NAO_INFORMADO
}

/** Cidade vinda da URL (?cidade=); vazio = sem filtro. */
export function cidadeDaUrl(valor: string | null): string {
  return (valor ?? '').trim()
}

/** Personais de uma cidade (o texto é o mesmo da coluna Cidade; "Não informado" pega quem não cadastrou); sem cidade, devolve todos. */
export function filtrarPorCidade<T extends { cidade: string | null }>(lista: T[], cidade: string): T[] {
  const alvo = cidade.trim()
  if (!alvo) return lista
  return lista.filter((p) => rotuloCidade(p.cidade) === alvo)
}

/** Link do Google Maps para a cidade; null se não informada. */
export function linkMapsCidade(cidade: string | null | undefined): string | null {
  const c = (cidade ?? '').trim()
  if (!c) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c}, Brasil`)}`
}

/** "5 montados (3 presencial · 2 à distância) · 12 realizados (9 presencial · 3 à distância)"; sem métricas = "Não informado". */
export function descreverTreinos(m: MetricasPersonal | undefined): { montados: string; realizados: string; ultimos30: string } {
  if (!m) return { montados: NAO_INFORMADO, realizados: NAO_INFORMADO, ultimos30: NAO_INFORMADO }
  const montados = m.treinos_presencial + m.treinos_distancia
  const realizados = m.exec_presencial + m.exec_distancia
  return {
    montados: `${montados} (${m.treinos_presencial} presencial · ${m.treinos_distancia} à distância)`,
    realizados: `${realizados} (${m.exec_presencial} presencial · ${m.exec_distancia} à distância)`,
    ultimos30: String(m.exec_30d),
  }
}

export const ROTULO_ACAO_ADMIN: Record<string, string> = {
  reset_senha: 'Reset de senha',
  alterar_trial: 'Ajuste de trial',
  alterar_plano: 'Ajuste de plano',
  alterar_cpf: 'Correção de CPF',
  revogar_indicacao: 'Indicação revogada',
}

export type AbaAdmin = 'geral' | 'indicadores' | 'personais' | 'financeiro' | 'indicacoes' | 'suporte' | 'privacidade'
export const ABAS_ADMIN: { id: AbaAdmin; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Visão geral' },
  { id: 'indicadores', rotulo: 'Indicadores' },
  { id: 'personais', rotulo: 'Personais' },
  { id: 'financeiro', rotulo: 'Financeiro' },
  { id: 'indicacoes', rotulo: 'Indicações' },
  { id: 'suporte', rotulo: 'Suporte' },
  { id: 'privacidade', rotulo: 'Privacidade' },
]

/** Aba vinda da URL (?aba=); qualquer valor desconhecido cai em "Visão geral". */
export function abaDaUrl(valor: string | null): AbaAdmin {
  return ABAS_ADMIN.some((a) => a.id === valor) ? (valor as AbaAdmin) : 'geral'
}

// ---------- situação comercial, uso e filtros rápidos da lista ----------
type PersonalComStatus = { status: string | null; trial_fim: string | null; assinatura_fim: string | null; qtd_alunos: number }

export type SituacaoComercial = { rotulo: string; evento: string | null; urgencia: 'alta' | 'media' | 'nenhuma' }

function diasAteFim(fimISO: string | null, agora: Date): number | null {
  return fimISO ? diasEntre(dataSP(agora), dataSP(fimISO)) : null
}

function quando(dias: number, antes: string, depois: string): string {
  if (dias < 0) return `${depois} há ${-dias} ${-dias === 1 ? 'dia' : 'dias'}`
  if (dias === 0) return `${antes} hoje`
  if (dias === 1) return `${antes} amanhã`
  return `${antes} em ${dias} dias`
}

/** Situação comercial do personal e o próximo evento (fim do trial ou do plano), com a urgência para ordenar a atenção. */
export function situacaoDoPersonal(p: PersonalComStatus, bonusAte: string | null | undefined, agora: Date = new Date()): SituacaoComercial {
  const dias = diasAteFim(fimDoAcesso(p, bonusAte, agora.getTime()).data, agora)
  if (p.status === 'trial') {
    if (dias === null) return { rotulo: 'Em trial', evento: null, urgencia: 'nenhuma' }
    return { rotulo: 'Em trial', evento: quando(dias, 'Trial termina', 'Trial terminou'), urgencia: dias <= 3 ? 'alta' : dias <= 7 ? 'media' : 'nenhuma' }
  }
  if (p.status === 'ativa') {
    if (dias === null) return { rotulo: 'Pagante', evento: 'Plano sem data de vencimento', urgencia: 'nenhuma' }
    return { rotulo: 'Pagante', evento: quando(dias, 'Plano vence', 'Plano venceu'), urgencia: dias < 0 ? 'alta' : dias <= 7 ? 'media' : 'nenhuma' }
  }
  if (p.status === 'expirada') {
    return { rotulo: 'Vencido', evento: dias === null ? null : quando(dias, 'Venceu', 'Venceu'), urgencia: 'alta' }
  }
  if (p.status === 'cancelada') return { rotulo: 'Cancelado', evento: null, urgencia: 'nenhuma' }
  return { rotulo: 'Sem assinatura', evento: null, urgencia: 'nenhuma' }
}

/** Uso recente: treinos concluídos nos últimos 30 dias em destaque; totais (montados e realizados) em segundo plano. */
export function usoDoPersonal(m: MetricasPersonal | undefined): { principal: string; secundario: string; detalhe: string; semUso: boolean } {
  if (!m) return { principal: NAO_INFORMADO, secundario: '', detalhe: '', semUso: false }
  const d = descreverTreinos(m)
  const montados = m.treinos_presencial + m.treinos_distancia
  const realizados = m.exec_presencial + m.exec_distancia
  return {
    principal: m.exec_30d === 0 ? 'Sem treinos em 30 dias' : `${m.exec_30d} ${m.exec_30d === 1 ? 'treino' : 'treinos'} em 30 dias`,
    secundario: `${montados} montados · ${realizados} realizados`,
    detalhe: `Montados: ${d.montados}. Realizados: ${d.realizados}.`,
    semUso: m.exec_30d === 0,
  }
}

export type FiltroRapido = 'trial_acabando' | 'sem_uso' | 'sem_alunos' | 'vencidos'
export const FILTROS_RAPIDOS: { id: FiltroRapido; rotulo: string }[] = [
  { id: 'trial_acabando', rotulo: 'Trial acabando (3 dias)' },
  { id: 'sem_uso', rotulo: 'Sem treinos em 30 dias' },
  { id: 'sem_alunos', rotulo: 'Sem alunos' },
  { id: 'vencidos', rotulo: 'Vencidos' },
]

/** O personal cai no filtro rápido? "Sem uso" e "Sem alunos" só valem para quem tem acesso (trial ou pagante). */
export function passaFiltroRapido(
  f: FiltroRapido,
  p: PersonalComStatus,
  bonusAte: string | null | undefined,
  metricas: MetricasPersonal | undefined,
  agora: Date = new Date(),
): boolean {
  const temAcesso = p.status === 'trial' || p.status === 'ativa'
  if (f === 'vencidos') return p.status === 'expirada'
  if (f === 'sem_alunos') return temAcesso && p.qtd_alunos === 0
  if (f === 'sem_uso') return temAcesso && !!metricas && metricas.exec_30d === 0
  const dias = diasAteFim(fimDoAcesso(p, bonusAte, agora.getTime()).data, agora)
  return p.status === 'trial' && dias !== null && dias <= 3
}

export type OrdemPersonais = 'nome' | 'vence_primeiro' | 'menos_uso' | 'sem_atividade'
export const ORDENS_PERSONAIS: { id: OrdemPersonais; rotulo: string }[] = [
  { id: 'nome', rotulo: 'Nome (A–Z)' },
  { id: 'vence_primeiro', rotulo: 'Acesso que acaba primeiro' },
  { id: 'menos_uso', rotulo: 'Menos treinos em 30 dias' },
  { id: 'sem_atividade', rotulo: 'Mais tempo sem usar o app' },
]

/** Ordena sem alterar a lista original; sem dado (data ou métrica) vai para o fim. */
export function ordenarPersonais<T extends PersonalComStatus & { id: string; name: string }>(
  lista: T[],
  ordem: OrdemPersonais,
  bonus: Map<string, string> | undefined,
  metricas: Map<string, MetricasPersonal> | undefined,
  atividade?: Map<string, string | null>,
): T[] {
  const nome = (a: T, b: T) => (a.name || '').localeCompare(b.name || '', 'pt-BR')
  const copia = [...lista]
  if (ordem === 'vence_primeiro') {
    const fim = (p: T) => {
      const d = fimDoAcesso(p, bonus?.get(p.id)).data
      return d ? new Date(d).getTime() : Infinity
    }
    return copia.sort((a, b) => fim(a) - fim(b) || nome(a, b))
  }
  if (ordem === 'sem_atividade') {
    // quem nunca usou (null) vem primeiro; depois o uso mais antigo; sem dado vai para o fim
    const parado = (p: T) => {
      const v = atividade?.get(p.id)
      return v === undefined ? -Infinity : v === null ? Infinity : -new Date(v).getTime()
    }
    return copia.sort((a, b) => parado(b) - parado(a) || nome(a, b))
  }
  if (ordem === 'menos_uso') {
    const uso = (p: T) => metricas?.get(p.id)?.exec_30d ?? Infinity
    return copia.sort((a, b) => uso(a) - uso(b) || nome(a, b))
  }
  return copia.sort(nome)
}
