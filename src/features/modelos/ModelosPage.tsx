import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'
import { BottomSheet, Button, Fab, Field, Input } from '@/components/ui'
import { LinkConfiguracoes } from '@/components/LinkConfiguracoes'
import { ExerciciosTabs } from '@/components/ExerciciosTabs'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mapearErroSupabase } from '@/lib/erros'
import { ListaSkeleton } from '@/components/Skeleton'
import { sugerirNomeDuplicado } from '@/lib/nomes'
import { ModalidadeForm } from '@/features/planos/ModalidadeForm'
import {
  blocosDe,
  exerciciosLivresDe,
  validarBlocos,
  type BlocoTreino,
  MODALIDADES_CONFIG,
  montarDetalhes,
  resumoModalidade,
  valoresDoFormulario,
  type ExercicioLivre,
  type ModalidadeTipo,
  type TipoExecucao,
} from '@/types/modalidades'
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
  const [modalidadeNova, setModalidadeNova] = useState<ModalidadeTipo>('musculacao')
  const [execucaoNova, setExecucaoNova] = useState<TipoExecucao>('sincrono')
  const [valoresNovos, setValoresNovos] = useState<Record<string, string>>({})
  const [livresNovos, setLivresNovos] = useState<ExercicioLivre[]>([])
  const [blocosNovos, setBlocosNovos] = useState<BlocoTreino[]>([])
  const [modalidadeEd, setModalidadeEd] = useState<ModalidadeTipo>('musculacao')
  const [execucaoEd, setExecucaoEd] = useState<TipoExecucao>('sincrono')
  const [valoresEd, setValoresEd] = useState<Record<string, string>>({})
  const [livresEd, setLivresEd] = useState<ExercicioLivre[]>([])
  const [blocosEd, setBlocosEd] = useState<BlocoTreino[]>([])

  const [renomeando, setRenomeando] = useState<Modelo | null>(null)
  const [nome, setNome] = useState('')
  const [notas, setNotas] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const [menuAberto, setMenuAberto] = useState<Modelo | null>(null)
  const [duplicando, setDuplicando] = useState<Modelo | null>(null)
  const [nomeDuplicado, setNomeDuplicado] = useState('')
  const [erroDuplicado, setErroDuplicado] = useState<string | null>(null)

  const abrirDuplicar = (m: Modelo) => {
    setMenuAberto(null)
    setDuplicando(m)
    setNomeDuplicado(sugerirNomeDuplicado(m.name, (modelos ?? []).map((x) => x.name)))
    setErroDuplicado(null)
  }

  const confirmarDuplicar = () => {
    if (!duplicando) return
    if (!nomeDuplicado.trim()) {
      setErroDuplicado('Nome é obrigatório')
      return
    }
    duplicar.mutate(
      { modelo: duplicando, novoNome: nomeDuplicado.trim() },
      { onSuccess: () => setDuplicando(null), onError: (e) => setErroDuplicado((e as Error).message) },
    )
  }

  const abrirNovo = () => {
    setNomeNovo('')
    setModalidadeNova('musculacao')
    setExecucaoNova('sincrono')
    setValoresNovos({})
    setLivresNovos([])
    setBlocosNovos([])
    setErroNovo(null)
    setCriando(true)
  }

  const confirmarNovo = () => {
    if (!nomeNovo.trim()) {
      setErroNovo('Nome é obrigatório')
      return
    }
    const erroBlocos = validarBlocos(modalidadeNova, blocosNovos)
    if (erroBlocos) {
      setErroNovo(erroBlocos)
      return
    }
    criar.mutate(
      {
        name: nomeNovo.trim(),
        modalidade: modalidadeNova,
        tipo_execucao: execucaoNova,
        modalidade_detalhes: montarDetalhes(modalidadeNova, valoresNovos, livresNovos, blocosNovos),
      },
      {
        onSuccess: (id) => {
          setCriando(false)
          // musculação segue para a escolha de exercícios; as outras modalidades não têm lista de exercícios do app
          if (modalidadeNova === 'musculacao') navigate(`/meus-treinos/planejados/${id}?adicionar=1`)
        },
        onError: (e) => setErroNovo((e as Error).message),
      },
    )
  }

  const abrirEditar = (m: Modelo) => {
    setNome(m.name)
    setNotas(m.notes ?? '')
    setModalidadeEd(m.modalidade ?? 'musculacao')
    setExecucaoEd(m.tipo_execucao ?? 'sincrono')
    setValoresEd(valoresDoFormulario(m.modalidade_detalhes))
    setLivresEd(exerciciosLivresDe(m.modalidade_detalhes))
    setBlocosEd(blocosDe(m.modalidade ?? 'musculacao', m.modalidade_detalhes))
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
    const erroBlocos = validarBlocos(modalidadeEd, blocosEd)
    if (erroBlocos) {
      setErro(erroBlocos)
      return
    }
    atualizar.mutate(
      {
        id: renomeando.id,
        name: nome.trim(),
        notes: notas.trim(),
        modalidade: modalidadeEd,
        tipo_execucao: execucaoEd,
        modalidade_detalhes: montarDetalhes(modalidadeEd, valoresEd, livresEd, blocosEd),
      },
      { onSuccess: () => setRenomeando(null), onError: (e) => setErro((e as Error).message) },
    )
  }

  const excluirModelo = async (m: Modelo) => {
    setMenuAberto(null)
    const ok = await confirmarAcao({
      titulo: 'Excluir treino planejado',
      mensagem: `Excluir "${m.name}"? Os treinos já criados a partir dele nos alunos não são afetados.`,
      textoConfirmar: 'Excluir',
      destrutivo: true,
    })
    if (!ok) return
    excluir.mutate(m.id)
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Treinos planejados</h1>
        <LinkConfiguracoes />
      </header>

      <ExerciciosTabs />

      {isLoading && <ListaSkeleton />}
      {error && <p className="text-red-600">{mapearErroSupabase(error)}</p>}
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
          const outraMod = (m.modalidade ?? 'musculacao') !== 'musculacao'
          const cfgMod = MODALIDADES_CONFIG[m.modalidade ?? 'musculacao']
          const metrica = resumoModalidade(m.modalidade ?? 'musculacao', m.modalidade_detalhes)
          const nLivres = exerciciosLivresDe(m.modalidade_detalhes).length
          const vazio = m.modelo_exercicios.length === 0 && !outraMod
          return (
            <li key={m.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Link to={`/meus-treinos/planejados/${m.id}`} className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {cfgMod.emoji} {cfgMod.label}
                    </span>
                    {m.tipo_execucao === 'assincrono' && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-hover">📤 Assíncrono</span>
                    )}
                  </p>
                  {outraMod ? (
                    <p className="text-sm text-slate-500">
                      {[metrica, nLivres > 0 ? `${nLivres} ${nLivres === 1 ? 'exercício' : 'exercícios'}` : null].filter(Boolean).join(' · ') || 'Sem detalhes'}
                    </p>
                  ) : vazio ? (
                    <p className="text-sm font-medium text-brand-hover">Nenhum exercício · toque para adicionar</p>
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

      <Fab onClick={abrirNovo} label="Novo treino planejado" />

      <BottomSheet open={criando} onClose={() => setCriando(false)} title="Novo treino planejado">
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} autoFocus placeholder="Full body A" />
          </Field>
          <ModalidadeForm
            modalidade={modalidadeNova}
            onModalidade={(mo) => {
              setModalidadeNova(mo)
              setValoresNovos({})
              setLivresNovos([])
              setBlocosNovos([])
            }}
            tipoExecucao={execucaoNova}
            onTipoExecucao={setExecucaoNova}
            valores={valoresNovos}
            onValores={setValoresNovos}
            livres={livresNovos}
            onLivres={setLivresNovos}
            blocos={blocosNovos}
            onBlocos={setBlocosNovos}
          />
          {erroNovo && <p className="text-sm text-red-600">{erroNovo}</p>}
          <Button onClick={confirmarNovo} className="w-full" disabled={criar.isPending}>
            {modalidadeNova === 'musculacao' ? 'Criar e adicionar exercícios' : 'Criar treino planejado'}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!menuAberto} onClose={() => setMenuAberto(null)} title={menuAberto?.name}>
        <div className="space-y-1">
          <button onClick={() => menuAberto && abrirEditar(menuAberto)} className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100">
            Editar
          </button>
          <button
            onClick={() => menuAberto && abrirDuplicar(menuAberto)}
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

      <BottomSheet open={!!duplicando} onClose={() => setDuplicando(null)} title="Duplicar treino planejado">
        <div className="space-y-4">
          <Field label="Nome do novo treino planejado">
            <Input value={nomeDuplicado} onChange={(e) => setNomeDuplicado(e.target.value)} autoFocus />
          </Field>
          {erroDuplicado && <p className="text-sm text-red-600">{erroDuplicado}</p>}
          <Button onClick={confirmarDuplicar} className="w-full" disabled={duplicar.isPending}>
            Duplicar
          </Button>
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
          <ModalidadeForm
            modalidade={modalidadeEd}
            onModalidade={(mo) => {
              setModalidadeEd(mo)
              setValoresEd({})
              setLivresEd([])
              setBlocosEd([])
            }}
            tipoExecucao={execucaoEd}
            onTipoExecucao={setExecucaoEd}
            valores={valoresEd}
            onValores={setValoresEd}
            livres={livresEd}
            onLivres={setLivresEd}
            blocos={blocosEd}
            onBlocos={setBlocosEd}
          />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={salvarRenome} className="w-full" disabled={atualizar.isPending}>
            Salvar
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
