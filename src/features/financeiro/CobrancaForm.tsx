import { Field, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { ModeloCobranca } from './api'

export type CobrancaFormValor = {
  modelo: ModeloCobranca
  valorTexto: string
  diaCicloTexto: string
  diasVencimentoTexto: string
  /** por aula: cobrar também o treino que o aluno faz à distância (pelo link), por um valor próprio */
  cobrarDistancia: boolean
  valorDistanciaTexto: string
}

export function valorInicialCobranca(hoje = new Date()): CobrancaFormValor {
  return {
    modelo: 'por_aula',
    valorTexto: '',
    diaCicloTexto: String(Math.min(hoje.getDate(), 28)),
    diasVencimentoTexto: '5',
    cobrarDistancia: false,
    valorDistanciaTexto: '',
  }
}

export function CobrancaForm({
  value,
  onChange,
}: {
  value: CobrancaFormValor
  onChange: (v: CobrancaFormValor) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Modelo">
        <div className="flex gap-2">
          {(['por_aula', 'mensal'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...value, modelo: m })}
              className={cn(
                'min-h-11 flex-1 rounded-xl border px-3 text-sm font-medium transition',
                value.modelo === m ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
              )}
            >
              {m === 'por_aula' ? 'Por aula' : 'Mensal (a cada 30 dias)'}
            </button>
          ))}
        </div>
      </Field>

      <Field label={value.modelo === 'por_aula' ? 'Valor da aula (R$)' : 'Valor mensal (R$)'}>
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={value.valorTexto}
          onChange={(e) => onChange({ ...value, valorTexto: e.target.value })}
        />
      </Field>

      {value.modelo === 'por_aula' ? (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3">
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm font-medium">Cobrar treinos à distância</span>
            <input
              type="checkbox"
              checked={value.cobrarDistancia}
              onChange={(e) => onChange({ ...value, cobrarDistancia: e.target.checked })}
              className="size-5 accent-brand"
            />
          </label>
          {value.cobrarDistancia ? (
            <Field label="Valor do treino à distância (R$)">
              <Input type="number" step="0.01" inputMode="decimal" value={value.valorDistanciaTexto} onChange={(e) => onChange({ ...value, valorDistanciaTexto: e.target.value })} />
            </Field>
          ) : (
            <p className="text-xs text-slate-500">Desligado: o treino que o aluno faz pelo link aparece no histórico, mas não é cobrado.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No modelo mensal os treinos à distância não são cobrados à parte: o relatório do ciclo só mostra as quantidades.</p>
      )}

      <div className="flex gap-2">
        <Field label="Dia de início do ciclo (1–28)">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={28}
            value={value.diaCicloTexto}
            onChange={(e) => onChange({ ...value, diaCicloTexto: e.target.value })}
          />
        </Field>
        <Field label="Vencimento (dias após fechar)">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={value.diasVencimentoTexto}
            onChange={(e) => onChange({ ...value, diasVencimentoTexto: e.target.value })}
          />
        </Field>
      </div>
    </div>
  )
}
