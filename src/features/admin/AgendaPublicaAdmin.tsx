import { ListaSkeleton } from '@/components/Skeleton'
import { mapearErroSupabase } from '@/lib/erros'
import { rotuloTempo, taxaDeAprovacao } from '@/features/agenda/resumoPublica'
import { useAdminAgendaPublica } from './api'

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-lg font-bold leading-tight text-slate-900">{valor}</p>
      <p className="text-xs text-slate-600">{rotulo}</p>
    </div>
  )
}

/** Uso da página pública da agenda: só totais (quantos personais, quantos pedidos, aulas realizadas). Nada de visitante ou aluno. */
export function AgendaPublicaAdmin() {
  const { data, isLoading, error } = useAdminAgendaPublica()
  const taxa = data ? taxaDeAprovacao(data.aprovados30d, data.respondidos30d) : null
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="admin-agenda-publica">
      <h3 id="admin-agenda-publica" className="text-sm font-semibold text-slate-600">
        Página pública da agenda
      </h3>
      <p className="mb-3 text-xs text-slate-500">Totais de uso. Não mostra quem pediu aula. Pedidos que não viram aula são apagados em 30 dias; por isso as janelas são de 7 e 30 dias.</p>
      {isLoading && <ListaSkeleton linhas={2} />}
      {error && <p className="text-sm text-red-600">{mapearErroSupabase(error)}</p>}
      {data && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Numero valor={String(data.personaisComPagina)} rotulo="personais com a página ligada" />
          <Numero valor={String(data.personaisComPedidos30d)} rotulo="receberam pedido em 30 dias" />
          <Numero valor={`${data.pedidos7d} / ${data.pedidos30d}`} rotulo="pedidos em 7 / 30 dias" />
          <Numero valor={taxa === null ? '–' : `${taxa}%`} rotulo={`pedidos respondidos que viraram aula (${data.aprovados30d} de ${data.respondidos30d})`} />
          <Numero valor={rotuloTempo(data.medianaRespostaMin)} rotulo="tempo típico de resposta" />
          <Numero valor={String(data.aulasRealizadas)} rotulo="aulas realizadas vindas do link" />
        </div>
      )}
    </section>
  )
}
