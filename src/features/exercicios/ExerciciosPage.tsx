import { useMemo, useState } from 'react'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'
import { BottomSheet, Button, Fab, Field, Input } from '@/components/ui'
import { LinkConfiguracoes } from '@/components/LinkConfiguracoes'
import { RolagemHorizontal } from '@/components/RolagemHorizontal'
import { ExerciciosTabs } from '@/components/ExerciciosTabs'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mapearErroSupabase } from '@/lib/erros'
import { EXERCICIOS_NATACAO, type ExercicioNatacao } from '@/data/natacao-exercicios'
import { useAtualizarExercicioNatacao, useCriarExercicioNatacao, useExcluirExercicioNatacao, useExerciciosNatacaoCustom } from '@/features/natacao/api'
import { MODALIDADES_CONFIG, type ModalidadeTipo } from '@/types/modalidades'
import type { GrupoNatacao } from '@/types/natacao'
import { ehMusculacao, useAtualizarExercicio, useCriarExercicio, useExcluirExercicio, useExercicios, type Exercicio } from './api'
import { modalidadesDeExercicio, parametroPadrao, prefillNovoExercicio, rotuloTipo, tiposDaModalidade, type ParametroPrincipal } from './tipos'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'

type Ambiente = 'piscina' | 'mar' | 'ambos'
type FormState = { modalidade: ModalidadeTipo; tipo: string; name: string; equipment: string; description: string; parametro: ParametroPrincipal; ambiente: Ambiente }
type Origem = 'sistema' | 'meus'
type Editando = { modalidade: ModalidadeTipo; id: string; nome: string }

/** Linha da lista, igual para todas as modalidades. */
type Item = { id: string; nome: string; tipoId: string | null; detalhe: string; meu: boolean; form?: FormState }

const CLASSE_CAMPO = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-brand'
const ROTULO_PARAMETRO: Record<ParametroPrincipal, string> = { distancia: 'Distância', tempo: 'Tempo' }
const ROTULO_AMBIENTE: Record<Ambiente, string> = { piscina: 'Piscina', mar: 'Mar aberto', ambos: 'Piscina e mar' }

const formVazio = (modalidade: ModalidadeTipo, tipo: string): FormState => ({
  modalidade,
  tipo,
  name: '',
  equipment: '',
  description: '',
  parametro: parametroPadrao(modalidade, tipo) ?? 'distancia',
  ambiente: modalidade === 'natacao' && tipo === 'mar' ? 'mar' : 'piscina',
})

