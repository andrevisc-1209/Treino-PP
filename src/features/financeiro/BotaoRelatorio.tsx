import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui'
import { mostrarErroGlobal } from '@/components/Toast'
import { baixarRelatorioPdf, type DadosRelatorio } from './relatorio'

/** "Baixar relatório": gera o PDF no navegador a partir dos dados já calculados (nada vai ao servidor). */
export function BotaoRelatorio({ dados, className }: { dados: DadosRelatorio | null; className?: string }) {
  const [gerando, setGerando] = useState(false)
  const baixar = async () => {
    if (!dados) return
    setGerando(true)
    try {
      await baixarRelatorioPdf(dados)
    } catch {
      mostrarErroGlobal('Não foi possível gerar o relatório. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }
  return (
    <Button variant="outline" className={className} onClick={baixar} disabled={!dados || gerando}>
      <FileDown size={18} /> {gerando ? 'Gerando…' : 'Baixar relatório'}
    </Button>
  )
}

/** Relatório de uma fatura já fechada (itens ligados a ela). */
export function BotaoRelatorioFatura({ dados }: { dados: DadosRelatorio | null }) {
  return <BotaoRelatorio dados={dados} className="mt-2 w-full" />
}
