import { useState } from 'react'
import { FileDown, Receipt } from 'lucide-react'
import { Button } from '@/components/ui'
import { mostrarErroGlobal } from '@/components/Toast'
import { baixarRelatorioCompleto, baixarResumoCobranca, type DadosRelatorio } from './relatorio'

/** "Baixar relatório": gera o relatório completo (PDF) no navegador a partir dos dados já calculados (nada vai ao servidor). */
export function BotaoRelatorio({ dados, className }: { dados: DadosRelatorio | null; className?: string }) {
  const [gerando, setGerando] = useState(false)
  const baixar = async () => {
    if (!dados) return
    setGerando(true)
    try {
      await baixarRelatorioCompleto(dados)
    } catch {
      mostrarErroGlobal('Não foi possível gerar o relatório. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }
  return (
    <Button variant="outline" className={className} onClick={baixar} disabled={!dados || gerando}>
      <FileDown size={18} /> {gerando ? 'Gerando…' : 'Baixar relatório completo'}
    </Button>
  )
}

/** Relatório completo de uma fatura já fechada (itens ligados a ela). */
export function BotaoRelatorioFatura({ dados }: { dados: DadosRelatorio | null }) {
  return <BotaoRelatorio dados={dados} className="mt-2 w-full" />
}

/** "Baixar resumo de cobrança": PDF de uma página só com o que está sendo cobrado, o valor e o Pix (para quem quer só cobrar). */
export function BotaoResumoCobranca({ dados }: { dados: DadosRelatorio | null }) {
  const [gerando, setGerando] = useState(false)
  const baixar = async () => {
    if (!dados) return
    setGerando(true)
    try {
      await baixarResumoCobranca(dados)
    } catch {
      mostrarErroGlobal('Não foi possível gerar o resumo. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }
  return (
    <Button variant="outline" className="mt-2 w-full" onClick={baixar} disabled={!dados || gerando}>
      <Receipt size={18} /> {gerando ? 'Gerando…' : 'Baixar resumo de cobrança'}
    </Button>
  )
}
