import { Check } from 'lucide-react'
import type { EstadoResultado } from './resultado'
import { Field, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { exerciciosLivresDe, linhasDetalhes, MODALIDADES_CONFIG, RESULTADO_CAMPOS, type ModalidadeDetalhes, type ModalidadeTipo } from '@/types/modalidades'

type Outra = Exclude<ModalidadeTipo, 'musculacao'>

/** O que o personal prescreveu (detalhes da modalidade), como referência antes de registrar o resultado. */
export function ReferenciaTreino({ modalidade, detalhes }: { modalidade: ModalidadeTipo; detalhes: ModalidadeDetalhes }) {
  const cfg = MODALIDADES_CONFIG[modalidade]
  const linhas = linhasDetalhes(modalidade, detalhes)
  return (
    <div className="space-y-1 rounded-2xl bg-slate-50 p-4">
      <p className="font-semibold">
        {cfg.emoji} {cfg.label}
      </p>
      {linhas.length === 0 ? (
        <p className="text-sm text-slate-500">Sem detalhes cadastrados.</p>
      ) : (
        <ul className="space-y-0.5 text-sm text-slate-700">
          {linhas.map((l) => (
            <li key={l} className="whitespace-pre-line">
              {l}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Itens livres para marcar + campos do resultado + observações. Usado na página pública e na aula presencial. */
export function FormResultadoModalidade({
  modalidade,
  detalhes,
  estado,
  onEstado,
  dicaNotas,
}: {
  modalidade: Outra
  detalhes: ModalidadeDetalhes
  estado: EstadoResultado
  onEstado: (e: EstadoResultado) => void
  dicaNotas?: string
}) {
  const livres = exerciciosLivresDe(detalhes)
  return (
    <div className="space-y-4">
      {livres.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Exercícios</p>
          <ul className="space-y-2">
            {livres.map((l, i) => {
              const feito = !!estado.feitos[i]
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={feito}
                    onClick={() => {
                      const feitos = livres.map((_, j) => (j === i ? !feito : !!estado.feitos[j]))
                      onEstado({ ...estado, feitos })
                    }}
                    className={cn(
                      'flex min-h-14 w-full items-center gap-3 rounded-2xl border p-3 text-left',
                      feito ? 'border-brand bg-brand-soft' : 'border-slate-200 bg-white',
                    )}
                  >
                    <span
                      className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg border', feito ? 'border-brand bg-brand text-white' : 'border-slate-300')}
                      aria-hidden
                    >
                      {feito && <Check size={18} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{l.nome}</span>
                      {l.descricao && <span className="block text-sm text-slate-600">{l.descricao}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Resultado</p>
        {RESULTADO_CAMPOS[modalidade].map((c) => (
          <Field key={c.key} label={c.label}>
            <Input
              type={c.type === 'number' ? 'number' : 'text'}
              inputMode={c.type === 'number' ? 'decimal' : undefined}
              min={c.type === 'number' ? 0 : undefined}
              step={c.type === 'number' ? 'any' : undefined}
              placeholder={c.placeholder}
              value={estado.valores[c.key] ?? ''}
              onChange={(e) => onEstado({ ...estado, valores: { ...estado.valores, [c.key]: e.target.value } })}
            />
          </Field>
        ))}
        <Field label="Observações">
          <textarea
            className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
            value={estado.notas}
            maxLength={1000}
            placeholder={dicaNotas}
            onChange={(e) => onEstado({ ...estado, notas: e.target.value })}
          />
        </Field>
      </div>
    </div>
  )
}
