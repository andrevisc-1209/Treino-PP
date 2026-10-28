import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, ClipboardList, FileSpreadsheet, Sparkles, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { ROTA_IMPORTAR, ROTA_IMPORTAR_COM_IA, ROTA_IMPORTAR_COM_PLANILHA } from '@/features/alunos/importar/via'
import { useAulasDoDia } from '@/features/agenda/api'
import { useModelos } from '@/features/modelos/api'
import { hojeSP } from '@/lib/datas'
import { percentualAtivacao, textoProgresso } from './ativacao'
import { useAtivacao } from './useAtivacao'

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/**
 * O primeiro uso, no formato da auditoria de UX (wireframe do ChatGPT, 28/10/2026): um cartão só, com a meta (3 alunos), o progresso, UM botão
 * principal e os três caminhos (IA primeiro), mais "Sua rotina" com o que vem depois. Some com 3 alunos ou em "Agora não".
 */
export function AtivacaoCard() {
  const { total, emAtivacao, dispensar } = useAtivacao()
  const navigate = useNavigate()
  const { exigir, somenteLeitura, abrirPlanos } = useExigirAssinatura()
  const { data: aulasHoje } = useAulasDoDia(hojeSP())
  const { data: modelos } = useModelos()
  if (!emAtivacao || total === undefined) return null

  // em modo leitura (assinatura vencida) o servidor recusa gravações: abre os planos em vez de levar a uma tela que vai falhar
  const ir = (e: React.MouseEvent) => {
    if (somenteLeitura) {
      e.preventDefault()
      abrirPlanos()
    }
  }
  const aulas = aulasHoje?.length ?? 0
  const treinos = modelos?.length ?? 0

  return (
    <section className="mb-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm" aria-label="Vamos organizar seus alunos">
      <div>
        <h2 className="text-lg font-semibold">Vamos organizar seus alunos?</h2>
        <p className="text-sm text-slate-600">Cadastre 3 alunos para começar a usar o Treino · Personal Perto. Você confere tudo antes de gravar.</p>
      </div>

      <div className="rounded-xl border border-slate-200 p-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-hover">
            <Users size={20} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Seus primeiros alunos</p>
            <p className="text-xs text-slate-600">{textoProgresso(total)}</p>
          </div>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={Math.min(total, 3)}
          aria-label="Alunos cadastrados"
        >
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percentualAtivacao(total)}%` }} />
        </div>
        <Link to={ROTA_IMPORTAR} onClick={ir} className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white active:bg-brand-hover">
          <Users size={18} aria-hidden /> Adicionar meus alunos
        </Link>
      </div>

      <div className="space-y-2">
        <Link to={ROTA_IMPORTAR_COM_IA} onClick={ir} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-300 px-3 py-2 active:bg-slate-50">
          <Sparkles size={18} className="shrink-0 text-brand-hover" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Colar uma lista com ajuda de IA</span>
            <span className="block text-xs text-slate-600">Organize nomes e contatos antes de importar</span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden />
        </Link>
        <Link to={ROTA_IMPORTAR_COM_PLANILHA} onClick={ir} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-300 px-3 py-2 active:bg-slate-50">
          <FileSpreadsheet size={18} className="shrink-0 text-brand-hover" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Importar planilha</span>
            <span className="block text-xs text-slate-600">Adicione vários de uma vez</span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={exigir(() => navigate('/alunos/novo'))}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-300 px-3 py-2 text-left active:bg-slate-50"
        >
          <UserPlus size={18} className="shrink-0 text-brand-hover" aria-hidden />
          <span className="min-w-0 flex-1 text-sm font-semibold">Cadastrar um aluno</span>
          <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden />
        </button>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Sua rotina</h3>
        <p className="mb-2 text-xs text-slate-600">Depois de adicionar seus alunos, você poderá organizar aulas e treinos.</p>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          <Link to="/agenda" className="flex min-h-12 items-center gap-3 px-3 py-2 active:bg-slate-50">
            <CalendarDays size={18} className="shrink-0 text-slate-500" aria-hidden />
            <span className="flex-1 text-sm font-medium">Agenda</span>
            <span className="text-xs text-slate-600">{aulas === 0 ? 'Nenhuma aula hoje' : plural(aulas, 'aula hoje', 'aulas hoje')}</span>
          </Link>
          <Link to="/meus-treinos/planejados" className="flex min-h-12 items-center gap-3 px-3 py-2 active:bg-slate-50">
            <ClipboardList size={18} className="shrink-0 text-slate-500" aria-hidden />
            <span className="flex-1 text-sm font-medium">Treinos planejados</span>
            <span className="text-xs text-slate-600">{treinos === 0 ? 'Nenhum criado' : plural(treinos, 'criado', 'criados')}</span>
          </Link>
        </div>
      </div>

      <Button variant="ghost" className="w-full text-slate-600" onClick={dispensar}>
        Agora não
      </Button>
    </section>
  )
}
