/** Helpers puros do painel de indicações e do mês grátis no /admin (sem I/O). Só dados do personal e números: nunca de aluno. */

export type TotaisIndicacoes = { indicacoes: number; pendentes: number; concedidas: number; revogadas: number; meses_concedidos: number; com_sinal: number }

export type IndicadorLinha = {
  indicador_id: string
  nome: string
  indicados: number
  concedidas: number
  revogadas: number
  meses_ganhos: number
  varias_em_24h: boolean
  mesmo_telefone: boolean
  concedida_rapida: boolean
}

export type IndicacaoLinha = {
  id: string
  indicador_nome: string
  indicado_nome: string
  status: 'pendente' | 'concedida' | 'revogada'
  indicador_ganhou: boolean
  created_at: string
  concedida_em: string | null
  alunos_do_indicado: number
  mesmo_telefone: boolean
  concedida_rapida: boolean
}

export type PainelIndicacoes = { totais: TotaisIndicacoes; por_indicador: IndicadorLinha[]; recentes: IndicacaoLinha[] }

const num = (v: unknown) => Number(v ?? 0)

/** O JSON do banco chega com contagens como número ou texto: normaliza e nunca devolve undefined. */
export function normalizarIndicacoes(bruto: unknown): PainelIndicacoes {
  const b = (bruto ?? {}) as Record<string, unknown>
  const t = (b.totais ?? {}) as Record<string, unknown>
  return {
    totais: {
      indicacoes: num(t.indicacoes),
      pendentes: num(t.pendentes),
      concedidas: num(t.concedidas),
      revogadas: num(t.revogadas),
      meses_concedidos: num(t.meses_concedidos),
      com_sinal: num(t.com_sinal),
    },
    por_indicador: ((b.por_indicador ?? []) as Record<string, unknown>[]).map((l) => ({
      indicador_id: String(l.indicador_id),
      nome: String(l.nome ?? ''),
      indicados: num(l.indicados),
      concedidas: num(l.concedidas),
      revogadas: num(l.revogadas),
      meses_ganhos: num(l.meses_ganhos),
      varias_em_24h: l.varias_em_24h === true,
      mesmo_telefone: l.mesmo_telefone === true,
      concedida_rapida: l.concedida_rapida === true,
    })),
    recentes: ((b.recentes ?? []) as Record<string, unknown>[]).map((l) => ({
      id: String(l.id),
      indicador_nome: String(l.indicador_nome ?? ''),
      indicado_nome: String(l.indicado_nome ?? ''),
      status: l.status as IndicacaoLinha['status'],
      indicador_ganhou: l.indicador_ganhou === true,
      created_at: String(l.created_at),
      concedida_em: l.concedida_em ? String(l.concedida_em) : null,
      alunos_do_indicado: num(l.alunos_do_indicado),
      mesmo_telefone: l.mesmo_telefone === true,
      concedida_rapida: l.concedida_rapida === true,
    })),
  }
}

/** Sinais de possível abuso, em português, de uma indicação ou de um indicador. Vazio = nada suspeito. */
export function sinaisDeAbuso(s: { mesmo_telefone?: boolean; concedida_rapida?: boolean; varias_em_24h?: boolean }): string[] {
  const out: string[] = []
  if (s.mesmo_telefone) out.push('Mesmo telefone nas duas contas')
  if (s.concedida_rapida) out.push('Concedida em menos de 1 hora depois de criar a conta')
  if (s.varias_em_24h) out.push('3 ou mais indicações concedidas em 24 horas')
  return out
}

export const ROTULO_STATUS_INDICACAO: Record<IndicacaoLinha['status'], string> = { pendente: 'Em andamento', concedida: 'Concedida', revogada: 'Revogada' }

/**
 * Fim do acesso mostrado ao admin: o mês grátis vem DEPOIS do trial/assinatura, então vale o maior entre eles.
 * `comBonus` = o mês grátis é o que está sustentando o acesso agora.
 */
export function fimDoAcesso(
  p: { status: string | null; trial_fim: string | null; assinatura_fim: string | null },
  bonusAte: string | null | undefined,
  agora: number = Date.now(),
): { data: string | null; comBonus: boolean } {
  const base = p.status === 'ativa' ? p.assinatura_fim : p.trial_fim
  const bonusVale = !!bonusAte && new Date(bonusAte).getTime() > agora
  if (bonusVale && (!base || new Date(bonusAte!).getTime() > new Date(base).getTime())) return { data: bonusAte!, comBonus: true }
  return { data: base, comBonus: false }
}
