import { cn } from '@/lib/utils'
import type { FaturaStatus, ModeloCobranca } from './api'

const ROTULOS: Record<FaturaStatus, string> = {
  aberta: 'Aberta',
  enviada: 'Enviada',
  paga: 'Paga',
  cancelada: 'Cancelada',
}

const CORES: Record<FaturaStatus, string> = {
  aberta: 'bg-slate-100 text-slate-600',
  enviada: 'bg-amber-50 text-amber-700',
  paga: 'bg-emerald-50 text-emerald-700',
  cancelada: 'bg-slate-100 text-slate-400',
}

export function SeloFatura({ status, vencida }: { status: FaturaStatus; vencida?: boolean }) {
  if (vencida && (status === 'aberta' || status === 'enviada')) {
    return <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Em atraso</span>
  }
  return <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', CORES[status])}>{ROTULOS[status]}</span>
}

export function rotuloModelo(modelo: ModeloCobranca): string {
  return modelo === 'por_aula' ? 'Por aula' : 'Mensal'
}

export function estaVencida(vencimento: string | null, status: FaturaStatus, hojeISO: string): boolean {
  if (!vencimento) return false
  if (status !== 'aberta' && status !== 'enviada') return false
  return vencimento < hojeISO
}
