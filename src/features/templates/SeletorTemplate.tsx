import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BottomSheet, Button } from '@/components/ui'
import { mapearErroSupabase } from '@/lib/erros'
import { MODALIDADES_CONFIG, resumoModalidade, type ModalidadeTipo } from '@/types/modalidades'
import { itensMusculacaoDe } from './aplicar'
import { useTemplatesTreino, type TemplateTreino } from './api'

function Cartao({ t, onUsar }: { t: TemplateTreino; onUsar: () => void }) {
  const itens = t.modalidade === 'musculacao' ? itensMusculacaoDe(t.modalidade_detalhes) : []
  const resumo = t.modalidade === 'musculacao' ? `${itens.length} ${itens.length === 1 ? 'exercício' : 'exercícios'}` : resumoModalidade(t.modalidade, t.modalidade_detalhes)
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
      <div>
        <p className="font-semibold">{t.nome}</p>
        {resumo && <p className="text-xs text-slate-500">{resumo}</p>}
      </div>
      {t.descricao && <p className="text-sm text-slate-600">{t.descricao}</p>}
      {itens.length > 0 && (
        <ol className="list-decimal space-y-0.5 pl-5 text-xs text-slate-600">
          {itens.map((it) => (
            <li key={it.exercicio_id}>
              {it.nome} · {it.sets} × {it.reps}
            </li>
          ))}
        </ol>
      )}
      <Button onClick={onUsar} className="w-full">
        Usar este modelo
      </Button>
    </div>
  )
}

/**
 * "Começar de um modelo": mesmo gesto da natação, para as modalidades com modelos prontos do sistema.
 * Com `modalidadesEscolhaveis` (2 ou mais) aparecem abas para trocar de modalidade dentro do seletor: é o atalho "Usar um modelo pronto" do estado vazio,
 * em que a pessoa ainda não escolheu a modalidade. Sem isso, o seletor mostra só a modalidade do formulário.
 */
export function SeletorTemplate({
  modalidade,
  aberto,
  onClose,
  onEscolher,
  modalidadesEscolhaveis,
}: {
  modalidade: ModalidadeTipo
  aberto: boolean
  onClose: () => void
  onEscolher: (t: TemplateTreino) => void
  modalidadesEscolhaveis?: ModalidadeTipo[]
}) {
  const [escolhida, setEscolhida] = useState<ModalidadeTipo>(modalidade)
  // cada abertura começa na modalidade do formulário
  useEffect(() => {
    if (aberto) setEscolhida(modalidade)
  }, [aberto, modalidade])
  const { data, isLoading, error } = useTemplatesTreino(escolhida, aberto)
  const abas = modalidadesEscolhaveis && modalidadesEscolhaveis.length > 1 ? modalidadesEscolhaveis : null
  return (
    <BottomSheet open={aberto} onClose={onClose} title="Modelos prontos" mostrarFechar>
      <div className="space-y-3">
        {abas && (
          <div role="tablist" aria-label="Modalidade do modelo" className="flex gap-2 overflow-x-auto pb-1">
            {abas.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={m === escolhida}
                onClick={() => setEscolhida(m)}
                className={cn(
                  'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium',
                  m === escolhida ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                )}
              >
                <span aria-hidden>{MODALIDADES_CONFIG[m].emoji}</span> {MODALIDADES_CONFIG[m].label}
              </button>
            ))}
          </div>
        )}
        {isLoading && <p className="py-4 text-center text-sm text-slate-500">Carregando…</p>}
        {error && <p className="text-sm text-red-600">{mapearErroSupabase(error)}</p>}
        {data?.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Sem modelos para esta modalidade.</p>}
        {data?.map((t) => (
          <Cartao key={t.id} t={t} onUsar={() => onEscolher(t)} />
        ))}
      </div>
    </BottomSheet>
  )
}

export function BotaoComecarDeModelo({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-brand-hover active:bg-slate-100">
      <Sparkles size={16} /> Começar de um modelo ›
    </button>
  )
}
