import { useMemo } from 'react'
import { useBloqueios, useDisponibilidade, useProfessionalConfig, type Aula } from './api'
import { parametrosDaConfig } from './disponibilidade'
import { calcularVagas, type Vaga } from './vagas'

/** Vagas livres do dia: disponibilidade menos as aulas do dia e os bloqueios. Sem disponibilidade cadastrada, nenhuma vaga. */
export function useVagasDoDia(dataISO: string, aulas: Aula[] | undefined): { vagas: Vaga[]; semDisponibilidade: boolean; carregando: boolean } {
  const janelas = useDisponibilidade()
  const config = useProfessionalConfig()
  const bloqueios = useBloqueios()
  const carregando = janelas.isLoading || config.isLoading || bloqueios.isLoading || aulas === undefined

  const vagas = useMemo(() => {
    if (!janelas.data || aulas === undefined) return []
    return calcularVagas({
      janelas: janelas.data,
      aulas,
      bloqueios: bloqueios.data ?? [],
      parametros: parametrosDaConfig(config.data),
      agora: new Date(),
      de: dataISO,
      ate: dataISO,
    })
  }, [janelas.data, config.data, bloqueios.data, aulas, dataISO])

  return { vagas, semDisponibilidade: !janelas.isLoading && (janelas.data?.length ?? 0) === 0, carregando }
}
