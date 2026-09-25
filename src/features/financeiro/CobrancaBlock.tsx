import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button, BottomSheet } from '@/components/ui'
import { formatarBRL } from '@/lib/moeda'
import { CobrancaForm, valorInicialCobranca, type CobrancaFormValor } from './CobrancaForm'
import { useAlunoCobranca, useSalvarAlunoCobranca, type AlunoCobranca } from './api'

function paraFormulario(c: AlunoCobranca): CobrancaFormValor {
  return {
    modelo: c.modelo,
    valorTexto: String(c.modelo === 'por_aula' ? (c.valor_aula ?? '') : (c.valor_mensal ?? '')),
    diaCicloTexto: String(c.dia_ciclo),
    diasVencimentoTexto: String(c.dias_vencimento),
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
    const valorNum = Number(valor.valorTexto.replace(',', '.'))
    const diaCiclo = Number(valor.diaCicloTexto)
    const diasVencimento = Number(valor.diasVencimentoTexto)
    if (!valor.valorTexto.trim() || Number.isNaN(valorNum) || valorNum <= 0) {
      setErro('Informe um valor maior que zero')
      return
    }
    if (!diaCiclo || diaCiclo < 1 || diaCiclo > 28) {
      setErro('Dia do ciclo deve ser entre 1 e 28')
      return
    }
    setErro(null)
    salvar.mutate(
      {
        aluno_id: alunoId,
        modelo: valor.modelo,
        valor_aula: valor.modelo === 'por_aula' ? valorNum : null,
        valor_mensal: valor.modelo === 'mensal' ? valorNum : null,
        dia_ciclo: diaCiclo,
        dias_vencimento: diasVencimento || 0,
      },
      { onSuccess: () => setEditando(false), onError: (e) => setErro((e as Error).message) },
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

      {isLoading && <p className="text-sm text-slate-500">Carregando…</p>}

      {!isLoading && (!cobranca || !cobranca.ativo) && (
        <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Sem valor definido</span>
      )}

      {!isLoading && cobranca?.ativo && (
        <p className="text-sm text-slate-600">
          {cobranca.modelo === 'por_aula' ? (
            <>{formatarBRL(cobranca.valor_aula ?? 0)} por aula</>
          ) : (
            <>{formatarBRL(cobranca.valor_mensal ?? 0)} por mês</>
          )}
          {' · '}ciclo a partir do dia {cobranca.dia_ciclo} · vence {cobranca.dias_vencimento} dias após fechar
        </p>
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