export function ExerciciosPage() {
  const { exigir } = useExigirAssinatura()
  const { session } = useAuth()
  const { data: exercicios, isLoading, error } = useExercicios()
  const { data: natacaoMeus } = useExerciciosNatacaoCustom()
  const criar = useCriarExercicio()
  const atualizar = useAtualizarExercicio()
  const excluir = useExcluirExercicio()
  const criarNatacao = useCriarExercicioNatacao()
  const atualizarNatacao = useAtualizarExercicioNatacao()
  const excluirNatacao = useExcluirExercicioNatacao()

  const [modalidade, setModalidade] = useState<ModalidadeTipo>('musculacao')
  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null)
  // Biblioteca do sistema e exercícios do próprio personal ficam em listas separadas.
  const [origem, setOrigem] = useState<Origem>('sistema')
  const [editando, setEditando] = useState<Editando | null>(null)
  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState<FormState>(formVazio('musculacao', ''))
  const [erro, setErro] = useState<string | null>(null)

  const meuId = session?.user.id
  const todos = useMemo(() => exercicios ?? [], [exercicios])
  const gruposMusculacao = useMemo(() => [...new Set(todos.filter(ehMusculacao).map((e) => e.muscle_group).filter((g): g is string => !!g))], [todos])

  /** Itens da modalidade escolhida, já separados em sistema / meus. */
  const { sistema, meus } = useMemo(() => {
    const deBanco = (e: Exercicio): Item => {
      const musc = ehMusculacao(e)
      const tipoId = musc ? e.muscle_group : (e.tipo ?? null)
      return {
        id: e.id,
        nome: e.name,
        tipoId,
        detalhe: [rotuloTipo(e.modalidade ?? 'musculacao', tipoId, gruposMusculacao), musc ? e.equipment : e.parametro_principal ? ROTULO_PARAMETRO[e.parametro_principal] : null].filter(Boolean).join(' · ') || '—',
        meu: e.professional_id != null && e.professional_id === meuId,
        form: {
          ...formVazio(e.modalidade ?? 'musculacao', tipoId ?? ''),
          name: e.name,
          equipment: e.equipment ?? '',
          description: e.description ?? '',
          parametro: e.parametro_principal ?? parametroPadrao(e.modalidade ?? 'musculacao', tipoId) ?? 'distancia',
        },
      }
    }
    const deNatacao = (e: ExercicioNatacao): Item => ({
      id: e.id,
      nome: e.nome,
      tipoId: e.grupo,
      detalhe: [rotuloTipo('natacao', e.grupo), e.ambiente === 'ambos' ? 'Piscina e mar' : ROTULO_AMBIENTE[e.ambiente], ROTULO_PARAMETRO[e.parametroPrincipal]].join(' · '),
      meu: !!e.is_custom,
      form: { ...formVazio('natacao', e.grupo), name: e.nome, description: e.descricao ?? '', parametro: e.parametroPrincipal, ambiente: e.ambiente },
    })
    if (modalidade === 'natacao') return { sistema: EXERCICIOS_NATACAO.map(deNatacao), meus: (natacaoMeus ?? []).map(deNatacao) }
    const daModalidade = todos.filter((e) => (e.modalidade ?? 'musculacao') === modalidade)
    const doBanco = daModalidade.map(deBanco)
    if (modalidade === 'musculacao') return { sistema: doBanco.filter((i) => !i.meu), meus: doBanco.filter((i) => i.meu) }
    // corrida, ciclismo e brick: o "sistema" são os tipos de treino do app (somente leitura)
    const tipos: Item[] = tiposDaModalidade(modalidade).map((t) => ({ id: `tipo-${t.id}`, nome: t.rotulo, tipoId: t.id, detalhe: t.descricao ?? 'Tipo de treino', meu: false }))
    return { sistema: tipos, meus: doBanco.filter((i) => i.meu) }
  }, [modalidade, todos, natacaoMeus, meuId, gruposMusculacao])

  const base = origem === 'meus' ? meus : sistema
  const catalogoSemExercicios = origem === 'sistema' && modalidade !== 'musculacao' && modalidade !== 'natacao'

  const tiposVisiveis = useMemo(() => {
    if (catalogoSemExercicios) return []
    const presentes = new Set(base.map((i) => i.tipoId))
    return tiposDaModalidade(modalidade, gruposMusculacao).filter((t) => presentes.has(t.id))
  }, [base, modalidade, gruposMusculacao, catalogoSemExercicios])

  const filtrados = base.filter((i) => (!tipoFiltro || i.tipoId === tipoFiltro) && (!busca.trim() || i.nome.toLowerCase().includes(busca.trim().toLowerCase())))

  const trocarModalidade = (m: ModalidadeTipo) => {
    setModalidade(m)
    setTipoFiltro(null)
  }
  const trocarOrigem = (nova: Origem) => {
    setOrigem(nova)
    setTipoFiltro(null)
  }

  const abrirCriar = () => {
    const { modalidade: m, tipo } = prefillNovoExercicio({ modalidade, tipo: tipoFiltro }, gruposMusculacao)
    setForm(formVazio(m, tipo))
    setErro(null)
    setCriando(true)
  }

  const abrirEditar = (i: Item) => {
    if (!i.form) return
    setForm(i.form)
    setErro(null)
    setEditando({ modalidade, id: i.id, nome: i.nome })
  }

  const fechar = () => {
    setCriando(false)
    setEditando(null)
  }

  const trocarModalidadeNoForm = (m: ModalidadeTipo) => setForm(formVazio(m, ''))
  const trocarTipoNoForm = (tipo: string) =>
    setForm((f) => ({ ...f, tipo, parametro: parametroPadrao(f.modalidade, tipo) ?? f.parametro, ambiente: f.modalidade === 'natacao' && tipo === 'mar' ? 'mar' : f.ambiente }))

  const aoSalvar = () => {
    fechar()
    if (!editando) {
      setModalidade(form.modalidade)
      setTipoFiltro(null)
      setOrigem('meus') // o exercício recém-criado aparece em "Meus"
    }
  }

  const salvar = () => {
    if (!form.name.trim()) return setErro('Nome é obrigatório')
    if (form.modalidade !== 'musculacao' && !form.tipo) return setErro('Escolha o tipo.')
    const aoErrar = (e: unknown) => setErro(mapearErroSupabase(e))
    if (form.modalidade === 'natacao') {
      const dados = { nome: form.name, grupo: form.tipo as GrupoNatacao, ambiente: form.ambiente, descricao: form.description, parametroPrincipal: form.parametro }
      if (editando) atualizarNatacao.mutate({ id: editando.id, ...dados }, { onSuccess: aoSalvar, onError: aoErrar })
      else criarNatacao.mutate(dados, { onSuccess: aoSalvar, onError: aoErrar })
      return
    }
    const musc = form.modalidade === 'musculacao'
    const input = {
      name: form.name.trim(),
      muscle_group: musc ? form.tipo.trim() : '',
      equipment: musc ? form.equipment.trim() : '',
      description: form.description.trim(),
      modalidade: form.modalidade,
      tipo: musc ? undefined : form.tipo,
      parametro_principal: musc ? undefined : form.parametro,
    }
    if (editando) atualizar.mutate({ id: editando.id, ...input }, { onSuccess: aoSalvar, onError: aoErrar })
    else criar.mutate(input, { onSuccess: aoSalvar, onError: aoErrar })
  }

  const excluirAtual = async () => {
    if (!editando) return
    const ok = await confirmarAcao({ titulo: 'Excluir exercício', mensagem: `Excluir "${editando.nome}"?`, textoConfirmar: 'Excluir', destrutivo: true })
    if (!ok) return
    const opcoes = { onSuccess: fechar, onError: (e: unknown) => setErro(mapearErroSupabase(e)) }
    if (editando.modalidade === 'natacao') excluirNatacao.mutate(editando.id, opcoes)
    else excluir.mutate(editando.id, opcoes)
  }

  const salvando = criar.isPending || atualizar.isPending || criarNatacao.isPending || atualizarNatacao.isPending
  const tiposDoForm = tiposDaModalidade(form.modalidade, gruposMusculacao)

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercícios</h1>
        <LinkConfiguracoes />
      </header>

      <ExerciciosTabs />

      <RolagemHorizontal className="mb-3 py-1">
        {modalidadesDeExercicio().map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={modalidade === m}
            onClick={() => trocarModalidade(m)}
            className={cn(
              'min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium',
              modalidade === m ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-600',
            )}
          >
            {MODALIDADES_CONFIG[m].emoji} {MODALIDADES_CONFIG[m].label}
          </button>
        ))}
      </RolagemHorizontal>

      <div role="group" aria-label="Origem dos exercícios" className="mb-3 flex rounded-xl border border-slate-300 bg-white p-1">
        {(
          [
            ['sistema', modalidade === 'musculacao' || modalidade === 'natacao' ? 'Do sistema' : 'Tipos do app', sistema.length],
            ['meus', 'Meus exercícios', meus.length],
          ] as const
        ).map(([valor, rotulo, qtd]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={origem === valor}
            onClick={() => trocarOrigem(valor)}
            className={cn('min-h-11 flex-1 rounded-lg px-2 text-sm font-medium transition', origem === valor ? 'bg-brand text-white' : 'text-slate-600 active:bg-slate-100')}
          >
            {rotulo} <span className={origem === valor ? 'text-white/80' : 'text-slate-400'}>({qtd})</span>
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar exercício" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
      </div>

      {tiposVisiveis.length > 0 && (
        <RolagemHorizontal className="mb-4 py-1">
          <button
            type="button"
            aria-pressed={tipoFiltro === null}
            onClick={() => setTipoFiltro(null)}
            className={cn('min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium', tipoFiltro === null ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-600')}
          >
            Todos
          </button>
          {tiposVisiveis.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tipoFiltro === t.id}
              onClick={(e) => {
                setTipoFiltro(t.id === tipoFiltro ? null : t.id)
                e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
              }}
              className={cn('min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium', tipoFiltro === t.id ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-600')}
            >
              {t.rotulo}
            </button>
          ))}
        </RolagemHorizontal>
      )}

      {isLoading && <p className="text-slate-500">Carregando…</p>}
      {error && <p className="text-red-600">{mapearErroSupabase(error)}</p>}
      {!isLoading && filtrados.length === 0 &&
        (origem === 'meus' && meus.length === 0 ? (
          <p className="text-slate-500">Você ainda não criou exercícios de {MODALIDADES_CONFIG[modalidade].label.toLowerCase()}. Toque no + para criar o primeiro.</p>
        ) : (
          <p className="text-slate-500">Nenhum exercício encontrado.</p>
        ))}

      <ul className="space-y-2">
        {filtrados.map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{i.nome}</p>
              <p className="text-sm text-slate-500">{i.detalhe}</p>
            </div>
            {origem === 'meus' && i.meu && (
              <button type="button" onClick={() => abrirEditar(i)} className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100" aria-label={`Editar ${i.nome}`}>
                <Pencil size={18} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <Fab onClick={exigir(abrirCriar)} label="Novo exercício" />

      <BottomSheet open={criando || !!editando} onClose={fechar} title={editando ? 'Editar exercício' : 'Novo exercício'}>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Modalidade</p>
            {editando ? (
              <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                {MODALIDADES_CONFIG[form.modalidade].emoji} {MODALIDADES_CONFIG[form.modalidade].label}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Modalidade do exercício">
                {modalidadesDeExercicio().map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={form.modalidade === m}
                    onClick={() => form.modalidade !== m && trocarModalidadeNoForm(m)}
                    className={cn(
                      'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 text-center text-xs font-medium',
                      form.modalidade === m ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700 active:bg-slate-50',
                    )}
                  >
                    <span className="text-xl" aria-hidden>
                      {MODALIDADES_CONFIG[m].emoji}
                    </span>
                    {MODALIDADES_CONFIG[m].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Field label={form.modalidade === 'musculacao' ? 'Tipo (grupo muscular)' : 'Tipo'}>
            {form.modalidade === 'musculacao' ? (
              <>
                <Input list="grupos-musculares" value={form.tipo} onChange={(e) => trocarTipoNoForm(e.target.value)} placeholder="Peito, Costas, Pernas…" />
                <datalist id="grupos-musculares">
                  {tiposDoForm.map((t) => (
                    <option key={t.id} value={t.id} />
                  ))}
                </datalist>
              </>
            ) : (
              <select className={CLASSE_CAMPO} value={form.tipo} onChange={(e) => trocarTipoNoForm(e.target.value)}>
                <option value="">Selecione…</option>
                {tiposDoForm.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Exercício">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="Nome do exercício" />
          </Field>

          {form.modalidade === 'musculacao' && (
            <Field label="Equipamento">
              <Input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
            </Field>
          )}

          {form.modalidade === 'natacao' && (
            <div>
              <p className="mb-2 text-sm font-medium">Onde se faz</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Ambiente">
                {(Object.keys(ROTULO_AMBIENTE) as Ambiente[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={form.ambiente === a}
                    onClick={() => setForm({ ...form, ambiente: a })}
                    className={cn('min-h-11 rounded-xl border px-1 text-xs font-medium', form.ambiente === a ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
                  >
                    {ROTULO_AMBIENTE[a]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.modalidade !== 'musculacao' && (
            <div>
              <p className="mb-2 text-sm font-medium">Medido por</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Parâmetro principal">
                {(['distancia', 'tempo'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={form.parametro === p}
                    onClick={() => setForm({ ...form, parametro: p })}
                    className={cn('min-h-11 rounded-xl border px-2 text-sm font-medium', form.parametro === p ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
                  >
                    {ROTULO_PARAMETRO[p]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field label="Descrição">
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <Button onClick={salvar} className="flex-1" disabled={salvando}>
              Salvar
            </Button>
            {editando && (
              <Button variant="ghost" onClick={excluirAtual} disabled={excluir.isPending || excluirNatacao.isPending} className="text-red-600" aria-label="Excluir exercício">
                <Trash2 size={18} />
              </Button>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
