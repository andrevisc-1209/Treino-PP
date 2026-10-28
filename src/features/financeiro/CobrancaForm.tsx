import { Field, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hojeSP } from '@/lib/datas'
import type { FormaPagamento, ModeloCobranca } from './api'

/** O que o personal escolhe no formulário: por aula e mensal ficam em aluno_cobranca; pacote tem tabela própria (aluno_pacotes). */
export type ModeloForm = ModeloCobranca | 'pacote'

export type CobrancaFormValor = {
  modelo: ModeloForm
  /** por aula: valor da aula; mensal: valor mensal; pacote: valor do pacote inteiro */
  valorTexto: string
  diaCicloTexto: string
  diasVencimentoTexto: string
  /** por aula: cobrar também o treino que o aluno faz à distância (pelo link), por um valor próprio */
  cobrarDistancia: boolean
  valorDistanciaTexto: string
  /** pacote: quantidade de aulas vendidas, prazo para usar (dias) e aulas que o personal já considera feitas */
  qtdPacoteTexto: string
  validadePacoteTexto: string
  feitasPacoteTexto: string
  /** pacote novo: já recebeu (data do recebimento) ou a receber (data do vencimento) */
  pacoteRecebido: boolean
  pagamentoDataTexto: string
  formaPagamento: FormaPagamento
}

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
]

export function valorInicialCobranca(hoje = new Date()): CobrancaFormValor {
  return {
    modelo: 'por_aula',
    valorTexto: '',
    diaCicloTexto: String(Math.min(hoje.getDate(), 28)),
    diasVencimentoTexto: '5',
    cobrarDistancia: false,
    valorDistanciaTexto: '',
    qtdPacoteTexto: '',
    validadePacoteTexto: '60',
    feitasPacoteTexto: '',
    pacoteRecebido: false,
    pagamentoDataTexto: hojeSP(),
    formaPagamento: 'pix',
  }
}

export function CobrancaForm({
  value,
  onChange,
  semPagamento = false,
  valorTravado = false,
  ocultarModelo = false,
}: {
  value: CobrancaFormValor
  onChange: (v: CobrancaFormValor) => void
  /** edição de um pacote que já existe: o pagamento fica na fatura dele */
  semPagamento?: boolean
  /** pacote já recebido: o valor não muda aqui */
  valorTravado?: boolean
  /** renovação de pacote: o modelo já está escolhido */
  ocultarModelo?: boolean
}) {
  return (
    <div className="space-y-4">
      {!ocultarModelo && (
      <Field label="Modelo">
        <div className="flex flex-wrap gap-2">
          {(['por_aula', 'pacote', 'mensal'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...value, modelo: m })}
              className={cn(
                'min-h-11 min-w-[8rem] flex-1 rounded-xl border px-3 text-sm font-medium transition',
                value.modelo === m ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
              )}
            >
              {m === 'por_aula' ? 'Por aula' : m === 'pacote' ? 'Pacote de aulas' : 'Mensal (a cada 30 dias)'}
            </button>
          ))}
        </div>
      </Field>
      )}

      <Field label={value.modelo === 'por_aula' ? 'Valor da aula (R$)' : value.modelo === 'pacote' ? 'Valor do pacote (R$)' : 'Valor mensal (R$)'}>
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          disabled={valorTravado}
          value={value.valorTexto}
          onChange={(e) => onChange({ ...value, valorTexto: e.target.value })}
        />
      </Field>

      {value.modelo === 'pacote' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Field label="Quantidade de aulas">
              <Input type="number" inputMode="numeric" min={1} value={value.qtdPacoteTexto} onChange={(e) => onChange({ ...value, qtdPacoteTexto: e.target.value })} />
            </Field>
            <Field label="Prazo para usar (dias)">
              <Input type="number" inputMode="numeric" min={1} value={value.validadePacoteTexto} onChange={(e) => onChange({ ...value, validadePacoteTexto: e.target.value })} />
            </Field>
          </div>
          <Field label="Aulas já feitas neste pacote (opcional)">
            <Input type="number" inputMode="numeric" min={0} value={value.feitasPacoteTexto} onChange={(e) => onChange({ ...value, feitasPacoteTexto: e.target.value })} />
          </Field>
          {valorTravado && <p className="text-xs text-slate-500">Pacote já recebido: o valor não muda aqui. Para alterar, desfaça o recebimento na fatura.</p>}
          {!semPagamento && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-medium">Pagamento do pacote</p>
              <div className="flex gap-2">
                {([true, false] as const).map((recebido) => (
                  <button
                    key={String(recebido)}
                    type="button"
                    aria-pressed={value.pacoteRecebido === recebido}
                    onClick={() => onChange({ ...value, pacoteRecebido: recebido })}
                    className={cn(
                      'min-h-11 flex-1 rounded-xl border px-3 text-sm font-medium transition',
                      value.pacoteRecebido === recebido ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                    )}
                  >
                    {recebido ? 'Já recebi' : 'A receber'}
                  </button>
                ))}
              </div>
              <Field label={value.pacoteRecebido ? 'Data do recebimento' : 'Vencimento'}>
                <Input type="date" value={value.pagamentoDataTexto} onChange={(e) => onChange({ ...value, pagamentoDataTexto: e.target.value })} />
              </Field>
              {value.pacoteRecebido && (
                <Field label="Forma de pagamento">
                  <div className="flex flex-wrap gap-2">
                    {FORMAS_PAGAMENTO.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        aria-pressed={value.formaPagamento === f.value}
                        onClick={() => onChange({ ...value, formaPagamento: f.value })}
                        className={cn(
                          'min-h-11 rounded-full border px-4 text-sm font-medium',
                          value.formaPagamento === f.value ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500">O pacote começa a contar hoje. Se o aluno já fez aulas dele, informe quantas (ex.: 1 para que a próxima seja a 2/10). Você pode editar tudo depois.</p>
        </div>
      )}

      {value.modelo === 'pacote' ? null : value.modelo === 'por_aula' ? (
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

      {value.modelo !== 'pacote' && (
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
      )}
    </div>
  )
}
