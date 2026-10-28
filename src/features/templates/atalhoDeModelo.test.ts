import { describe, expect, it } from 'vitest'
import { MODALIDADES_ATIVAS } from '@/types/modalidades'
import { MODALIDADES_COM_TEMPLATE_DO_SISTEMA, MODALIDADES_NO_ATALHO_DE_MODELO, modalidadesDoAtalhoDeModelo } from './aplicar'

describe('abas do atalho "Usar um modelo pronto"', () => {
  it('traz musculação, natação, corrida, ciclismo e brick (todas as que têm modelo do sistema), na ordem do catálogo', () => {
    expect(modalidadesDoAtalhoDeModelo(['musculacao', 'natacao', 'corrida', 'ciclismo', 'brick', 'funcional' as never])).toEqual(['musculacao', 'natacao', 'corrida', 'ciclismo', 'brick'])
  })
  it('esconde a modalidade desabilitada no app e nunca inventa uma sem modelo', () => {
    expect(modalidadesDoAtalhoDeModelo(['musculacao', 'brick'])).toEqual(['musculacao', 'brick'])
    expect(modalidadesDoAtalhoDeModelo(['natacao'])).toEqual(['natacao'])
    expect(modalidadesDoAtalhoDeModelo(['funcional' as never])).toEqual([])
  })
  it('no app de hoje, todas as modalidades com modelo do sistema estão habilitadas (o atalho mostra mais de uma aba)', () => {
    const abas = modalidadesDoAtalhoDeModelo(MODALIDADES_ATIVAS)
    expect(abas.length).toBeGreaterThan(1)
    expect(abas.every((m) => MODALIDADES_NO_ATALHO_DE_MODELO.includes(m))).toBe(true)
  })
  it('natação não entra no botão do formulário (ela já tem o seu), só no atalho', () => {
    expect(MODALIDADES_COM_TEMPLATE_DO_SISTEMA).not.toContain('natacao')
  })
})

describe('natacaoDoTemplate', () => {
  const t = {
    slug: 'nat-ini',
    nome: 'Base',
    descricao: null,
    modalidade_detalhes: { ambiente: 'mar', nivel: 'iniciante', blocos: [{ exercicio_id: 'e1', nome: 'Crawl', parametros: { distancia: 400 } }] },
  } as never
  it('converte para os dados do formulário com id novo', async () => {
    const { natacaoDoTemplate } = await import('./aplicar')
    const n = natacaoDoTemplate(t)
    expect(n?.ambiente).toBe('mar')
    expect(n?.blocos).toHaveLength(1)
    expect(n?.blocos[0].id).toBeTruthy()
  })
  it('devolve null se não há blocos', async () => {
    const { natacaoDoTemplate } = await import('./aplicar')
    expect(natacaoDoTemplate({ slug: 'x', nome: 'x', modalidade_detalhes: {} } as never)).toBeNull()
  })
})
