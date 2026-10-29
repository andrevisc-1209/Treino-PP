/** Números da página pública da agenda (RPC `resumo_agenda_publica`, migration 20261093). Helpers puros, sem I/O. */

export type ResumoAgendaPublica = {
  pedidos7d: number
  pendentes: number
  aprovados30d: number
  /** minutos entre o pedido e a resposta (aprovar ou recusar), mediana dos últimos 30 dias; null = ainda sem resposta */
  medianaRespostaMin: number | null
  aulasRealizadas: number
}

const n = (v: unknown): number => Math.max(0, Math.round(Number(v ?? 0)) || 0)

export function normalizarResumo(raw: unknown): ResumoAgendaPublica {
  const o = (raw ?? {}) as Record<string, unknown>
  const mediana = o.mediana_resposta_min === null || o.mediana_resposta_min === undefined ? null : Number(o.mediana_resposta_min)
  return {
    pedidos7d: n(o.pedidos_7d),
    pendentes: n(o.pendentes),
    aprovados30d: n(o.aprovados_30d),
    medianaRespostaMin: mediana === null || !Number.isFinite(mediana) ? null : Math.max(0, mediana),
    aulasRealizadas: n(o.aulas_realizadas),
  }
}

/** "12 min", "3 h", "2 dias"; sem dado, "–". */
export function rotuloTempo(min: number | null): string {
  if (min === null) return '–'
  if (min < 1) return 'menos de 1 min'
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.round(h / 24)
  return `${d} ${d === 1 ? 'dia' : 'dias'}`
}

/** Ainda não houve nenhum pedido (nem aprovado, nem pendente)? Aí a tela convida a divulgar o link em vez de mostrar zeros. */
export const semMovimento = (r: ResumoAgendaPublica): boolean => r.pedidos7d === 0 && r.pendentes === 0 && r.aprovados30d === 0 && r.aulasRealizadas === 0 && r.medianaRespostaMin === null

/** Totais para o admin (RPC `admin_agenda_publica_resumo`): nenhum dado de visitante ou de aluno. */
export type ResumoAdminAgendaPublica = {
  personaisComPagina: number
  personaisComPedidos30d: number
  pedidos7d: number
  pedidos30d: number
  aprovados30d: number
  respondidos30d: number
  medianaRespostaMin: number | null
  aulasRealizadas: number
}

export function normalizarResumoAdmin(raw: unknown): ResumoAdminAgendaPublica {
  const o = (raw ?? {}) as Record<string, unknown>
  const base = normalizarResumo(o)
  return {
    personaisComPagina: n(o.personais_com_pagina),
    personaisComPedidos30d: n(o.personais_com_pedidos_30d),
    pedidos7d: base.pedidos7d,
    pedidos30d: n(o.pedidos_30d),
    aprovados30d: base.aprovados30d,
    respondidos30d: n(o.respondidos_30d),
    medianaRespostaMin: base.medianaRespostaMin,
    aulasRealizadas: base.aulasRealizadas,
  }
}

/** Parte dos pedidos respondidos que virou aula, em %; null se ninguém foi respondido ainda. */
export const taxaDeAprovacao = (aprovados: number, respondidos: number): number | null => (respondidos > 0 ? Math.round((aprovados / respondidos) * 100) : null)
