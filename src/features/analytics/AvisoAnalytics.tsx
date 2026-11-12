import { useEffect, useState } from 'react'
import { aceitar, deveAvisar, gpcAtivo, lerEscolha, recusar } from './analytics'

/**
 * Aviso de análise de uso (LGPD). Aparece uma vez, ~1,5 s depois de abrir a tela, só para quem ainda não escolheu e sem sinal GPC.
 * `reabrir` (de "Preferências de cookies", em Configurações) mostra de novo para a pessoa mudar de ideia.
 */
export function AvisoAnalytics({ reabrir = 0 }: { reabrir?: number }) {
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (!deveAvisar(lerEscolha(), gpcAtivo())) return
    const t = setTimeout(() => setAberto(true), 1500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (reabrir > 0) setAberto(true)
  }, [reabrir])

  if (!aberto) return null

  return (
    <div role="dialog" aria-label="Aviso de análise de uso" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-white p-3 text-slate-900 shadow-2xl ring-1 ring-slate-200">
      {/* compacto de propósito: no celular o aviso longo cobria um quarto da primeira tela. Mantém as promessas da Política (seção 3). */}
      <p className="text-xs leading-snug">
        Medimos em que etapa do cadastro e do primeiro uso as pessoas travam, só se você aceitar. Sem cookies, sem gravar sua sessão e sem seu nome, e-mail, CPF ou dados de alunos.{' '}
        <a href={`${import.meta.env.BASE_URL}privacidade`} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
          Política de Privacidade
        </a>
        .
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="min-h-11 flex-1 rounded-full border border-slate-400 px-4 text-sm font-semibold active:bg-slate-50"
          onClick={() => {
            recusar()
            setAberto(false)
          }}
        >
          Recusar
        </button>
        <button
          type="button"
          className="min-h-11 flex-1 rounded-full border border-slate-400 px-4 text-sm font-semibold active:bg-slate-50"
          onClick={() => {
            aceitar()
            setAberto(false)
          }}
        >
          Aceitar
        </button>
      </div>
    </div>
  )
}
