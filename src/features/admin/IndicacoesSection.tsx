import { AlertTriangle } from 'lucide-react'
import { ListaSkeleton } from '@/components/Skeleton'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarInfoGlobal } from '@/components/Toast'
import { mapearErroSupabase } from '@/lib/erros'
import { formatarDataBR } from '@/lib/format'
import { useAdminIndicacoes, useAdminRevogarIndicacao } from './api'
import { ROTULO_STATUS_INDICACAO, sinaisDeAbuso, type IndicacaoLinha } from './indicacoes'

function Cartao({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-accent">{valor}</p>
      {nota && <p className="mt-1 text-xs text-slate-500">{nota}</p>}
    </div>
  )
}

const data = (iso: string | null) => (iso ? formatarDataBR(iso.slice(0, 10)) : '—')

function Sinais({ lista }: { lista: string[] }) {
  if (lista.length === 0) return null
  return (
    <ul className="mt-1 space-y-0.5">
      {lista.map((s) => (
        <li key={s} className="flex gap-1 text-xs font-medium text-amber-800">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden /> {s}
        </li>
      ))}
    </ul>
  )
}

/** Programa de indicação: quanto foi concedido, quem mais indica e sinais de abuso. Só nomes de personais e números (nunca dado de aluno). */
export function IndicacoesSection() {
  const { data: painel, isLoading, error } = useAdminIndicacoes()
  const revogar = useAdminRevogarIndicacao()

  if (isLoading) return <ListaSkeleton linhas={3} />
  if (error) return <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>
  if (!painel) return null
  const t = painel.totais

  const pedirRevogar = async (l: IndicacaoLinha) => {
    const ok = await confirmarAcao({
      titulo: 'Revogar indicação',
      mensagem: `Tira o mês grátis de ${l.indicado_nome || 'quem foi indicado'}${l.indicador_ganhou ? ` e de ${l.indicador_nome || 'quem indicou'}` : ''}. Use só em caso de fraude ou abuso (Termos 2.7). Fica registrado no histórico de ações.`,
      textoConfirmar: 'Revogar',
      destrutivo: true,
    })
    if (!ok) return
    revogar.mutate(l.id, {
      onSuccess: () => mostrarInfoGlobal('Indicação revogada.'),
      onError: (e) => mostrarInfoGlobal(mapearErroSupabase(e)),
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold text-accent">Programa de indicação</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Indicações" valor={String(t.indicacoes)} nota={`${t.pendentes} em andamento`} />
        <Cartao titulo="Concedidas" valor={String(t.concedidas)} nota={`${t.revogadas} revogadas`} />
        <Cartao titulo="Meses grátis dados" valor={String(t.meses_concedidos)} nota="Indicado + indicador (teto de 6 por indicador)" />
        <Cartao titulo="Com sinal de abuso" valor={String(t.com_sinal)} nota="Veja a lista abaixo" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-semibold">Quem mais indica</h3>
        {painel.por_indicador.length === 0 ? (
          <p className="text-sm text-slate-500">Ninguém indicou ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {painel.por_indicador.map((l) => (
              <li key={l.indicador_id} className="py-2">
                <p className="text-sm">
                  <strong>{l.nome || '—'}</strong>: {l.indicados} {l.indicados === 1 ? 'indicado' : 'indicados'} · {l.concedidas} concluídas · {l.meses_ganhos} meses ganhos
                  {l.revogadas > 0 && ` · ${l.revogadas} revogadas`}
                </p>
                <Sinais lista={sinaisDeAbuso(l)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-semibold">Mais recentes</h3>
        {painel.recentes.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma indicação registrada.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {painel.recentes.map((l) => (
              <li key={l.id} className="py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm">
                    <strong>{l.indicador_nome || '—'}</strong> indicou <strong>{l.indicado_nome || '—'}</strong>
                    <span className="block text-xs text-slate-500">
                      {ROTULO_STATUS_INDICACAO[l.status]} · criada em {data(l.created_at)}
                      {l.concedida_em && ` · concedida em ${data(l.concedida_em)}`} · {l.alunos_do_indicado} {l.alunos_do_indicado === 1 ? 'aluno' : 'alunos'} cadastrados
                    </span>
                    <Sinais lista={sinaisDeAbuso(l)} />
                  </p>
                  {l.status === 'concedida' && (
                    <button
                      type="button"
                      onClick={() => pedirRevogar(l)}
                      disabled={revogar.isPending}
                      className="min-h-11 shrink-0 rounded-xl border border-red-300 px-3 text-sm font-medium text-red-700 active:bg-red-50"
                    >
                      Revogar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-slate-500">O painel mostra nomes de personais e números. Não mostra dados de alunos nem e-mail ou CPF de ninguém.</p>
    </div>
  )
}
