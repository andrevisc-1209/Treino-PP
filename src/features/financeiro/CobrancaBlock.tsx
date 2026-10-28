import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { hojeSP } from '@/lib/datas'
import { formatarDataBR } from '@/lib/format'
import { PacoteChip } from '@/features/pacotes/PacoteChip'
import { useEncerrarPacote, usePacotesAtivos, useRenovarPacote, useSalvarPacote } from '@/features/pacotes/api'
import { mostrarInfoGlobal } from '@/components/Toast'
import { formularioDoPacote, pagamentoDoFormulario, payloadPacote } from '@/features/pacotes/formulario'
import { situacaoDoPacote } from '@/features/pacotes/pacote'
import { ListaSkeleton } from '@/components/Skeleton'
import { Pencil } from 'lucide-react'
import { Button, BottomSheet } from '@/components/ui'
import { formatarBRL } from '@/lib/moeda'
import { CobrancaForm, valorInicialCobranca, type CobrancaFormValor } from './CobrancaForm'
import { payloadDistancia } from './distancia'
import { validarCobranca } from './cobrancaValidacao'
import { useAlunoCobranca, useFaturasDoAluno, useSalvarAlunoCobranca, type AlunoCobranca } from './api'
import { mapearErroSupabase } from '@/lib/erros'

function paraFormulario(c: AlunoCobranca): CobrancaFormValor {
  return {
    modelo: c.modelo,
    valorTexto: String(c.modelo === 'por_aula' ? (c.valor_aula ?? '') : (c.valor_mensal ?? '')),
    diaCicloTexto: String(c.dia_ciclo),
    diasVencimentoTexto: String(c.dias_vencimento),
    cobrarDistancia: !!c.cobrar_distancia,
    valorDistanciaTexto: c.valor_distancia != null ? String(c.valor_distancia) : '',
    qtdPacoteTexto: '',
    validadePacoteTexto: '60',
    feitasPacoteTexto: '',
    pacoteRecebido: false,
    pagamentoDataTexto: hojeSP(),
    formaPagamento: 'pix',
  }
}

