import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Field, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { MODALIDADES_FOCO, provasDoFoco } from './provaAlvo'

const SELECT = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-brand'

/** Bloco colapsável "Objetivo esportivo": modalidade foco, prova alvo (triathlon/corrida) e data da prova. */
export function ObjetivoEsportivo({
  foco,
  prova,
  nome,
  data,
  onFoco,
  onProva,
  onNome,
  onData,
}: {
  foco: string
  prova: string
  nome: string
  data: string
  onFoco: (v: string) => void
  onProva: (v: string) => void
  onNome: (v: string) => void
  onData: (v: string) => void
}) {
  // aberto por padrão quando já há dados (eles chegam depois do primeiro render, na edição); o toque do usuário prevalece
  const [manual, setManual] = useState<boolean | null>(null)
  const aberto = manual ?? !!(foco || prova || nome || data)
  const provas = provasDoFoco(foco)
  return (
    <section className="rounded-2xl border border-slate-200">
      <button type="button" onClick={() => setManual(!aberto)} aria-expanded={aberto} className="flex min-h-12 w-full items-center justify-between px-4 text-left font-medium">
        Objetivo esportivo
        <ChevronDown size={18} className={cn('text-slate-400 transition-transform', aberto && 'rotate-180')} aria-hidden />
      </button>
      {aberto && (
        <div className="space-y-3 px-4 pb-4">
          <Field label="Modalidade foco">
            <select className={SELECT} value={foco} onChange={(e) => onFoco(e.target.value)}>
              <option value="">—</option>
              {MODALIDADES_FOCO.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </Field>
          {provas.length > 0 && (
            <Field label="Prova alvo">
              <select className={SELECT} value={prova} onChange={(e) => onProva(e.target.value)}>
                <option value="">—</option>
                {provas.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {prova && (
            <Field label="Nome da prova (opcional)">
              <Input value={nome} maxLength={60} onChange={(e) => onNome(e.target.value)} placeholder="Ex: Ironman Floripa, São Silvestre..." />
            </Field>
          )}
          <Field label="Data da prova">
            <Input type="date" value={data} onChange={(e) => onData(e.target.value)} />
          </Field>
        </div>
      )}
    </section>
  )
}
