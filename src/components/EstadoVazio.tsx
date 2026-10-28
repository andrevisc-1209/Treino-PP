import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

type Acao = { rotulo: string; onClick: () => void } | { rotulo: string; to: string }

/**
 * Estado vazio padrão das telas (Agenda, Treinos, Financeiro…): ícone, título que diz o que fazer, uma frase de apoio e UM botão claro.
 * Substitui o texto cinza solto + "+" flutuante que não explicavam o próximo passo (auditoria de UX de 28/10/2026, BACKLOG item 96/97).
 */
export function EstadoVazio({ icone, titulo, texto, acao, acaoSecundaria }: { icone: ReactNode; titulo: string; texto?: string; acao?: Acao; acaoSecundaria?: { rotulo: string; onClick: () => void } }) {
  return (
    <section className="rounded-2xl bg-white p-5 text-center shadow-sm" aria-label={titulo}>
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-hover" aria-hidden>
        {icone}
      </div>
      <h2 className="text-base font-semibold">{titulo}</h2>
      {texto && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{texto}</p>}
      {acao && 'to' in acao && (
        <Link to={acao.to} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white active:bg-brand-hover">
          {acao.rotulo}
        </Link>
      )}
      {acao && 'onClick' in acao && (
        <Button className="mt-4 w-full" onClick={acao.onClick}>
          {acao.rotulo}
        </Button>
      )}
      {acaoSecundaria && (
        <Button variant="outline" className="mt-2 w-full" onClick={acaoSecundaria.onClick}>
          {acaoSecundaria.rotulo}
        </Button>
      )}
    </section>
  )
}
