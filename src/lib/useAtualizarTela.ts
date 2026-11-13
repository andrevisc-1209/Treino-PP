import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { mostrarInfoGlobal } from '@/components/Toast'
import { aplicarNovaVersao, verificarNovaVersaoDoApp } from './atualizacaoApp'

/**
 * O que "puxar para atualizar" faz: recarrega os dados da tela E procura uma versão nova do app. Se achar, avisa e recarrega o app já na
 * versão nova (quem puxou a tela pediu para atualizar). Sem versão nova ou sem rede, só os dados são recarregados.
 */
export function useAtualizarTela(): () => Promise<void> {
  const qc = useQueryClient()
  return useCallback(async () => {
    const [, versao] = await Promise.all([qc.invalidateQueries(), verificarNovaVersaoDoApp()])
    if (versao === 'nova') {
      mostrarInfoGlobal('Nova versão encontrada. Atualizando o app…')
      await new Promise((r) => setTimeout(r, 700))
      await aplicarNovaVersao()
    }
  }, [qc])
}
