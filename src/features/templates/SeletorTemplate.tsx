import { Sparkles } from 'lucide-react'
import { BottomSheet, Button } from '@/components/ui'
import { mapearErroSupabase } from '@/lib/erros'
import { resumoModalidade, type ModalidadeTipo } from '@/types/modalidades'
import { useTemplatesTreino, type TemplateTreino } from './api'

function Cartao({ t, onUsar }: { t: TemplateTreino; onUsar: () => void }) {
  const resumo = resumoModalidade(t.modalidade, t.modalidade_detalhes)
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
      <div>
        <p className="font-semibold">{t.nome}</p>
        {resumo && <p className="text-xs text-slate-500">{resumo}</p>}
      </div>
      {t.descricao && <p className="text-sm text-slate-600">{t.descricao}</p>}
      <Button onClick={onUsar} className="w-full">
        Usar este modelo
      </Button>
    </div>
  )
}

/** "Começar de um modelo": mesmo gesto da natação, para as modalidades com modelos prontos do sistema. */
export function SeletorTemplate({ modalidade, aberto, onClose, onEscolher }: { modalidade: ModalidadeTipo; aberto: boolean; onClose: () => void; onEscolher: (t: TemplateTreino) => void }) {
  const { data, isLoading, error } = useTemplatesTreino(modalidade, aberto)
  return (
    <BottomSheet open={aberto} onClose={onClose} title="Modelos prontos">
      <div className="space-y-3">
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
