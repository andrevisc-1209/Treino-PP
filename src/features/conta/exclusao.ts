// Exclusão da própria conta (LGPD, art. 18, VI): regras puras e textos. O servidor repete a conferência do "EXCLUIR".
import { formatarDataBR } from '@/lib/format'

export const PALAVRA_CONFIRMACAO = 'EXCLUIR'
export const DIAS_CARENCIA = 30

/** Habilita o botão: a palavra EXCLUIR, sem diferença de caixa nem de espaço nas pontas (igual ao banco). */
export const confirmacaoValida = (v: string): boolean => v.trim().toUpperCase() === PALAVRA_CONFIRMACAO

export type ExclusaoPendente = { protocolo: string; solicitada_em: string; prevista_em: string }

/** dd/mm/aaaa no fuso de São Paulo (a data vem do banco como instante). */
export function dataDaExclusao(iso: string): string {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
  return formatarDataBR(d)
}

/** Data prevista a partir de hoje, só para mostrar ANTES de confirmar ("até dd/mm/aaaa"). */
export function previsaoDaExclusao(hoje: Date = new Date()): string {
  return dataDaExclusao(new Date(hoje.getTime() + DIAS_CARENCIA * 86_400_000).toISOString())
}

export const TEXTO_APAGADO = 'seus dados pessoais, todos os seus alunos, treinos, fichas, avaliações, agenda e histórico'
export const TEXTO_RETIDO =
  'os registros dos pagamentos do seu plano ao Treino PP (valor, data e plano) ficam por 5 anos, por obrigação legal (Código Tributário Nacional), sem o seu nome, CPF ou e-mail'
