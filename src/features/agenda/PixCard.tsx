import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Copy, Share2 } from 'lucide-react'
import { mascararChavePix, type PixTipo } from '@/lib/pix'
import { mostrarInfoGlobal } from '@/components/Toast'
import { useProfessionalConfig } from './api'

const CHAVE_ABERTO = 'pixcard-aberto'

function lerAberto(): boolean {
  try {
    return localStorage.getItem(CHAVE_ABERTO) === '1'
  } catch {
    return false
  }
}

const LABEL_TIPO: Record<PixTipo, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave aleatória',
}

/** Card "Receber via Pix" na Hoje — só aparece se o Pix já estiver configurado. */
export function PixCard() {
  const { data: config, isLoading } = useProfessionalConfig()
  // Recolhido por padrão: o card ocupava um bloco inteiro da Hoje o tempo todo; a escolha da pessoa fica salva.
  const [aberto, setAberto] = useState(lerAberto)

  const alternar = () => {
    const novo = !aberto
    setAberto(novo)
    try {
      localStorage.setItem(CHAVE_ABERTO, novo ? '1' : '0')
    } catch {
      // sem localStorage (modo privado): só não lembra a escolha
    }
  }

  // Enquanto carrega, não mostra nada; "null" (professional sem linha de
  // config ainda) é diferente de "carregando" e cai no link "Configurar Pix"
  // abaixo, igual a ter uma linha sem pix_chave preenchida.
  if (isLoading) return null

  if (!config?.pix_chave || !config?.pix_tipo) {
    return (
      <Link to="/configuracoes" className="mb-4 flex min-h-12 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-2 shadow-sm">
        <span>
          <span className="block text-sm font-medium text-brand-hover">Configurar Pix</span>
          <span className="block text-xs text-slate-400">Receba seus alunos direto pelo app</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-slate-400" />
      </Link>
    )
  }

  const tipo = config.pix_tipo as PixTipo
  const chaveMascarada = mascararChavePix(tipo, config.pix_chave)

  const copiar = async () => {
    await navigator.clipboard.writeText(config.pix_chave!)
    mostrarInfoGlobal('Copiado!')
  }

  const compartilhar = async () => {
    const texto = `Pix (${LABEL_TIPO[tipo]}): ${config.pix_chave}\nNome: ${config.pix_nome ?? ''}`
    if (navigator.share) {
      try {
        await navigator.share({ text: texto })
      } catch {
        // usuário cancelou o share nativo — não é um erro
      }
    } else {
      await navigator.clipboard.writeText(texto)
      mostrarInfoGlobal('Copiado!')
    }
  }

  return (
    <div className="mb-4 rounded-2xl bg-white shadow-sm">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex min-h-12 w-full items-center justify-between gap-2 px-4 py-2 text-left"
      >
        <span className="min-w-0">
          <span className="block font-semibold">Receber via Pix</span>
          {!aberto && (
            <span className="block truncate text-xs text-slate-500">
              {LABEL_TIPO[tipo]} · {chaveMascarada}
            </span>
          )}
        </span>
        {aberto ? <ChevronDown size={18} className="shrink-0 text-slate-400" /> : <ChevronRight size={18} className="shrink-0 text-slate-400" />}
      </button>
      {aberto && (
        <div className="px-4 pb-4">
          <p className="text-sm text-slate-500">
            {LABEL_TIPO[tipo]} · <span className="font-medium text-slate-700">{chaveMascarada}</span>
          </p>
          {config.pix_nome && <p className="text-sm text-slate-500">{config.pix_nome}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={copiar}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 active:bg-slate-50"
            >
              <Copy size={16} /> Copiar chave
            </button>
            <button
              type="button"
              onClick={compartilhar}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 active:bg-slate-50"
            >
              <Share2 size={16} /> Compartilhar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
