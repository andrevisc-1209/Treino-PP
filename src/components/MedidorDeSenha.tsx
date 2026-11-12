import { avaliarSenha, SENHA_MIN } from '@/lib/senha'
import { cn } from '@/lib/utils'

/** Barra e frase de força da senha (o que vale é o tamanho; ver lib/senha.ts). Anunciada para leitor de tela quando muda. */
export function MedidorDeSenha({ senha }: { senha: string }) {
  const a = avaliarSenha(senha)
  if (a.nivel === 'vazia') {
    return <p className="text-xs text-slate-600">Use pelo menos {SENHA_MIN} caracteres. Quanto mais longa, mais segura.</p>
  }
  const boa = a.valida
  return (
    <div role="status" aria-live="polite" className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <div className={cn('h-full rounded-full transition-all', boa ? 'bg-brand' : a.nivel === 'curta' ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.round(a.progresso * 100)}%` }} />
      </div>
      <p className={cn('text-xs font-medium', boa ? 'text-brand-hover' : a.nivel === 'curta' ? 'text-amber-800' : 'text-red-700')}>
        {a.rotulo}
        {a.dica ? ` · ${a.dica}` : ''}
      </p>
    </div>
  )
}
