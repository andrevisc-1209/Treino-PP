import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MoreVertical, Plus } from 'lucide-react'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { ExerciciosTabs } from '@/components/ExerciciosTabs'
import { useAtualizarModelo, useCriarModelo, useDuplicarModelo, useExcluirModelo, useModelos, type Modelo } from './api'

export function ModelosPage() {
  const navigate = useNavigate()
  const { data: modelos, isLoading, error } = useModelos()
  const criar = useCriarModelo()
  const atualizar = useAtualizarModelo()
  const duplicar = useDuplicarModelo()
  const excluir = useExcluirModelo()

  const [criando, setCriando] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [erroNovo, setErroNovo] = useState<string | null>(null)

  const [renomeando, setRenomeando] = useState<Modelo | null>(null)
  const [nome, setNome] = useState('')
  const [notas, setNotas] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const [menuAberto, setMenuAberto] = useState<Modelo | null>(null)

  const abrirNovo = () => {
    setNomeNovo('')
    setErroNovo(null)
    setCriando(true)
  }

  const confirmarNovo = () => {
    if (!nomeNovo.trim()) {
      setErroNovo('Nome é obrigatório')
      return
    }
    criar.mutate(
      { name: nomeNovo.trim() },
      {
        onSuccess: (id) => {
          setCriando(false)
          navigate(`/meus-treinos/planejados/${id}?adicionar=1`)
        },
        onError: (e) => setErroNovo((e as Error).message),
      },
    )
  }

  const abrirEditar = (m: Modelo) => {
    setNome(m.name)
    setNotas(m.notes ?? '')
    setErro(null)
    setRenomeando(m)
    setMenuAberto(null)
  }

  const salvarRenome = () => {
    if (!nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    if (!renomeando) return
    atualizar.mutate(
      { id: renomeando.id, name: nome.trim(), notes: notas.trim() },
      { onSuccess: () => setRenomeando(null), onError: (e) => setErro((e as Error).message) },
    )
  }

  const excluirModelo = (m: Modelo) => {
    setMenuAberto(null)
    if (!confirm(`Excluir o treino planejado "${m.name}"? Os planos já criados a partir dele não são afetados.`)) return
    excluir.mutate(m.id)
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Treinos planejados</h1>
        <Button onClick={abrirNovo} aria-label="Novo treino planejado" className="px-3">
          <Plus size={20} />
        </Button>
      </header>

      <ExerciciosTabs />

      {isLoading && <p className="text-slate-500">Carregando…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
      {modelos?.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum treino planejado ainda. Crie treinos planejados para aplicar aos alunos.</p>
      )}

      <ul className="space-y-2">
        {modelos?.map((m) => {
          const ordenados = [...m.modelo_exercicios].sort((a, b) => a.order_index - b.order_index)
          const previa = ordenados
            .slice(0, 3)
            .map((i) => i.exercicio?.name)
            .filter(Boolean)
            .join(', ')
          const vazio = m.modelo_exercicios.length === 0
          return (
            <li key={m.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Link to={`/meus-treinos/planejados/${m.id}`} className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  {vazio ? (
                    <p className="text-sm font-medium text-brand-dark">Nenhum exercício · toque para adicionar</p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {m.modelo_exercicios.length} exercícios{previa && ` · ${previa}`}
                    </p>
                  )}
                </Link>
                <button
                  onClick={() => setMenuAberto(m)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                  aria-label={`Mais ações para ${m.name}`}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <BottomSheet open={criando} onClose={() => setCriando(false)} title="Novo treino planejado">
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} autoFocus placeholder="Full body A" />
          </Field>
          {erroNovo && <p className="text-sm text-red-600">{erroNovo}</p>}
          <Button onClick={confirmarNovo} className="w-full" disabled={criar.isPending}>
            Criar e adicionar exercícios
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!menuAberto} onClose={() => setMenuAberto(null)} title={menuAberto?.name}>
        <div className="space-y-1">
          <button onClick={() => menuAberto && abrirEditar(menuAberto)} className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100">
            Editar
          </button>
          <button
            onClick={() => {
              if (menuAberto) duplicar.mutate(menuAberto)
              setMenuAberto(null)
            }}
            disabled={duplicar.isPending}
            className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
          >
            Duplicar
          </button>
          <button
            onClick={() => menuAberto && excluirModelo(menuAberto)}
            disabled={excluir.isPending}
            className="w-full rounded-xl px-3 py-3 text-left text-red-600 active:bg-slate-100"
          >
            Excluir
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!renomeando} onClose={() => setRenomeando(null)} title="Editar treino planejado">
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </Field>
          <Field label="Observações">
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={salvarRenome} className="w-full" disabled={atualizar.isPending}>
            Salvar
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
