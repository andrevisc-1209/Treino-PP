import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui'
import { INTENSIDADES, type BlocoTreino } from '@/types/modalidades'

const CAMPO = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-brand'

const novoBloco = (): BlocoTreino => ({ id: crypto.randomUUID(), nome: '', descricao: '' })

/** Lista de blocos do treino (natação, corrida, ciclismo, remo, funcional): nome + descrição obrigatórios, ↑↓ para reordenar. */
export function BlocosEditor({ blocos, onChange }: { blocos: BlocoTreino[]; onChange: (b: BlocoTreino[]) => void }) {
  const atualizar = (i: number, parte: Partial<BlocoTreino>) => onChange(blocos.map((b, j) => (j === i ? { ...b, ...parte } : b)))
  const mover = (i: number, delta: -1 | 1) => {
    const alvo = i + delta
    if (alvo < 0 || alvo >= blocos.length) return
    const copia = [...blocos]
    ;[copia[i], copia[alvo]] = [copia[alvo], copia[i]]
    onChange(copia)
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Blocos do treino</p>
        <p className="text-xs text-slate-500">Ex.: Aquecimento · 400 m livre; Série principal · 50 crawl / 50 costas; Soltura. O aluno marca cada bloco ao concluir.</p>
      </div>

      {blocos.map((b, i) => (
        <div key={b.id} className="space-y-2 rounded-2xl border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-1">
            <p className="text-sm font-semibold text-slate-600">Bloco {i + 1}</p>
            <div className="flex">
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir bloco ${i + 1}`} className="flex size-11 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 disabled:opacity-30">
                <ArrowUp size={18} />
              </button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === blocos.length - 1} aria-label={`Descer bloco ${i + 1}`} className="flex size-11 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 disabled:opacity-30">
                <ArrowDown size={18} />
              </button>
              <button type="button" onClick={() => onChange(blocos.filter((_, j) => j !== i))} aria-label={`Remover bloco ${i + 1}`} className="flex size-11 items-center justify-center rounded-xl text-red-600 active:bg-slate-100">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          <Input aria-label={`Nome do bloco ${i + 1}`} placeholder="Nome (ex.: Aquecimento)" value={b.nome} onChange={(e) => atualizar(i, { nome: e.target.value })} />
          <Input aria-label={`Descrição do bloco ${i + 1}`} placeholder="Descrição (ex.: 400 m livre)" value={b.descricao} onChange={(e) => atualizar(i, { descricao: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <Input
              aria-label={`Distância do bloco ${i + 1} (m)`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Distância (m)"
              value={b.distancia ?? ''}
              onChange={(e) => atualizar(i, { distancia: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
            <Input aria-label={`Duração do bloco ${i + 1}`} placeholder="Duração" value={b.duracao ?? ''} onChange={(e) => atualizar(i, { duracao: e.target.value })} />
            <select aria-label={`Intensidade do bloco ${i + 1}`} className={CAMPO} value={b.intensidade ?? ''} onChange={(e) => atualizar(i, { intensidade: e.target.value })}>
              <option value="">Intensidade</option>
              {INTENSIDADES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <Input aria-label={`Observações do bloco ${i + 1}`} placeholder="Observações (opcional)" value={b.observacoes ?? ''} onChange={(e) => atualizar(i, { observacoes: e.target.value })} />
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...blocos, novoBloco()])}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 active:bg-slate-50"
      >
        <Plus size={16} /> Adicionar bloco
      </button>
    </div>
  )
}
