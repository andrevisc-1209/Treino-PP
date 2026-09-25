import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MoreVertical, Play, Plus } from 'lucide-react'
import { useModelos, buscarItensComparaveisModelo, type Modelo } from '@/features/modelos/api'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { sugerirNomeDuplicado } from '@/lib/nomes'
import { itensIguais } from './compare'
import { PlanoOrigemBadge } from './PlanoOrigemBadge'
import {
  useAtualizarPlano,
  useCriarPlano,
  useCriarPlanoDeModelo,
  useDuplicarPlano,
  useExcluirPlano,
  usePlanos,
  useSalvarPlanoComoModelo,
  useSincronizarPlanoComModelo,
  buscarItensComparaveisPlano,
  type Plano,
} from './api'

export function PlanosTab({ alunoId }: { alunoId: string }) {
  const navigate = useNavigate()
  const { data: planos, isLoading, error } = usePlanos(alunoId)
  const { data: modelos } = useModelos()
  const criar = useCriarPlano(alunoId)
  const criarDeModelo = useCriarPlanoDeModelo(alunoId)
  const atualizar = useAtualizarPlano(alunoId)
  const duplicar = useDuplicarPlano(alunoId)
  const excluir = useExcluirPlano(alunoId)
  const salvarComoModelo = useSalvarPlanoComoModelo()
  const sincronizar = useSincronizarPlanoComModelo(alunoId)

  const [novoEtapa, setNovoEtapa] = useState<'escolha' | 'modelo' | 'nome' | null>(null)
  const [nomeNovo, setNomeNovo] = useState('')
  const [erroNovo, setErroNovo] = useState<string | null>(null)
  const [verificandoModelo, setVerificandoModelo] = useState(false)
  const [conflitoModelo, setConflitoModelo] = useState<{ modelo: Modelo; planoExistente: Plano } | null>(null)

  const [renomeando, setRenomeando] = useState<Plano | null>(null)
  const [nome, setNome] = useState('')
  const [notas, setNotas] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const [menuPlano, setMenuPlano] = useState<Plano | null>(null)
  const [duplicando, setDuplicando] = useState<Plano | null>(null)
  const [nomeDuplicado, setNomeDuplicado] = useState('')
  const [erroDuplicado, setErroDuplicado] = useState<string | null>(null)

  const abrirDuplicar = (p: Plano) => {
    setMenuPlano(null)
    setDuplicando(p)
    setNomeDuplicado(sugerirNomeDuplicado(p.name, (planos ?? []).map((x) => x.name)))
    setErroDuplicado(null)
  }

  const confirmarDuplicar = () => {
    if (!duplicando) return
    if (!nomeDuplicado.trim()) {
      setErroDuplicado('Nome é obrigatório')
      return
    }
    duplicar.mutate(
      { plano: duplicando, novoNome: nomeDuplicado.trim() },
      { onSuccess: () => setDuplicando(null), onError: (e) => setErroDuplicado((e as Error).message) },
    )
  }

  const fecharNovo = () => {
    setNovoEtapa(null)
    setNomeNovo('')
    setErroNovo(null)
  }

  const criarDoZero = () => {
    if (!nomeNovo.trim()) {
      setErroNovo('Nome é obrigatório')
      return
    }
    criar.mutate(
      { name: nomeNovo.trim() },
      {
        onSuccess: (planoId) => {
          fecharNovo()
          navigate(`/alunos/${alunoId}/planos/${planoId}`)
        },
        onError: (e) => setErroNovo((e as Error).message),
      },
    )
  }

  const criarCopiaEAbrir = (modelo: Modelo) => {
    criarDeModelo.mutate(
      { id: modelo.id, name: modelo.name, notes: modelo.notes },
      {
        onSuccess: (planoId) => {
          fecharNovo()
          navigate(`/alunos/${alunoId}/planos/${planoId}`)
        },
      },
    )
  }

  const usarModelo = async (modelo: Modelo) => {
    if (modelo.modelo_exercicios.length === 0) return
    const existente = planos?.find((p) => p.modelo_origem_id === modelo.id)
    if (!existente) {
      criarCopiaEAbrir(modelo)
      return
    }
    setVerificandoModelo(true)
    try {
      const [itensExistente, itensModelo] = await Promise.all([
        buscarItensComparaveisPlano(existente.id),
        buscarItensComparaveisModelo(modelo.id),
      ])
      setVerificandoModelo(false)
      if (itensExistente.length === 0) {
        sincronizar.mutate(
          { planoId: existente.id, modeloId: modelo.id },
          { onSuccess: () => { fecharNovo(); navigate(`/alunos/${alunoId}/planos/${existente.id}`) } },
        )
        return
      }
      if (itensIguais(itensExistente, itensModelo)) {
        fecharNovo()
        navigate(`/alunos/${alunoId}/planos/${existente.id}`)
        return
      }
      setConflitoModelo({ modelo, planoExistente: existente })
    } catch {
      setVerificandoModelo(false)
    }
  }

  const abrirEditar = (p: Plano) => {
    setNome(p.name)
    setNotas(p.notes ?? '')
    setErro(null)
    setRenomeando(p)
    setMenuPlano(null)
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

  const excluirPlano = (p: Plano) => {
    setMenuPlano(null)
    if (!confirm(`Excluir "${p.name}"? As sessões já registradas continuam no histórico.`)) return
    excluir.mutate(p.id)
  }

  if (isLoading) return <p className="text-slate-500">Carregando…</p>
  if (error) return <p className="text-red-600">{(error as Error).message}</p>

  return (
    <div className="space-y-3">
      <Button onClick={() => setNovoEtapa('escolha')} className="w-full">
        <Plus size={18} /> Novo plano
      </Button>

      {planos?.length === 0 && <p className="text-sm text-slate-500">Nenhum plano ainda.</p>}

      <ul className="space-y-2">
        {planos?.map((p) => {
          const ordenados = [...p.plano_exercicios].sort((a, b) => a.order_index - b.order_index)
          const previa = ordenados
            .slice(0, 3)
            .map((i) => i.exercicio?.name)
            .filter(Boolean)
            .join(', ')
          const podeIniciar = p.active && p.plano_exercicios.length > 0
          return (
            <li key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Link to={`/alunos/${alunoId}/planos/${p.id}`} className="min-w-0 flex-1">
                  <p className={`font-medium ${!p.active ? 'text-slate-400' : ''}`}>
                    {p.name}
                    {!p.active && <span className="ml-2 text-xs font-normal">(inativo)</span>}
                  </p>
                  <p className="text-sm text-slate-500">
                    {p.plano_exercicios.length} exercícios{previa && ` · ${previa}`}
                  </p>
                </Link>
                {podeIniciar && (
                  <Link
                    to={`/alunos/${alunoId}/sessoes/nova?plano=${p.id}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-brand active:bg-slate-100"
                    aria-label={`Iniciar ${p.name}`}
                  >
                    <Play size={18} />
                  </Link>
                )}
                <button
                  onClick={() => setMenuPlano(p)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                  aria-label={`Mais ações para ${p.name}`}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
              <PlanoOrigemBadge plano={p} alunoId={alunoId} />
            </li>
          )
        })}
      </ul>

      <BottomSheet open={novoEtapa === 'escolha'} onClose={fecharNovo} title="Novo plano">
        <div className="space-y-2">
          <button
            onClick={() => setNovoEtapa('modelo')}
            className="w-full rounded-2xl border border-slate-200 p-4 text-left font-medium active:bg-slate-50"
          >
            Usar um treino planejado
          </button>
          <button
            onClick={() => setNovoEtapa('nome')}
            className="w-full rounded-2xl border border-slate-200 p-4 text-left font-medium active:bg-slate-50"
          >
            Criar do zero
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={novoEtapa === 'modelo'} onClose={fecharNovo} title="Escolher treino planejado">
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {modelos?.map((m) => {
            const vazio = m.modelo_exercicios.length === 0
            if (vazio) {
              return (
                <li key={m.id}>
                  <Link to={`/meus-treinos/planejados/${m.id}`} onClick={fecharNovo} className="block rounded-xl px-3 py-3 opacity-70 active:bg-slate-100">
                    <p className="font-medium text-slate-400">{m.name}</p>
                    <span className="text-sm font-medium text-brand-dark">Sem exercícios · toque para montar</span>
                  </Link>
                </li>
              )
            }
            return (
              <li key={m.id}>
                <button
                  onClick={() => usarModelo(m)}
                  disabled={criarDeModelo.isPending || verificandoModelo || sincronizar.isPending}
                  className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100 disabled:opacity-50"
                >
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-slate-500">{m.modelo_exercicios.length} exercícios</p>
                </button>
              </li>
            )
          })}
          {modelos?.length === 0 && <p className="p-3 text-sm text-slate-500">Nenhum treino planejado cadastrado ainda.</p>}
        </ul>
      </BottomSheet>

      <BottomSheet open={!!conflitoModelo} onClose={() => setConflitoModelo(null)} title={conflitoModelo?.modelo.name}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            O treino do aluno ("{conflitoModelo?.planoExistente.name}", {conflitoModelo?.planoExistente.plano_exercicios.length}{' '}
            {conflitoModelo?.planoExistente.plano_exercicios.length === 1 ? 'exercício' : 'exercícios'}) tem ajustes diferentes da versão atual
            do treino planejado ({conflitoModelo?.modelo.modelo_exercicios.length}{' '}
            {conflitoModelo?.modelo.modelo_exercicios.length === 1 ? 'exercício' : 'exercícios'}). O que fazer?
          </p>
          <button
            onClick={() => {
              const c = conflitoModelo
              setConflitoModelo(null)
              if (c) {
                fecharNovo()
                navigate(`/alunos/${alunoId}/planos/${c.planoExistente.id}`)
              }
            }}
            className="w-full rounded-2xl border border-slate-200 p-4 text-left active:bg-slate-50"
          >
            <p className="font-medium">Usar o treino do aluno</p>
            <p className="text-sm text-slate-500">Mantém os ajustes que já foram feitos pra esse aluno, sem mudar nada.</p>
          </button>
          <button
            onClick={() => {
              const c = conflitoModelo
              setConflitoModelo(null)
              if (c) {
                sincronizar.mutate(
                  { planoId: c.planoExistente.id, modeloId: c.modelo.id },
                  { onSuccess: () => { fecharNovo(); navigate(`/alunos/${alunoId}/planos/${c.planoExistente.id}`) } },
                )
              }
            }}
            className="w-full rounded-2xl border border-slate-200 p-4 text-left active:bg-slate-50"
          >
            <p className="font-medium">Atualizar com o treino planejado</p>
            <p className="text-sm text-slate-500">Substitui os exercícios do aluno pelos do treino planejado atual. Os ajustes dele se perdem.</p>
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={novoEtapa === 'nome'} onClose={fecharNovo} title="Criar do zero">
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} autoFocus placeholder="Treino A" />
          </Field>
          {erroNovo && <p className="text-sm text-red-600">{erroNovo}</p>}
          <Button onClick={criarDoZero} className="w-full" disabled={criar.isPending}>
            Criar e editar
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!menuPlano} onClose={() => setMenuPlano(null)} title={menuPlano?.name}>
        <div className="space-y-1">
          <button onClick={() => menuPlano && abrirEditar(menuPlano)} className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100">
            Editar
          </button>
          <button
            onClick={() => menuPlano && abrirDuplicar(menuPlano)}
            className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
          >
            Duplicar
          </button>
          <button
            onClick={() => {
              if (menuPlano) salvarComoModelo.mutate({ id: menuPlano.id, name: menuPlano.name, notes: menuPlano.notes })
              setMenuPlano(null)
            }}
            className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
          >
            Salvar como treino planejado
          </button>
          <button
            onClick={() => {
              if (menuPlano) atualizar.mutate({ id: menuPlano.id, active: !menuPlano.active })
              setMenuPlano(null)
            }}
            className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
          >
            {menuPlano?.active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            onClick={() => menuPlano && excluirPlano(menuPlano)}
            className="w-full rounded-xl px-3 py-3 text-left text-red-600 active:bg-slate-100"
          >
            Excluir
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!duplicando} onClose={() => setDuplicando(null)} title="Duplicar treino">
        <div className="space-y-4">
          <Field label="Nome do novo treino">
            <Input value={nomeDuplicado} onChange={(e) => setNomeDuplicado(e.target.value)} autoFocus />
          </Field>
          {erroDuplicado && <p className="text-sm text-red-600">{erroDuplicado}</p>}
          <Button onClick={confirmarDuplicar} className="w-full" disabled={duplicar.isPending}>
            Duplicar
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!renomeando} onClose={() => setRenomeando(null)} title="Editar plano">
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
