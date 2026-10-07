import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field, Input } from '@/components/ui'
import { MODALIDADES, MODALIDADES_CONFIG, usaBlocos, type BlocoTreino, type ExercicioLivre, type ModalidadeTipo, type TipoExecucao } from '@/types/modalidades'
import { BlocosEditor } from './BlocosEditor'

const CLASSE_CAMPO = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-brand'

/** Escolha da modalidade, presencial/assíncrono e campos específicos da modalidade (musculação não tem campos extras). */
export function ModalidadeForm({
  modalidade,
  onModalidade,
  tipoExecucao,
  onTipoExecucao,
  valores,
  onValores,
  livres,
  onLivres,
  blocos,
  onBlocos,
}: {
  modalidade: ModalidadeTipo
  onModalidade: (m: ModalidadeTipo) => void
  tipoExecucao: TipoExecucao
  onTipoExecucao: (t: TipoExecucao) => void
  valores: Record<string, string>
  onValores: (v: Record<string, string>) => void
  /** exercícios livres (nome + instrução): só nas modalidades sem lista de exercícios do app */
  livres: ExercicioLivre[]
  onLivres: (v: ExercicioLivre[]) => void
  /** blocos do treino (natação, corrida, ciclismo, remo, funcional) */
  blocos: BlocoTreino[]
  onBlocos: (v: BlocoTreino[]) => void
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

      {usaBlocos(modalidade) && <BlocosEditor blocos={blocos} onChange={onBlocos} />}

      {modalidade !== 'musculacao' && !usaBlocos(modalidade) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Exercícios do treino (opcional)</p>
          <p className="text-xs text-slate-500">Itens livres, como "Aquecimento 10 min" ou "Tiros de 400 m". O aluno marca cada um ao concluir.</p>
          {livres.map((l, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`Nome do exercício ${i + 1}`}
                  placeholder="Nome do exercício"
                  value={l.nome}
                  onChange={(e) => onLivres(livres.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                />
                <button
                  type="button"
                  onClick={() => onLivres(livres.filter((_, j) => j !== i))}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                  aria-label={`Remover exercício ${i + 1}`}
                >
                  <X size={18} />
                </button>
              </div>
              <Input
                aria-label={`Instrução do exercício ${i + 1}`}
                placeholder="Descrição ou instrução (opcional)"
                value={l.descricao ?? ''}
                onChange={(e) => onLivres(livres.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => onLivres([...livres, { nome: '' }])}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 active:bg-slate-50"
          >
            <Plus size={16} /> Adicionar exercício
          </button>
        </div>
      )}
    </div>
  )
}
