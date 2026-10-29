import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { BottomSheet, Button, Input } from '@/components/ui'
import { ListaSkeleton } from '@/components/Skeleton'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { useAlunos } from '@/features/alunos/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { mapearErroSupabase } from '@/lib/erros'
import { linkWhatsApp, linkWhatsAppComTexto } from '@/lib/whatsapp'
import { useAprovarPedido, usePedidosPendentes, usePedidosRespondidos, useRecusarPedido } from './api'
import { esperaLonga, tempoDeEspera } from './publica'
import { cn } from '@/lib/utils'
import { alunoDoTelefone, alunosParecidos, buscarAlunosPorNome, mensagemDeAprovacao, mensagemDeRecusa, telefoneDoPedido, textoDoHorario, type PedidoAgenda } from './pedidos'

type Resposta = { tipo: 'aprovado' | 'recusado'; link: string; pedido: PedidoAgenda }

type AlunoLista = { id: string; name: string; phone: string | null }

function CartaoPedido({ pedido, aluno, alunos, personalNome, resposta, onResponder }: { pedido: PedidoAgenda; aluno: AlunoLista | null; alunos: AlunoLista[]; personalNome: string; resposta: Resposta | undefined; onResponder: (id: string, r: Resposta) => void }) {
  const { exigir } = useExigirAssinatura()
  const aprovar = useAprovarPedido()
  const recusar = useRecusarPedido()
  // sem aluno pelo telefone, o personal pode vincular o pedido a um aluno que já existe (evita cadastro duplicado)
  const [escolhido, setEscolhido] = useState<AlunoLista | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [termo, setTermo] = useState('')
  const [guardarTelefone, setGuardarTelefone] = useState(true)
  const alunoFinal = aluno ?? escolhido
  const parecidos = aluno || escolhido ? [] : alunosParecidos(alunos, pedido.visitante_nome)
  const resultados = buscando ? buscarAlunosPorNome(alunos, termo).slice(0, 6) : []
  const ocupado = aprovar.isPending || recusar.isPending
  const dados = { visitanteNome: pedido.visitante_nome, personalNome, inicioISO: pedido.inicio }
  const conversa = linkWhatsApp(pedido.visitante_telefone)

  const fazerAprovar = async () => {
    try {
      const r = await aprovar.mutateAsync({ pedido, alunoId: alunoFinal?.id ?? null, local: null, guardarTelefone: !aluno && !!escolhido && !escolhido.phone && guardarTelefone })
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
        <p className={cn('text-xs', esperaLonga(pedido.created_at) ? 'font-semibold text-red-700' : 'text-slate-600')}>
          Pedido recebido {tempoDeEspera(pedido.created_at)}
          {esperaLonga(pedido.created_at) ? ' · responda para não perder essa pessoa' : ''}
        </p>
        <p className="text-sm text-slate-800">
          {pedido.visitante_nome} · {telefoneDoPedido(pedido.visitante_telefone)}
        </p>
        {aluno && <p className="text-xs text-brand-hover">Já é seu aluno: {aluno.name}</p>}
        {!aluno && escolhido && (
          <div className="space-y-1">
            <p className="text-xs text-brand-hover">
              A aula será marcada para o aluno <strong>{escolhido.name}</strong>.{' '}
              <button type="button" onClick={() => { setEscolhido(null); setBuscando(true) }} className="min-h-11 underline">
                Trocar
              </button>
            </p>
            {!escolhido.phone && (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={guardarTelefone} onChange={(e) => setGuardarTelefone(e.target.checked)} className="size-5 accent-[#367c39]" />
                Guardar este telefone no cadastro dele
              </label>
            )}
          </div>
        )}
        {!aluno && !escolhido && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600">Ainda não é seu aluno: ao aprovar, o cadastro é criado só com nome e telefone.</p>
            {parecidos.length > 0 && !buscando && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-700">Pode ser:</span>
                {parecidos.map((a) => (
                  <button key={a.id} type="button" onClick={() => setEscolhido(a)} className="min-h-11 rounded-full border border-slate-300 px-3 text-xs font-medium text-slate-800 active:bg-slate-50">
                    {a.name}
                  </button>
                ))}
              </div>
            )}
            {!buscando ? (
              <button type="button" onClick={() => setBuscando(true)} className="min-h-11 text-sm font-medium text-brand-hover underline">
                É um aluno que já tenho
              </button>
            ) : (
              <div className="space-y-1">
                <Input placeholder="Buscar aluno pelo nome" value={termo} onChange={(e) => setTermo(e.target.value)} aria-label="Buscar aluno pelo nome" autoFocus />
                <ul className="divide-y divide-slate-100">
                  {resultados.map((a) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => { setEscolhido(a); setBuscando(false); setTermo('') }} className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm active:bg-slate-50">
                        <span className="font-medium">{a.name}</span>
                        <span className="text-xs text-slate-600">{a.phone ? a.phone : 'sem telefone'}</span>
                      </button>
                    </li>
                  ))}
                  {resultados.length === 0 && <li className="py-2 text-xs text-slate-600">Nenhum aluno com esse nome.</li>}
                </ul>
                <button type="button" onClick={() => { setBuscando(false); setTermo('') }} className="min-h-11 text-xs text-slate-700 underline">
                  Cancelar: é uma pessoa nova
                </button>
              </div>
            )}
          </div>
        )}
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
  const [aba, setAba] = useState<'pendentes' | 'aprovado' | 'recusado'>('pendentes')
  const aprovados = usePedidosRespondidos('aprovado', open && aba === 'aprovado')
  const recusados = usePedidosRespondidos('recusado', open && aba === 'recusado')

  const lista = pedidos ?? []
  // quem acabou de ser respondido sai da lista de pendentes, mas continua na tela (com o botão do WhatsApp) até fechar a folha
  const respondidos = Object.values(respostas)
    .map((r) => r.pedido)
    .filter((p) => !lista.some((x) => x.id === p.id))
  const mostrar = [...lista, ...respondidos].sort((a, b) => a.inicio.localeCompare(b.inicio))
  const fechar = () => {
    setRespostas({})
    setAba('pendentes')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={fechar} title="Pedidos de aula">
      <div className="space-y-3">
        <div className="flex gap-2" role="tablist" aria-label="Situação dos pedidos">
          {([['pendentes', `Pendentes (${lista.length})`], ['aprovado', 'Aprovados'], ['recusado', 'Recusados']] as const).map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={cn('min-h-11 rounded-full border px-4 text-sm font-medium', aba === id ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {aba === 'pendentes' && (
          <>
            <p className="text-sm text-slate-600">Pedidos feitos pela sua página pública, do mais antigo para o mais novo. Aprove para marcar a aula; os outros pedidos do mesmo horário ficam indisponíveis.</p>
            {isLoading && <ListaSkeleton linhas={2} />}
            {error && <p className="text-sm text-red-600">{mapearErroSupabase(error)}</p>}
            {pedidos && mostrar.length === 0 && <p className="py-4 text-center text-sm text-slate-600">Nenhum pedido em aberto.</p>}
            <ul className="space-y-3">
              {mostrar.map((p) => (
                <CartaoPedido
                  key={p.id}
                  pedido={p}
                  aluno={alunoDoTelefone(alunos ?? [], p.visitante_telefone)}
                  alunos={alunos ?? []}
                  personalNome={perfil?.name ?? ''}
                  resposta={respostas[p.id]}
                  onResponder={(id, r) => setRespostas((x) => ({ ...x, [id]: r }))}
                />
              ))}
            </ul>
          </>
        )}

        {aba !== 'pendentes' && (
          <>
            <p className="text-sm text-slate-600">{aba === 'aprovado' ? 'Pedidos aprovados nos últimos 30 dias.' : 'Pedidos recusados ou que ficaram indisponíveis nos últimos 30 dias.'}</p>
            {(aba === 'aprovado' ? aprovados : recusados).isLoading && <ListaSkeleton linhas={2} />}
            {(aba === 'aprovado' ? aprovados : recusados).data?.length === 0 && <p className="py-4 text-center text-sm text-slate-600">Nenhum pedido aqui.</p>}
            <ul className="space-y-2">
              {((aba === 'aprovado' ? aprovados : recusados).data ?? []).map((p) => (
                <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="font-medium">{textoDoHorario(p.inicio)}</p>
                  <p className="text-sm text-slate-700">
                    {p.visitante_nome} · {telefoneDoPedido(p.visitante_telefone)}
                  </p>
                  <p className="text-xs text-slate-600">Pedido recebido {tempoDeEspera(p.created_at)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
