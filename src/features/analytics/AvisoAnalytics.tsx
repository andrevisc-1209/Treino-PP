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
    <div role="dialog" aria-label="Aviso de análise de uso" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-white p-4 text-slate-900 shadow-2xl ring-1 ring-slate-200">
      <p className="text-sm leading-relaxed">
        Usamos o PostHog para entender em que etapa do cadastro e do primeiro uso as pessoas travam, e assim melhorar o app. Só começa depois do seu aceite, não grava a sua
        sessão, não usa cookies e não registra seu nome, e-mail, CPF nem dados de alunos. Veja a{' '}
        <a href={`${import.meta.env.BASE_URL}privacidade`} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
          Política de Privacidade
        </a>
        .
      </p>
      <div className="mt-3 flex gap-2">
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
