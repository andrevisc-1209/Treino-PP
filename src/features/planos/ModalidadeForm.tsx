import { cn } from '@/lib/utils'
import { Field, Input } from '@/components/ui'
import { MODALIDADES, MODALIDADES_CONFIG, type ModalidadeTipo, type TipoExecucao } from '@/types/modalidades'

const CLASSE_CAMPO = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-brand'

/** Escolha da modalidade, presencial/assíncrono e campos específicos da modalidade (musculação não tem campos extras). */
export function ModalidadeForm({
  modalidade,
  onModalidade,
  tipoExecucao,
  onTipoExecucao,
  valores,
  onValores,
}: {
  modalidade: ModalidadeTipo
  onModalidade: (m: ModalidadeTipo) => void
  tipoExecucao: TipoExecucao
  onTipoExecucao: (t: TipoExecucao) => void
  valores: Record<string, string>
  onValores: (v: Record<string, string>) => void
}) {
  const campos = MODALIDADES_CONFIG[modalidade].campos
  const atualizar = (key: string, valor: string) => onValores({ ...valores, [key]: valor })

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Modalidade</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Modalidade">
          {MODALIDADES.map((m) => {
            const cfg = MODALIDADES_CONFIG[m]
            const ativo = m === modalidade
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => onModalidade(m)}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 text-center text-xs font-medium transition',
                  ativo ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700 active:bg-slate-50',
                )}
              >
                <span className="text-xl" aria-hidden>
                  {cfg.emoji}
                </span>
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Como o aluno vai fazer?</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de execução">
          {(
            [
              { v: 'sincrono', t: 'Presencial', s: '(Síncrono)' },
              { v: 'assincrono', t: 'Assíncrono', s: '(Envio ao aluno)' },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={tipoExecucao === o.v}
              onClick={() => onTipoExecucao(o.v)}
              className={cn(
                'min-h-14 rounded-xl border px-2 py-2 text-center text-sm font-medium',
                tipoExecucao === o.v ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700 active:bg-slate-50',
              )}
            >
              {o.t}
              <span className="block text-xs font-normal opacity-90">{o.s}</span>
            </button>
          ))}
        </div>
        {tipoExecucao === 'assincrono' && (
          <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600" role="status">
            O treino será enviado ao aluno via WhatsApp para ele realizar por conta.
          </p>
        )}
      </div>

      {campos.map((c) => (
        <Field key={c.key} label={c.label}>
          {c.type === 'textarea' ? (
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
              value={valores[c.key] ?? ''}
              placeholder={c.placeholder}
              onChange={(e) => atualizar(c.key, e.target.value)}
            />
          ) : c.type === 'select' ? (
            <select className={CLASSE_CAMPO} value={valores[c.key] ?? ''} onChange={(e) => atualizar(c.key, e.target.value)}>
              <option value="">Selecione…</option>
              {c.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={c.type === 'number' ? 'number' : 'text'}
              inputMode={c.type === 'number' ? 'decimal' : undefined}
              min={c.type === 'number' ? 0 : undefined}
              step={c.type === 'number' ? 'any' : undefined}
              placeholder={c.placeholder}
              value={valores[c.key] ?? ''}
              onChange={(e) => atualizar(c.key, e.target.value)}
            />
          )}
        </Field>
      ))}
    </div>
  )
}
