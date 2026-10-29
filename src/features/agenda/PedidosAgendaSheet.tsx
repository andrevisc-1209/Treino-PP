import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { BottomSheet, Button } from '@/components/ui'
import { ListaSkeleton } from '@/components/Skeleton'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { useAlunos } from '@/features/alunos/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { mapearErroSupabase } from '@/lib/erros'
import { linkWhatsApp, linkWhatsAppComTexto } from '@/lib/whatsapp'
import { useAprovarPedido, usePedidosPendentes, useRecusarPedido } from './api'
import { alunoDoTelefone, mensagemDeAprovacao, mensagemDeRecusa, telefoneDoPedido, textoDoHorario, type PedidoAgenda } from './pedidos'

type Resposta = { tipo: 'aprovado' | 'recusado'; link: string; pedido: PedidoAgenda }

function CartaoPedido({ pedido, todos, aluno, personalNome, resposta, onResponder }: { pedido: PedidoAgenda; todos: PedidoAgenda[]; aluno: { id: string; name: string } | null; personalNome: string; resposta: Resposta | undefined; onResponder: (id: string, r: Resposta) => void }) {
  const { exigir } = useExigirAssinatura()
  const aprovar = useAprovarPedido()
  const recusar = useRecusarPedido()
  const ocupado = aprovar.isPending || recusar.isPending
  const dados = { visitanteNome: pedido.visitante_nome, personalNome, inicioISO: pedido.inicio }
  const conversa = linkWhatsApp(pedido.visitante_telefone)

  const fazerAprovar = async () => {
    try {
      const r = await aprovar.mutateAsync({ pedido, todos, alunoId: aluno?.id ?? null, local: null })
      mostrarInfoGlobal(r.novoAluno ? 'Aula marcada e aluno cadastrado. Complete a ficha dele depois.' : 'Aula marcada.')
      onResponder(pedido.id, { tipo: 'aprovado', pedido, link: linkWhatsAppComTexto(pedido.visitante_telefone, mensagemDeAprovacao(dados)) })
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }
  const fazerRecusar = async () => {
    try {
      await recusar.mutateAsync(pedido.id)
      onResponder(pedido.id, { tipo: 'recusado', pedido, link: linkWhatsAppComTexto(pedido.visitante_telefone, mensagemDeRecusa(dados)) })
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <li className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
      <div>
        <p className="font-semibold">{textoDoHorario(pedido.inicio)}</p>
        <p className="text-sm text-slate-800">
          {pedido.visitante_nome} · {telefoneDoPedido(pedido.visitante_telefone)}
        </p>
        {aluno ? <p className="text-xs text-brand-hover">Já é seu aluno: {aluno.name}</p> : <p className="text-xs text-slate-600">Ainda não é seu aluno: ao aprovar, o cadastro é criado só com nome e telefone.</p>}
        {pedido.mensagem && <p className="mt-1 rounded-xl bg-slate-50 p-2 text-sm text-slate-700">“{pedido.mensagem}”</p>}
      </div>
      {resposta ? (
        <div className="space-y-2" role="status">
          <p className="text-sm font-medium">{resposta.tipo === 'aprovado' ? 'Aula marcada.' : 'Pedido recusado.'}</p>
          <a href={resposta.link} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 px-3 text-sm font-medium text-emerald-800 active:bg-emerald-50">
            <MessageCircle size={16} aria-hidden /> {resposta.tipo === 'aprovado' ? 'Avisar no WhatsApp' : 'Avisar no WhatsApp e oferecer outros horários'}
          </a>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={exigir(() => void fazerAprovar())} disabled={ocupado} className="flex-1">
            {aprovar.isPending ? 'Marcando…' : 'Aprovar'}
          </Button>
          <Button variant="outline" onClick={exigir(() => void fazerRecusar())} disabled={ocupado} className="flex-1">
            Recusar
          </Button>
          {conversa && (
            <a href={conversa} target="_blank" rel="noopener noreferrer" aria-label={`Conversar com ${pedido.visitante_nome} no WhatsApp`} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 active:bg-slate-50">
              <MessageCircle size={16} aria-hidden /> Conversar
            </a>
          )}
        </div>
      )}
    </li>
  )
}

/** Pedidos de aula que chegaram pela página pública: aprovar marca a aula, recusar avisa por WhatsApp. O app não manda nada sozinho ao visitante. */
export function PedidosAgendaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAuth()
  const { data: perfil } = usePerfilProfissional(session?.user.id)
  const { data: pedidos, isLoading, error } = usePedidosPendentes()
  const { data: alunos } = useAlunos()
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({})

  const lista = pedidos ?? []
  // quem acabou de ser respondido sai da lista de pendentes, mas continua na tela (com o botão do WhatsApp) até fechar a folha
  const respondidos = Object.values(respostas)
    .map((r) => r.pedido)
    .filter((p) => !lista.some((x) => x.id === p.id))
  const mostrar = [...lista, ...respondidos].sort((a, b) => a.inicio.localeCompare(b.inicio))
  const fechar = () => {
    setRespostas({})
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={fechar} title="Pedidos de aula">
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Pedidos feitos pela sua página pública. Aprove para marcar a aula; os outros pedidos do mesmo horário ficam indisponíveis.</p>
        {isLoading && <ListaSkeleton linhas={2} />}
        {error && <p className="text-sm text-red-600">{mapearErroSupabase(error)}</p>}
        {pedidos && mostrar.length === 0 && <p className="py-4 text-center text-sm text-slate-600">Nenhum pedido em aberto.</p>}
        <ul className="space-y-3">
          {mostrar.map((p) => (
            <CartaoPedido
              key={p.id}
              pedido={p}
              todos={lista}
              aluno={alunoDoTelefone(alunos ?? [], p.visitante_telefone)}
              personalNome={perfil?.name ?? ''}
              resposta={respostas[p.id]}
              onResponder={(id, r) => setRespostas((x) => ({ ...x, [id]: r }))}
            />
          ))}
        </ul>
      </div>
    </BottomSheet>
  )
}
