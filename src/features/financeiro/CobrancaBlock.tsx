import { useEffect, useState } from 'react'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { hojeSP } from '@/lib/datas'
import { formatarDataBR } from '@/lib/format'
import { PacoteChip } from '@/features/pacotes/PacoteChip'
import { useEncerrarPacote, usePacotesAtivos, useSalvarPacote } from '@/features/pacotes/api'
import { formularioDoPacote, payloadPacote } from '@/features/pacotes/formulario'
import { situacaoDoPacote } from '@/features/pacotes/pacote'
import { ListaSkeleton } from '@/components/Skeleton'
import { Pencil } from 'lucide-react'
import { Button, BottomSheet } from '@/components/ui'
import { formatarBRL } from '@/lib/moeda'
import { CobrancaForm, valorInicialCobranca, type CobrancaFormValor } from './CobrancaForm'
import { payloadDistancia } from './distancia'
import { validarCobranca } from './cobrancaValidacao'
import { useAlunoCobranca, useSalvarAlunoCobranca, type AlunoCobranca } from './api'
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
  }
}

export function CobrancaBlock({ alunoId }: { alunoId: string }) {
  const { data: cobranca, isLoading } = useAlunoCobranca(alunoId)
  const salvar = useSalvarAlunoCobranca()
  const { data: pacotes, isLoading: carregandoPacote } = usePacotesAtivos()
  const salvarPacote = useSalvarPacote()
  const encerrarPacote = useEncerrarPacote()
  const atual = pacotes?.get(alunoId)
  const situacao = atual ? situacaoDoPacote(atual.pacote, atual.presencas, hojeSP()) : null

  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState<CobrancaFormValor>(valorInicialCobranca())
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (editando) {
      setValor(atual ? formularioDoPacote(atual.pacote, situacao!.usadas, valorInicialCobranca()) : cobranca ? paraFormulario(cobranca) : valorInicialCobranca())
      setErro(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando])

  const confirmarSalvar = async () => {
    const erroValidacao = validarCobranca(valor, valor.modelo === 'pacote' ? (atual?.presencas ?? 0) : 0)
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }
    if (valor.modelo === 'pacote') {
      setErro(null)
      salvarPacote.mutate(payloadPacote(valor, alunoId, atual?.presencas ?? 0), { onSuccess: () => setEditando(false), onError: (e) => setErro(mapearErroSupabase(e)) })
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
          {situacao.aviso && <PacoteChip situacao={situacao} />}
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
          <CobrancaForm value={valor} onChange={setValor} />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={confirmarSalvar} className="w-full" disabled={salvar.isPending || salvarPacote.isPending}>
            Salvar
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
