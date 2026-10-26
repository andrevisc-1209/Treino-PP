import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

const REGRAS = [
  { label: 'Mínimo 8 caracteres', testa: (s: string) => s.length >= 8 },
  { label: 'Pelo menos 1 letra maiúscula', testa: (s: string) => /[A-Z]/.test(s) },
  { label: 'Pelo menos 1 número', testa: (s: string) => /[0-9]/.test(s) },
  { label: 'Pelo menos 1 caractere especial (!@#$%...)', testa: (s: string) => /[^A-Za-z0-9]/.test(s) },
]

/** Mesmas regras validadas pelo schema de signup em LoginPage.tsx — se uma mudar, muda aqui também. */
export function senhaAtendeTodasRegras(senha: string): boolean {
  return REGRAS.every((r) => r.testa(senha))
}

export function PasswordChecklist({ senha }: { senha: string }) {
  return (
    <ul className="space-y-1 text-sm">
      {REGRAS.map((r) => {
        const ok = r.testa(senha)
        return (
          <li key={r.label} className={cn('flex items-center gap-2', ok ? 'text-brand-hover' : 'text-slate-600')}>
            {ok ? <Check size={14} className="shrink-0" aria-hidden /> : <Circle size={10} className="shrink-0" aria-hidden />}
            {r.label}
            <span className="sr-only">{ok ? ' (ok)' : ' (falta)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
