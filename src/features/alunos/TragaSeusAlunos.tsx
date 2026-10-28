import { Link } from 'react-router-dom'
import { FileSpreadsheet, Sparkles, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui'
import { ROTA_IMPORTAR_COM_IA, ROTA_IMPORTAR_COM_PLANILHA } from './importar/via'

/** Estado vazio da lista de alunos: em vez de só "toque no +", mostra os três jeitos de trazer os alunos (o da IA vem primeiro: é o mais fácil para quem tem lista bagunçada). */
export function TragaSeusAlunos({ onCadastrarUm, somenteLeitura, abrirPlanos }: { onCadastrarUm: () => void; somenteLeitura: boolean; abrirPlanos: () => void }) {
  // em modo leitura (assinatura vencida) o servidor recusa gravações: abre os planos em vez de levar a uma tela que vai falhar
  const ir = (e: React.MouseEvent) => {
    if (somenteLeitura) {
      e.preventDefault()
      abrirPlanos()
    }
  }
  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Traga seus alunos">
      <div>
        <h2 className="text-lg font-semibold">Traga seus alunos</h2>
        <p className="text-sm text-slate-600">Você ainda não tem alunos aqui. Escolha o jeito mais fácil: não precisa digitar um por um.</p>
      </div>
      <Link to={ROTA_IMPORTAR_COM_IA} onClick={ir} className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-brand px-3 py-2 active:bg-slate-50">
        <Sparkles size={20} className="shrink-0 text-brand-hover" aria-hidden />
        <span>
          <span className="block text-sm font-semibold">Minha lista está bagunçada</span>
          <span className="block text-xs text-slate-600">Prompt pronto para ChatGPT, Gemini ou Claude; você confere antes de gravar</span>
        </span>
      </Link>
      <Link to={ROTA_IMPORTAR_COM_PLANILHA} onClick={ir} className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-300 px-3 py-2 active:bg-slate-50">
        <FileSpreadsheet size={20} className="shrink-0 text-brand-hover" aria-hidden />
        <span>
          <span className="block text-sm font-semibold">Tenho uma planilha</span>
          <span className="block text-xs text-slate-600">Baixe o modelo, preencha e envie</span>
        </span>
      </Link>
      <Button variant="outline" className="w-full" onClick={onCadastrarUm}>
        <UserPlus size={18} aria-hidden /> Cadastrar um aluno
      </Button>
    </section>
  )
}
