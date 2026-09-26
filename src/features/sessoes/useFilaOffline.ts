import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { enfileirar, lerFila, removerDaFila, type ItemFila } from './filaOffline'

type SerieParaFila = {
  sessao_exercicio_id: string
  set_number: number
  reps: number | null
  load_kg: number | null
  completed: boolean
}

/**
 * Fila de séries marcadas offline pra uma sessão: guarda em localStorage,
 * tenta sincronizar quando o navegador avisa que voltou a ficar online e por
 * retry com backoff (cobre o caso de sinal ruim sem um evento "offline"
 * explícito). O upsert é idempotente, então reenviar o que já sincronizou
 * não duplica nada.
 */
export function useFilaOffline(sessaoId: string) {
  const qc = useQueryClient()
  const [fila, setFila] = useState<ItemFila[]>(() => lerFila(sessaoId))
  const [sincronizando, setSincronizando] = useState(false)
  const tentativaRef = useRef(0)
  const sincronizandoRef = useRef(false)

  const sincronizar = useCallback(async () => {
    if (sincronizandoRef.current) return
    const pendentes = lerFila(sessaoId)
    if (pendentes.length === 0) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    sincronizandoRef.current = true
    setSincronizando(true)
    let sincronizouAlgum = false
    for (const item of pendentes) {
      const { error } = await supabase
        .from('sessao_series')
        .upsert(
          { sessao_exercicio_id: item.sessao_exercicio_id, set_number: item.set_number, reps: item.reps, load_kg: item.load_kg, completed: item.completed },
          { onConflict: 'sessao_exercicio_id,set_number' },
        )
      if (!error) {
        removerDaFila(sessaoId, item.id)
        sincronizouAlgum = true
      } else {
        break // provavelmente ainda sem conexão — o resto fica na fila pra tentar depois
      }
    }
    const restante = lerFila(sessaoId)
    setFila(restante)
    setSincronizando(false)
    sincronizandoRef.current = false
    tentativaRef.current = restante.length > 0 ? tentativaRef.current + 1 : 0
    if (sincronizouAlgum) qc.invalidateQueries({ queryKey: ['sessao-exercicios', sessaoId] })
  }, [sessaoId, qc])

  useEffect(() => {
    const onOnline = () => sincronizar()
    window.addEventListener('online', onOnline)
    sincronizar()
    return () => window.removeEventListener('online', onOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoId])

  useEffect(() => {
    if (fila.length === 0) return
    const atrasoMs = Math.min(30_000, 2_000 * 2 ** tentativaRef.current)
    const t = setTimeout(sincronizar, atrasoMs)
    return () => clearTimeout(t)
  }, [fila, sincronizar])

  const enfileirarSerie = useCallback(
    (item: SerieParaFila) => {
      setFila(enfileirar(sessaoId, item))
      sincronizar()
    },
    [sessaoId, sincronizar],
  )

  const estaPendente = useCallback((sessaoExercicioId: string, setNumber: number) => fila.some((i) => i.sessao_exercicio_id === sessaoExercicioId && i.set_number === setNumber), [fila])

  return { fila, sincronizando, sincronizar, enfileirarSerie, estaPendente }
}
