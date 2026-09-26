import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatarDataCompleta, hojeSP } from '@/lib/datas'
import { AulaAcoesSheet } from './AulaAcoesSheet'
import { mapearErroSupabase } from '@/lib/erros'
import { ListaSkeleton } from '@/components/Skeleton'
import { AulaCard } from './AulaCard'
import { NovaAulaAvulsaSheet } from './NovaAulaAvulsaSheet'
import { useAulasDoDia, useGerarAulasDiarias, type Aula } from './api'

export function HojePage() {
  useGerarAulasDiarias()
  const navigate = useNavigate()
  const hoje = hojeSP()
  const { data: aulas, isLoading, error } = useAulasDoDia(hoje)
  const [aulaAberta, setAulaAberta] = useState<Aula | null>(null)
  const [passoInicial, setPassoInicial] = useState<'menu' | 'iniciar'>('menu')
  const [novaAulaAberta, setNovaAulaAberta] = useState(false)

  const [agora] = useState(() => Date.now())
  const proximaId = useMemo(() => {
    const proxima = aulas?.find((a) => a.status === 'agendada' && new Date(a.starts_at).getTime() >= agora)
    return proxima?.id
  }, [aulas, agora])

  // Aulas ainda por vir primeiro (na ordem em que já vêm do banco); realizadas
  // e canceladas ficam esmaecidas no fim da lista, sem competir por atenção.
  const aulasOrdenadas = useMemo(() => {
    if (!aulas) return aulas
    const pendentes = aulas.filter((a) => a.status === 'agendada')
    const concluidasOuCanceladas = aulas.filter((a) => a.status !== 'agendada')
    return [...pendentes, ...concluidasOuCanceladas]
  }, [aulas])

  const concluidas = aulas?.filter((a) => a.status === 'realizada').length ?? 0

  const abrirMenu = (a: Aula) => {
    setPassoInicial('menu')
    setAulaAberta(a)
  }

  const comecar = (a: Aula) => {
    const previstos = a.aula_participantes.filter((p) => p.status === 'previsto')
    if (previstos.length === 1) {
      navigate(`/alunos/${previstos[0].aluno_id}/sessoes/nova?aula=${a.id}`)
    } else if (previstos.length > 1) {
      setPassoInicial('iniciar')
      setAulaAberta(a)
    } else {
      abrirMenu(a)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{formatarDataCompleta(hoje)}</h1>
          {aulas && aulas.length > 0 && (
            <p className="text-sm text-slate-500">
              {aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'} · {concluidas} concluídas
            </p>
          )}
        </div>
        <Link
          to="/configuracoes"
          className="flex size-11 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100"
          aria-label="Configurações"
        >
          <Settings size={22} />
        </Link>
      </header>

      {isLoading && <ListaSkeleton />}
      {error && <p className="text-red-600">{mapearErroSupabase(error)}</p>}

      {aulas && aulas.length === 0 && (
        <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="font-semibold">Nenhuma aula hoje</p>
          <Button onClick={() => setNovaAulaAberta(true)} className="w-full">
            <Plus size={18} /> Marcar aula avulsa
          </Button>
        </div>
      )}

      {aulasOrdenadas && aulasOrdenadas.length > 0 && (
        <div className="space-y-2">
          {aulasOrdenadas.map((a) => (
            <AulaCard key={a.id} aula={a} destaque={a.id === proximaId} onClick={() => abrirMenu(a)} onComecar={() => comecar(a)} />
          ))}
        </div>
      )}

      <AulaAcoesSheet aula={aulaAberta} onClose={() => setAulaAberta(null)} passoInicial={passoInicial} />
      <NovaAulaAvulsaSheet open={novaAulaAberta} onClose={() => setNovaAulaAberta(false)} dataInicial={hoje} />
    </div>
  )
}
