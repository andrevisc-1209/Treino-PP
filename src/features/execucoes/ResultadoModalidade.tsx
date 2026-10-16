import { Check } from 'lucide-react'
import { CAMPOS_TEMPO_SUBSTITUIDOS, distanciaNatacaoFeita, type EstadoResultado } from './resultado'
import { formatarNumero } from '@/lib/format'
import { dadosNatacaoDe, resumoTotalNatacao, rotuloAmbiente } from '@/types/natacao'
import { Field, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { blocosDe, cabecalhoEstruturado, formatarBloco, itensChecklist, linhasDetalhes, MODALIDADES_CONFIG, RESULTADO_CAMPOS, usaBlocos, type ModalidadeDetalhes, type ModalidadeTipo } from '@/types/modalidades'

type Outra = Exclude<ModalidadeTipo, 'musculacao'>

/** O que o personal prescreveu (detalhes da modalidade), como referência antes de registrar o resultado. */
export function ReferenciaTreino({ modalidade, detalhes }: { modalidade: ModalidadeTipo; detalhes: ModalidadeDetalhes }) {
  const cfg = MODALIDADES_CONFIG[modalidade]
  const linhas = linhasDetalhes(modalidade, detalhes)
  const blocos = blocosDe(modalidade, detalhes)
  const natacao = modalidade === 'natacao' ? dadosNatacaoDe(detalhes) : null
  return (
    <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
      <p className="font-semibold">
        {cfg.emoji} {cfg.label}
        {natacao && <span className="font-normal"> — {rotuloAmbiente(natacao.ambiente)}</span>}
      </p>
      {natacao && <p className="text-sm font-medium text-slate-700">{resumoTotalNatacao(natacao)}</p>}
      {cabecalhoEstruturado(modalidade, detalhes) && <p className="text-sm font-medium text-slate-700">{cabecalhoEstruturado(modalidade, detalhes)}</p>}
      {modalidade === 'natacao' && !natacao && blocos.length === 0 && <p className="text-sm text-slate-500">(treino antigo — sem estrutura)</p>}
      {blocos.length > 0 && (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          {blocos.map((b) => (
            <li key={b.id}>{formatarBloco(b)}</li>
          ))}
        </ol>
      )}
      {linhas.length === 0 && blocos.length === 0 ? (
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

/** "Tempo de execução [h] [min]" — opcional. Usado no resultado das modalidades e na musculação da página pública. */
export function CampoTempoExecucao({ estado, onEstado }: { estado: EstadoResultado; onEstado: (e: EstadoResultado) => void }) {
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 text-sm font-medium">Tempo de execução (opcional)</legend>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={24}
          step={1}
          aria-label="Horas"
          placeholder="0"
          className="w-20"
          value={estado.duracaoH ?? ''}
          onChange={(e) => onEstado({ ...estado, duracaoH: e.target.value })}
        />
        <span className="text-sm text-slate-600">h</span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          step={1}
          aria-label="Minutos"
          placeholder="0"
          className="w-20"
          value={estado.duracaoMin ?? ''}
          onChange={(e) => onEstado({ ...estado, duracaoMin: e.target.value })}
        />
        <span className="text-sm text-slate-600">min</span>
      </div>
    </fieldset>
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
  const livres = itensChecklist(modalidade, detalhes)
  return (
    <div className="space-y-4">
      {livres.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{usaBlocos(modalidade) ? 'Blocos do treino' : 'Exercícios'}</p>
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
        {RESULTADO_CAMPOS[modalidade]
          .filter((c) => !c.legado && !(CAMPOS_TEMPO_SUBSTITUIDOS as readonly string[]).includes(c.key))
          .map((c) => {
            const atual = estado.valores[c.key] ?? ''
            const definir = (v: string) => onEstado({ ...estado, valores: { ...estado.valores, [c.key]: v } })
            if (c.type === 'opcao') {
              return (
                <div key={c.key}>
                  <p className="mb-1 text-sm font-medium">{c.label}</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={c.label}>
                    {c.opcoes?.map((o) => (
                      <button
                        key={o.valor}
                        type="button"
                        role="radio"
                        aria-checked={atual === o.valor}
                        onClick={() => definir(atual === o.valor ? '' : o.valor)}
                        className={cn('min-h-12 rounded-xl border px-1 text-sm font-medium', atual === o.valor ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            }
            if (c.type === 'rpe') {
              return (
                <div key={c.key}>
                  <p className="mb-1 text-sm font-medium">{c.label}</p>
                  <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={c.label}>
                    {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={atual === n}
                        onClick={() => definir(atual === n ? '' : n)}
                        className={cn('min-h-11 rounded-xl border text-sm font-semibold', atual === n ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <Field key={c.key} label={c.label}>
                <Input
                  type={c.type === 'number' ? 'number' : 'text'}
                  inputMode={c.type === 'number' ? 'decimal' : undefined}
                  min={c.type === 'number' ? 0 : undefined}
                  step={c.type === 'number' ? 'any' : undefined}
                  placeholder={
                    modalidade === 'natacao' && c.key === 'distancia_total_m' && distanciaNatacaoFeita(detalhes, estado.feitos) > 0
                      ? `${formatarNumero(distanciaNatacaoFeita(detalhes, estado.feitos))} (dos blocos marcados)`
                      : c.placeholder
                  }
                  value={atual}
                  onChange={(e) => definir(e.target.value)}
                />
              </Field>
            )
          })}
        <CampoTempoExecucao estado={estado} onEstado={onEstado} />
        <Field label="Comentário">
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
