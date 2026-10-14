import { TIPOS_CORRIDA } from '@/data/corrida-tipos'
import { tiposCiclismo } from '@/data/ciclismo-tipos'
import type { AmbienteCiclismo } from '@/types/ciclismo'
import type { Exercicio } from './api'
import { rotuloTipo, type ParametroPrincipal } from './tipos'

/** Exercício do personal pronto para virar um bloco de corrida/ciclismo (com o tipo de bloco já resolvido). */
export type ExercicioParaBloco = { id: string; nome: string; tipoId: string; rotuloTipo: string; detalhe: string; parametro: ParametroPrincipal | null }

const ROTULO_PARAMETRO: Record<ParametroPrincipal, string> = { distancia: 'Distância', tempo: 'Tempo' }

/** Exercícios de brick (tipo bike/corrida) viram bloco desse tipo genérico de treino. */
const TIPO_BLOCO_DO_BRICK = { corrida: 'aerobico-base', bike: 'resistencia-base' } as const

/**
 * "Meus exercícios" que podem ser adicionados a um treino de corrida ou ciclismo.
 * Só os do próprio personal (RLS já devolve global + próprios); no ciclismo, só os tipos que existem no ambiente do treino;
 * no brick, os exercícios da modalidade brick entram na parte certa (bike → ciclismo, corrida → corrida).
 */
export function exerciciosParaBloco(lista: Exercicio[], alvo: 'corrida' | 'ciclismo', opcoes: { ambiente?: AmbienteCiclismo; incluirBrick?: boolean } = {}): ExercicioParaBloco[] {
  const tiposValidos = new Set<string>(alvo === 'corrida' ? TIPOS_CORRIDA.map((t) => t.id) : tiposCiclismo(opcoes.ambiente ?? 'indoor').map((t) => t.id))
  const saida: ExercicioParaBloco[] = []
  for (const e of lista) {
    if (e.professional_id == null) continue
    let tipoBloco: string | null = null
    if (e.modalidade === alvo && e.tipo && tiposValidos.has(e.tipo)) tipoBloco = e.tipo
    else if (opcoes.incluirBrick && e.modalidade === 'brick' && e.tipo === (alvo === 'corrida' ? 'corrida' : 'bike')) tipoBloco = TIPO_BLOCO_DO_BRICK[e.tipo]
    if (!tipoBloco) continue
    const rotulo = e.modalidade === 'brick' ? (rotuloTipo(alvo, tipoBloco) ?? tipoBloco) : (rotuloTipo(alvo, e.tipo) ?? tipoBloco)
    saida.push({
      id: e.id,
      nome: e.name,
      tipoId: tipoBloco,
      rotuloTipo: rotulo,
      detalhe: [rotulo, e.parametro_principal ? ROTULO_PARAMETRO[e.parametro_principal] : null].filter(Boolean).join(' · '),
      parametro: e.parametro_principal ?? null,
    })
  }
  return saida.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
