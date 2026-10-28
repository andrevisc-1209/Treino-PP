import { useEffect, useState } from 'react'
import { ClipboardPen } from 'lucide-react'
import { Button, Field } from '@/components/ui'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarInfoGlobal } from '@/components/Toast'
import { mapearErroSupabase } from '@/lib/erros'
import { useSalvarAvaliacaoFatura, type Fatura } from './api'
import { avaliacaoAlterada, citaDadoDeSaude, colunasDaAvaliacao, LIMITE_AVALIACAO, textosDaAvaliacao, validarAvaliacao, type AvaliacaoTextos } from './avaliacao'

const CAMPOS: { chave: keyof AvaliacaoTextos; rotulo: string; dica: string }[] = [
  { chave: 'conquistas', rotulo: 'Conquistas do ciclo', dica: 'Ex.: não faltou nenhuma aula e já corre 5 km sem parar.' },
  { chave: 'atencao', rotulo: 'Pontos de atenção', dica: 'Ex.: caprichar no alongamento e na técnica do crawl.' },
  { chave: 'proximos', rotulo: 'Próximos objetivos', dica: 'Ex.: completar 10 km e subir a carga no agachamento.' },
]

/** Texto do personal que entra no relatório (PDF) e no recibo do ciclo: conquistas, pontos de atenção e próximos objetivos. */
export function AvaliacaoPersonalCard({ fatura }: { fatura: Fatura }) {
  const salvar = useSalvarAvaliacaoFatura()
  const salvo = textosDaAvaliacao(fatura)
  const [texto, setTexto] = useState<AvaliacaoTextos>(salvo)
  const [erro, setErro] = useState<string | null>(null)

  // recarrega só quando muda a fatura ou o que está salvo (nunca no meio da digitação)
  useEffect(() => {
    setTexto(textosDaAvaliacao(fatura))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fatura.id, fatura.avaliacao_conquistas, fatura.avaliacao_atencao, fatura.avaliacao_proximos])

  const alterada = avaliacaoAlterada(texto, salvo)

  const confirmarSalvar = async () => {
    const problema = validarAvaliacao(texto)
    if (problema) {
      setErro(problema)
      return
    }
    // lesão, cirurgia e medicamento são dado de saúde: o relatório é compartilhado pelo personal, então pergunta antes
    if (citaDadoDeSaude(texto)) {
      const seguir = await confirmarAcao({
        titulo: 'Dado de saúde no relatório?',
        mensagem: 'O texto parece citar lesão, cirurgia ou medicamento. O relatório é compartilhado com o aluno e por mensagem, e dados de saúde não devem ir nele. Quer revisar o texto?',
        textoConfirmar: 'Salvar mesmo assim',
        textoCancelar: 'Revisar texto',
      })
      if (!seguir) return
    }
    setErro(null)
    salvar.mutate(
      { faturaId: fatura.id, colunas: colunasDaAvaliacao(texto) },
      { onSuccess: () => mostrarInfoGlobal('Avaliação salva. Ela aparece no relatório e no recibo.'), onError: (e) => setErro(mapearErroSupabase(e)) },
    )
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <ClipboardPen size={18} aria-hidden /> Avaliação do personal
      </h2>
      <p className="text-sm text-slate-600">Opcional. O que você escrever aparece no relatório e no recibo do aluno. Não inclua lesões, cirurgias nem medicamentos.</p>
      {CAMPOS.map((c) => (
        <Field key={c.chave} label={c.rotulo}>
          <textarea
            className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-brand"
            value={texto[c.chave]}
            maxLength={LIMITE_AVALIACAO}
            placeholder={c.dica}
            onChange={(e) => setTexto((t) => ({ ...t, [c.chave]: e.target.value }))}
          />
          <p className="mt-1 text-right text-xs text-slate-500">
            {texto[c.chave].length}/{LIMITE_AVALIACAO}
          </p>
        </Field>
      ))}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button onClick={confirmarSalvar} className="w-full" disabled={!alterada || salvar.isPending}>
        {salvar.isPending ? 'Salvando…' : 'Salvar avaliação'}
      </Button>
    </div>
  )
}