export function CobrancaBlock({ alunoId }: { alunoId: string }) {
  const { data: cobranca, isLoading } = useAlunoCobranca(alunoId)
  const salvar = useSalvarAlunoCobranca()
  const { data: pacotes, isLoading: carregandoPacote } = usePacotesAtivos()
  const salvarPacote = useSalvarPacote()
  const renovarPacote = useRenovarPacote()
  const encerrarPacote = useEncerrarPacote()
  const { data: faturas } = useFaturasDoAluno(alunoId)
  const [params, setParams] = useSearchParams()
  const atual = pacotes?.get(alunoId)
  const situacao = atual ? situacaoDoPacote(atual.pacote, atual.presencas, hojeSP()) : null

  const [editando, setEditando] = useState(false)
  const [renovando, setRenovando] = useState(false)
  const [valorRenovar, setValorRenovar] = useState<CobrancaFormValor>(valorInicialCobranca())
  const [valor, setValor] = useState<CobrancaFormValor>(valorInicialCobranca())
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (editando) {
      setValor(atual ? formularioDoPacote(atual.pacote, situacao!.usadas, valorInicialCobranca()) : cobranca ? paraFormulario(cobranca) : valorInicialCobranca())
      setErro(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando])

  const faturaDoPacote = atual?.pacote.fatura_id ? faturas?.find((f) => f.id === atual.pacote.fatura_id) : undefined

  const abrirRenovar = () => {
    if (!atual) return
    setValorRenovar({ ...formularioDoPacote(atual.pacote, 0, valorInicialCobranca()) })
    setErro(null)
    setRenovando(true)
  }

  // "Renovar pacote" vindo do aviso de pacote acabado (?renovar=1): abre a renovação uma vez
  const pedidoRenovar = params.get('renovar') === '1'
  useEffect(() => {
    if (!pedidoRenovar || !atual) return
    abrirRenovar()
    const novos = new URLSearchParams(params)
    novos.delete('renovar')
    setParams(novos, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoRenovar, !!atual])

  const confirmarRenovar = () => {
    const erroValidacao = validarCobranca(valorRenovar)
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }
    setErro(null)
    renovarPacote.mutate(
      { dados: payloadPacote(valorRenovar, alunoId), pagamento: pagamentoDoFormulario(valorRenovar) },
      {
        onSuccess: () => {
          setRenovando(false)
          mostrarInfoGlobal('Pacote renovado. O anterior foi encerrado e o relatório está na fatura dele.')
        },
        onError: (e) => setErro(mapearErroSupabase(e)),
      },
    )
  }

  const encerrarSemRenovar = async () => {
    if (!atual) return
    const ok = await confirmarAcao({
      titulo: 'Encerrar o pacote?',
      mensagem: `O pacote (${situacao!.contador}) será encerrado e as aulas feitas entram no relatório da fatura. Você pode vender outro pacote depois.`,
      textoConfirmar: 'Encerrar pacote',
      textoCancelar: 'Voltar',
    })
    if (!ok) return
    encerrarPacote.mutate(alunoId, {
      onSuccess: () => mostrarInfoGlobal('Pacote encerrado.'),
      onError: (e) => mostrarInfoGlobal(mapearErroSupabase(e)),
    })
  }

  const confirmarSalvar = async () => {
    const erroValidacao = validarCobranca(valor, valor.modelo === 'pacote' ? (atual?.presencas ?? 0) : 0, !atual)
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }
    if (valor.modelo === 'pacote') {
      setErro(null)
      salvarPacote.mutate(
        { dados: payloadPacote(valor, alunoId, atual?.presencas ?? 0), pagamento: pagamentoDoFormulario(valor), editando: atual?.pacote },
        { onSuccess: () => setEditando(false), onError: (e) => setErro(mapearErroSupabase(e)) },
      )
      return
    }
    // trocar o pacote por cobrança por aula/mensal encerra o pacote ativo: confirma antes (o histórico dele fica guardado)
    if (atual) {
      const ok = await confirmarAcao({
        titulo: 'Encerrar o pacote?',
        mensagem: `O pacote de ${atual.pacote.qtd_aulas} aulas (${situacao!.contador}) será encerrado e a cobrança passa a ser ${valor.modelo === 'mensal' ? 'mensal' : 'por aula'}.`,
        textoConfirmar: 'Encerrar e trocar',
        textoCancelar: 'Voltar',
      })
      if (!ok) return
      try {
        await encerrarPacote.mutateAsync(alunoId)
      } catch (e) {
        setErro(mapearErroSupabase(e))
        return
      }
    }
    const valorNum = Number(valor.valorTexto.replace(',', '.'))
    const diaCiclo = Number(valor.diaCicloTexto)
    const diasVencimento = Number(valor.diasVencimentoTexto)
    setErro(null)
    salvar.mutate(
      {
        aluno_id: alunoId,
        modelo: valor.modelo,
        valor_aula: valor.modelo === 'por_aula' ? valorNum : null,
        valor_mensal: valor.modelo === 'mensal' ? valorNum : null,
        dia_ciclo: diaCiclo,
        dias_vencimento: diasVencimento || 0,
        ...payloadDistancia(valor),
      },
      { onSuccess: () => setEditando(false), onError: (e) => setErro(mapearErroSupabase(e)) },
    )
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Cobrança</h2>
        <Button variant="ghost" onClick={() => setEditando(true)} aria-label="Editar cobrança">
          <Pencil size={16} />
        </Button>
      </div>

      {(isLoading || carregandoPacote) && <ListaSkeleton />}

      {!isLoading && !carregandoPacote && atual && situacao && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">
              Pacote de {atual.pacote.qtd_aulas} aulas · {formatarBRL(atual.pacote.valor)}
            </p>
            <p className="text-lg font-bold tabular-nums" aria-label={`${situacao.usadas} de ${situacao.total} aulas feitas`}>
              {situacao.contador}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.round((situacao.usadas / situacao.total) * 100))}%` }} />
          </div>
          <p className="text-sm text-slate-600">Vale até {formatarDataBR(situacao.fim)}</p>
          {faturaDoPacote && (
            <p className="text-sm text-slate-600">
              {faturaDoPacote.status === 'paga'
                ? `Recebido em ${formatarDataBR(faturaDoPacote.paga_em)}`
                : faturaDoPacote.status === 'cancelada'
                  ? 'Cobrança cancelada'
                  : `A receber${faturaDoPacote.vencimento ? ` · vence ${formatarDataBR(faturaDoPacote.vencimento)}` : ''}`}{' '}
              ·{' '}
              <Link to={`/financeiro/${faturaDoPacote.id}`} className="font-medium text-brand-hover underline">
                Ver fatura
              </Link>
            </p>
          )}
          {situacao.aviso && <PacoteChip situacao={situacao} />}
          <div className="flex gap-2 pt-1">
            <Button variant={situacao.nivel === 'esgotado' ? 'primary' : 'outline'} onClick={abrirRenovar} className="flex-1">
              Renovar pacote
            </Button>
            <Button variant="ghost" onClick={encerrarSemRenovar} disabled={encerrarPacote.isPending}>
              Encerrar
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !carregandoPacote && !atual && (!cobranca || !cobranca.ativo) && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-600">Sem valor definido</p>
          <Button onClick={() => setEditando(true)}>Definir valor</Button>
        </div>
      )}

      {!isLoading && !carregandoPacote && !atual && cobranca?.ativo && (
        <div className="space-y-0.5">
          <p className="font-medium">
            {cobranca.modelo === 'por_aula' ? <>{formatarBRL(cobranca.valor_aula ?? 0)} por aula</> : <>{formatarBRL(cobranca.valor_mensal ?? 0)} por mês</>}
            {cobranca.modelo === 'por_aula' && cobranca.cobrar_distancia && cobranca.valor_distancia != null && (
              <span className="font-normal text-slate-600"> · {formatarBRL(cobranca.valor_distancia)} à distância</span>
            )}
          </p>
          <p className="text-sm text-slate-600">
            Ciclo a partir do dia {cobranca.dia_ciclo} · vence {cobranca.dias_vencimento} dias após fechar
          </p>
        </div>
      )}

      <BottomSheet open={editando} onClose={() => setEditando(false)} title="Cobrança">
        <div className="space-y-4">
          <CobrancaForm value={valor} onChange={setValor} semPagamento={!!atual} valorTravado={faturaDoPacote?.status === 'paga'} />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={confirmarSalvar} className="w-full" disabled={salvar.isPending || salvarPacote.isPending}>
            Salvar
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={renovando} onClose={() => setRenovando(false)} title="Renovar pacote">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">O pacote atual é encerrado (as aulas feitas entram no relatório da fatura dele) e começa um novo hoje, com cobrança nova.</p>
          <CobrancaForm value={valorRenovar} onChange={setValorRenovar} ocultarModelo />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={confirmarRenovar} className="w-full" disabled={renovarPacote.isPending}>
            Renovar pacote
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
