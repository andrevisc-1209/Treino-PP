import { useState } from 'react'
import { CalendarRange, FileDown } from 'lucide-react'
import { BottomSheet, Button, Field } from '@/components/ui'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarErroGlobal } from '@/components/Toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import { hojeSP } from '@/lib/datas'
import { AVALIACAO_VAZIA, avaliacaoDaFatura, citaDadoDeSaude, colunasDaAvaliacao, LIMITE_AVALIACAO, validarAvaliacao, type AvaliacaoTextos } from './avaliacao'
import { CAMPOS_AVALIACAO } from './AvaliacaoPersonalCard'
import { mesAnterior, mesesDisponiveis, primeiroDiaDoMes, ultimoDiaDoMesRelatorio } from './mesDoRelatorio'
import { baixarRelatorioCompleto, type DadosRelatorio } from './relatorio'
import { useItensDoMes } from './useItensDoMes'

function FolhaRelatorioMensal({ aluno }: { aluno: { id: string; name: string } }) {
  const { session } = useAuth()
  const { data: perfil } = usePerfilProfissional(session?.user.id)
  const meses = mesesDisponiveis(hojeSP())
  const [mes, setMes] = useState(mesAnterior(hojeSP()))
  const [texto, setTexto] = useState<AvaliacaoTextos>(AVALIACAO_VAZIA)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { data: itens, isLoading, error } = useItensDoMes(aluno.id, mes)

  const aulas = (itens ?? []).filter((i) => i.status === 'presente' && !i.fora_da_cobranca).length
  const distancia = (itens ?? []).filter((i) => i.fora_da_cobranca).length
  const vazio = !isLoading && !error && (itens ?? []).length === 0

  const baixar = async () => {
    const problema = validarAvaliacao(texto)
    if (problema) {
      setErro(problema)
      return
    }
    if (citaDadoDeSaude(texto)) {
      const seguir = await confirmarAcao({
        titulo: 'Dado de saúde no relatório?',
        mensagem: 'O texto parece citar lesão, cirurgia ou medicamento. O relatório é compartilhado com o aluno e por mensagem, e dados de saúde não devem ir nele. Quer revisar o texto?',
        textoConfirmar: 'Baixar mesmo assim',
        textoCancelar: 'Revisar texto',
      })
      if (!seguir) return
    }
    setErro(null)
    setGerando(true)
    const dados: DadosRelatorio = {
      alunoNome: aluno.name,
      personalNome: perfil?.name?.trim() || 'Personal',
      periodoInicio: primeiroDiaDoMes(mes),
      periodoFim: ultimoDiaDoMesRelatorio(mes),
      modelo: 'mensal',
      itens: itens ?? [],
      ajuste: 0,
      ajusteDescricao: null,
      total: 0,
      semFinanceiro: true,
      avaliacao: avaliacaoDaFatura(colunasDaAvaliacao(texto)),
    }
    try {
      await baixarRelatorioCompleto(dados)
    } catch {
      mostrarErroGlobal('Não foi possível gerar o relatório. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Resume o que foi feito no mês (aulas, modalidades, evolução e treinos à distância), sem valores nem cobrança.</p>
      <Field label="Mês">
        <select className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base" value={mes} onChange={(e) => setMes(e.target.value)}>
          {meses.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.rotulo}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-sm text-slate-600" aria-live="polite">
        {isLoading ? 'Carregando o mês…' : error ? 'Não foi possível carregar o mês.' : vazio ? 'Nenhuma aula neste mês.' : `${aulas} ${aulas === 1 ? 'aula realizada' : 'aulas realizadas'}${distancia > 0 ? ` e ${distancia} ${distancia === 1 ? 'treino à distância' : 'treinos à distância'}` : ''}.`}
      </p>
      <div className="space-y-3 rounded-xl bg-slate-50 p-3">
        <p className="text-sm font-medium">Avaliação do personal (opcional)</p>
        <p className="text-xs text-slate-600">Vale só para este relatório, não fica salva. Não inclua lesões, cirurgias nem medicamentos.</p>
        {CAMPOS_AVALIACAO.map((c) => (
          <Field key={c.chave} label={c.rotulo}>
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-brand"
              value={texto[c.chave]}
              maxLength={LIMITE_AVALIACAO}
              placeholder={c.dica}
              onChange={(e) => setTexto((t) => ({ ...t, [c.chave]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button onClick={baixar} className="w-full" disabled={isLoading || !!error || vazio || gerando}>
        <FileDown size={18} /> {gerando ? 'Gerando…' : 'Baixar relatório mensal'}
      </Button>
    </div>
  )
}

/** Relatório mensal de acompanhamento na ficha do aluno: independe de fatura e não traz nada financeiro. */
export function RelatorioMensalCard({ aluno }: { aluno: { id: string; name: string } }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <CalendarRange size={18} aria-hidden /> Relatório mensal
      </h2>
      <p className="text-sm text-slate-600">Um resumo do mês para mostrar o trabalho feito e manter o aluno engajado.</p>
      <Button variant="outline" className="w-full" onClick={() => setAberto(true)}>
        Gerar relatório mensal
      </Button>
      <BottomSheet open={aberto} onClose={() => setAberto(false)} title="Relatório mensal">
        <FolhaRelatorioMensal aluno={aluno} />
      </BottomSheet>
    </div>
  )
}
