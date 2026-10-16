import { dataHoraSP } from '@/features/consentimentos/utils'
import { cn } from '@/lib/utils'

/** Validade do link do treino à distância: 24/48/72 horas ou sem prazo. */
export type ValidadeLink = 24 | 48 | 72 | 'sem_prazo'

export const VALIDADE_PADRAO: ValidadeLink = 48

export const OPCOES_VALIDADE: { valor: ValidadeLink; rotulo: string }[] = [
  { valor: 24, rotulo: '24h' },
  { valor: 48, rotulo: '48h (padrão)' },
  { valor: 72, rotulo: '72h' },
  { valor: 'sem_prazo', rotulo: 'Sem prazo' },
]

const CHAVE = 'treino:validade-link'

/** Última validade escolhida pelo personal neste aparelho (conveniência; sem armazenamento, volta ao padrão de 48h). */
export function lerValidadePadrao(): ValidadeLink {
  try {
    const v = localStorage.getItem(CHAVE)
    if (v === 'sem_prazo') return v
    const n = Number(v)
    if (n === 24 || n === 48 || n === 72) return n
  } catch {
    // armazenamento indisponível
  }
  return VALIDADE_PADRAO
}

export function salvarValidadePadrao(v: ValidadeLink) {
  try {
    localStorage.setItem(CHAVE, String(v))
  } catch {
    // ignora
  }
}

/** Corpo do pedido à Edge Function gerar-link-treino. */
export const corpoValidade = (v: ValidadeLink): { validade_horas?: number; sem_prazo?: true } => (v === 'sem_prazo' ? { sem_prazo: true } : { validade_horas: v })

/** Aviso mostrado ao personal depois de gerar o link. */
export function avisoValidade(v: ValidadeLink, expiraEm: string | null): string {
  if (v === 'sem_prazo' || !expiraEm) return 'Link sem prazo de validade: vale até o aluno registrar o treino.'
  return `⚠️ Link válido por ${v}h — expira em ${dataHoraSP(expiraEm)}. Avise seu aluno para registrar o treino dentro desse prazo.`
}

/** Seletor "Validade do link" (4 opções, alvos de toque de 44px+). */
export function SeletorValidadeLink({ valor, onChange }: { valor: ValidadeLink; onChange: (v: ValidadeLink) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Validade do link</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Validade do link">
        {OPCOES_VALIDADE.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            role="radio"
            aria-checked={valor === o.valor}
            onClick={() => onChange(o.valor)}
            className={cn(
              'min-h-12 rounded-xl border px-2 text-sm font-medium',
              valor === o.valor ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700 active:bg-slate-50',
            )}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}
