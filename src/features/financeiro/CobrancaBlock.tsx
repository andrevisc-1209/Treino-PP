import { useEffect, useState } from 'react'
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
  }
}

export function CobrancaBlock({ alunoId }: { alunoId: string }) {
  const { data: cobranca, isLoading } = useAlunoCobranca(alunoId)
  const salvar = useSalvarAlunoCobranca()

  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState<CobrancaFormValor>(valorInicialCobranca())
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (editando) {
      setValor(cobranca ? paraFormulario(cobranca) : valorInicialCobranca())
      setErro(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando])

  const confirmarSalvar = () => {
    const erroValidacao = validarCobranca(valor)
    if (erroValidacao) {
      setErro(erroValidacao)
      return
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

      {isLoading && <ListaSkeleton />}

      {!isLoading && (!cobranca || !cobranca.ativo) && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-600">Sem valor definido</p>
          <Button onClick={() => setEditando(true)}>Definir valor</Button>
        </div>
      )}

      {!isLoading && cobranca?.ativo && (
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
          <Button onClick={confirmarSalvar} className="w-full" disabled={salvar.isPending}>
            Salvar
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
