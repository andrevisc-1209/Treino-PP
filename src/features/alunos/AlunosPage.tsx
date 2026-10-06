import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, MoreVertical, Search, TriangleAlert, Users } from 'lucide-react'
import { cn, desambiguarPorNome, idade } from '@/lib/utils'
import { BottomSheet, Fab, Input } from '@/components/ui'
import { LinkConfiguracoes } from '@/components/LinkConfiguracoes'
import { CardMetrica } from '@/components/CardMetrica'
import { InstallBanner } from '@/components/InstallBanner'
import { Avatar } from '@/components/Avatar'
import { mapearErroSupabase } from '@/lib/erros'
import { ListaSkeleton } from '@/components/Skeleton'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarDesfazer } from '@/components/UndoToast'
import { useAlunosComCobranca } from '@/features/financeiro/api'
import { useAlunos, useAlunosArquivados, useApagarAluno, useArquivarAluno, useDesarquivarAluno, type Aluno } from './api'
import { useAlunosSemTreinoRecente, useTreinosEstaSemana } from './useMetricas'

export function AlunosPage() {
  const [aba, setAba] = useState<'ativos' | 'arquivados'>('ativos')
  const { data: alunosAtivos, isLoading, error } = useAlunos()
  const { data: alunosArquivados, isLoading: carregandoArquivados } = useAlunosArquivados()
  const { data: alunosComCobranca } = useAlunosComCobranca()
  const { data: treinosEstaSemana } = useTreinosEstaSemana()
  const { data: semTreinoRecente } = useAlunosSemTreinoRecente()
  const [busca, setBusca] = useState('')
  const [menuAberto, setMenuAberto] = useState<Aluno | null>(null)

  const arquivar = useArquivarAluno()
  const desarquivar = useDesarquivarAluno()
  const apagar = useApagarAluno()

  const alunos = aba === 'ativos' ? alunosAtivos : alunosArquivados
  const idsComCobranca = new Set((alunosComCobranca ?? []).map((c) => c.aluno_id))

  const filtrados = alunos?.filter((a) => a.name.toLowerCase().includes(busca.trim().toLowerCase()))
  const desambiguar = desambiguarPorNome(alunos ?? [])

  const arquivarAluno = (a: Aluno) => {
    setMenuAberto(null)
    arquivar.mutate(a.id, {
      onSuccess: () => mostrarDesfazer(`${a.name} foi arquivado.`, () => desarquivar.mutate(a.id)),
    })
  }

  const restaurarAluno = (a: Aluno) => {
    setMenuAberto(null)
    desarquivar.mutate(a.id)
  }

  const apagarAluno = async (a: Aluno) => {
    setMenuAberto(null)
    const ok = await confirmarAcao({
      titulo: 'Apagar aluno',
      mensagem: `Tem certeza? Isso apaga ${a.name} e todo o histórico (treinos, sessões, avaliações). Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Apagar',
      destrutivo: true,
    })
    if (!ok) return
    apagar.mutate(a.id)
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus alunos</h1>
        <LinkConfiguracoes />
      </header>

      <InstallBanner />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <CardMetrica icone={<Users size={16} />} valor={alunosAtivos?.length} label="Alunos ativos" />
        <CardMetrica icone={<CalendarCheck size={16} />} valor={treinosEstaSemana} label="Treinos essa semana" />
        <CardMetrica icone={<TriangleAlert size={16} />} valor={semTreinoRecente} label="Sem treino há +7 dias" alerta={(semTreinoRecente ?? 0) > 0} />
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setAba('ativos')}
          className={cn('flex-1 rounded-lg py-2 text-sm font-medium', aba === 'ativos' ? 'bg-white shadow-sm' : 'text-slate-500')}
        >
          Ativos
        </button>
        <button
          onClick={() => setAba('arquivados')}
          className={cn('flex-1 rounded-lg py-2 text-sm font-medium', aba === 'arquivados' ? 'bg-white shadow-sm' : 'text-slate-500')}
        >
          Arquivados
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar aluno por nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {(aba === 'ativos' ? isLoading : carregandoArquivados) && <ListaSkeleton />}
      {error && <p className="text-red-600">{mapearErroSupabase(error)}</p>}
      {alunos?.length === 0 && aba === 'ativos' && <p className="text-slate-500">Nenhum aluno ainda. Toque no + para cadastrar o primeiro.</p>}
      {alunos?.length === 0 && aba === 'arquivados' && <p className="text-slate-500">Nenhum aluno arquivado.</p>}
      {alunos && alunos.length > 0 && filtrados?.length === 0 && (
        <p className="text-slate-500">Nenhum aluno encontrado para "{busca}".</p>
      )}

      <ul className="space-y-2">
        {filtrados?.map((a) => (
          <li key={a.id} className="flex items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <Link to={`/alunos/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar id={a.id} nome={a.name} />
              <div className="min-w-0">
                <p className="font-medium">
                  {a.name}
                  {desambiguar(a) && <span className="ml-1 font-normal text-slate-400">· {desambiguar(a)}</span>}
                </p>
                <p className="text-sm text-slate-500">
                  {[idade(a.birth_date) != null && `${idade(a.birth_date)} anos`, a.injury && 'lesão'].filter(Boolean).join(' · ') ||
                    'Ficha incompleta'}
                  {aba === 'ativos' && !idsComCobranca.has(a.id) && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Sem valor definido</span>
                  )}
                </p>
                {a.objetivos[0] && <p className="truncate text-xs text-slate-400">{a.objetivos[0]}</p>}
              </div>
            </Link>
            <button
              onClick={() => setMenuAberto(a)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
              aria-label={`Mais ações para ${a.name}`}
            >
              <MoreVertical size={18} />
            </button>
          </li>
        ))}
      </ul>

      {aba === 'ativos' && <Fab to="/alunos/novo" label="Novo aluno" />}

      <BottomSheet open={!!menuAberto} onClose={() => setMenuAberto(null)} title={menuAberto?.name}>
        <div className="space-y-1">
          {aba === 'ativos' ? (
            <button
              onClick={() => menuAberto && arquivarAluno(menuAberto)}
              disabled={arquivar.isPending}
              className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
            >
              Arquivar
            </button>
          ) : (
            <button
              onClick={() => menuAberto && restaurarAluno(menuAberto)}
              disabled={desarquivar.isPending}
              className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
            >
              Restaurar
            </button>
          )}
          <button
            onClick={() => menuAberto && apagarAluno(menuAberto)}
            disabled={apagar.isPending}
            className="w-full rounded-xl px-3 py-3 text-left text-red-600 active:bg-slate-100"
          >
            Apagar
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
