import { useState } from 'react'
import { CalendarOff, Pause, Pencil, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAlunos } from '@/features/alunos/api'
import { nomeDiaCurtoPorWeekday } from '@/lib/datas'
import { agruparHorarios, type GrupoHorario } from './horarioGrupo'
import { HorarioFormSheet, type HorarioFormValor } from './HorarioFormSheet'
import { useAtualizarGrupoHorario, useCriarHorario, useEncerrarGrupoHorario, useHorariosDoAluno, useHorariosFixos, usePausarGrupoHorario } from './api'

function descricaoGrupo(g: GrupoHorario): string {
  const dias = g.weekdays.map(nomeDiaCurtoPorWeekday).join(' e ')
  const partes = [dias, g.start_time, `${g.duration_min} min`]
  if (g.local) partes.push(g.local)
  return partes.join(' · ')
}

export function HorariosFixosBlock({ alunoId }: { alunoId: string }) {
  const { data: linhas } = useHorariosDoAluno(alunoId)
  const { data: todosHorarios } = useHorariosFixos()
  const { data: alunos } = useAlunos()
  const criar = useCriarHorario()
  const atualizar = useAtualizarGrupoHorario()
  const pausar = usePausarGrupoHorario()
  const encerrar = useEncerrarGrupoHorario()

  const [novoAberto, setNovoAberto] = useState(false)
  const [editando, setEditando] = useState<GrupoHorario | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const grupos = agruparHorarios(linhas ?? []).filter((g) => g.active && (!g.valid_until || g.valid_until >= new Date().toISOString().slice(0, 10)))
  const outrosAlunos = alunos?.filter((a) => a.id !== alunoId).map((a) => ({ id: a.id, name: a.name, birth_date: a.birth_date, phone: a.phone })) ?? []

  const salvarNovo = (v: HorarioFormValor) => {
    setErro(null)
    criar.mutate(
      { weekdays: v.weekdays, start_time: v.start_time, duration_min: v.duration_min, local: v.local.trim() || null, alunoIds: [alunoId, ...v.coParticipantesIds] },
      { onSuccess: () => setNovoAberto(false), onError: (e) => setErro((e as Error).message) },
    )
  }

  const salvarEdicao = (v: HorarioFormValor) => {
    if (!editando) return
    setErro(null)
    atualizar.mutate(
      { ids: editando.ids, start_time: v.start_time, duration_min: v.duration_min, local: v.local.trim() || null, alunoIds: [alunoId, ...v.coParticipantesIds] },
      { onSuccess: () => setEditando(null), onError: (e) => setErro((e as Error).message) },
    )
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Horários fixos</h2>
        <Button variant="ghost" onClick={() => setNovoAberto(true)} aria-label="Novo horário fixo">
          <Plus size={18} />
        </Button>
      </div>

      {grupos.length === 0 && <p className="text-sm text-slate-500">Nenhum horário fixo cadastrado.</p>}

      <ul className="divide-y divide-slate-100">
        {grupos.map((g) => (
          <li key={g.ids.join(',')} className="flex items-center justify-between gap-2 py-2">
            <p className="text-sm">{descricaoGrupo(g)}</p>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => setEditando(g)}
                className="flex size-9 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100"
                aria-label="Editar horário"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => pausar.mutate({ ids: g.ids, active: !g.active })}
                disabled={pausar.isPending}
                className="flex size-9 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100"
                aria-label={g.active ? 'Pausar horário' : 'Retomar horário'}
              >
                {g.active ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={() => {
                  if (confirm('Encerrar este horário fixo? Ele deixa de gerar novas aulas a partir de hoje.')) encerrar.mutate({ ids: g.ids })
                }}
                disabled={encerrar.isPending}
                className="flex size-9 items-center justify-center rounded-lg text-red-600 active:bg-slate-100"
                aria-label="Encerrar horário"
              >
                <CalendarOff size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <HorarioFormSheet
        open={novoAberto}
        onClose={() => setNovoAberto(false)}
        title="Novo horário fixo"
        outrosAlunos={outrosAlunos}
        outrosHorarios={todosHorarios}
        onSalvar={salvarNovo}
        salvando={criar.isPending}
      />

      <HorarioFormSheet
        open={!!editando}
        onClose={() => setEditando(null)}
        title="Editar horário fixo"
        diasEditaveis={false}
        outrosAlunos={outrosAlunos}
        outrosHorarios={todosHorarios?.filter((h) => !editando?.ids.includes(h.id))}
        valorInicial={
          editando
            ? {
                weekdays: editando.weekdays,
                start_time: editando.start_time,
                duration_min: editando.duration_min,
                local: editando.local ?? '',
                coParticipantesIds: editando.aluno_ids.filter((id) => id !== alunoId),
              }
            : undefined
        }
        onSalvar={salvarEdicao}
        salvando={atualizar.isPending}
      />
    </div>
  )
}
