import type { AmbienteNatacao, BlocoNatacao } from '@/types/natacao'

/** Modelos da plataforma: ponto de partida editável. NÃO são copiados para a biblioteca do personal. */
export interface TemplateNatacao {
  id: string
  nome: string
  nivel: 'iniciante' | 'intermediario' | 'avancado'
  ambiente: AmbienteNatacao
  descricao: string
  blocos: Omit<BlocoNatacao, 'id'>[]
}

export const ROTULO_NIVEL: Record<TemplateNatacao['nivel'], string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }

export const TEMPLATES_NATACAO: TemplateNatacao[] = [
  {
    id: 'iniciante-adaptacao',
    nome: 'Iniciante — Adaptação',
    nivel: 'iniciante',
    ambiente: 'piscina',
    descricao: 'Primeiro contato com piscina. Foco em conforto na água e respiração básica.',
    blocos: [
      { exercicio_id: 'head-up', nome: 'Nado Polo (Head-up)', parametros: { distancia: 100, series: 2, descanso: 60 } },
      { exercicio_id: 'prancha', nome: 'Prancha', parametros: { distancia: 200, series: 2, descanso: 45 } },
      { exercicio_id: 'crawl', nome: 'Crawl (Livre)', parametros: { distancia: 100, series: 3, descanso: 60 } },
      { exercicio_id: 'catch-up', nome: 'Catch-up (Piteira)', parametros: { distancia: 100, series: 1, descanso: 45 } },
    ],
  },
  {
    id: 'iniciante-base',
    nome: 'Iniciante — Base Aeróbica',
    nivel: 'iniciante',
    ambiente: 'piscina',
    descricao: 'Construção de base aeróbica e primeiro contato com 4 estilos.',
    blocos: [
      { exercicio_id: 'crawl', nome: 'Crawl (Livre)', parametros: { distancia: 400, series: 1, descanso: 30 } },
      { exercicio_id: 'prancha', nome: 'Prancha', parametros: { distancia: 200, series: 2, descanso: 30 } },
      { exercicio_id: 'costas', nome: 'Costas', parametros: { distancia: 100, series: 2, descanso: 45 } },
      { exercicio_id: 'peito', nome: 'Peito', parametros: { distancia: 100, series: 2, descanso: 45 } },
      { exercicio_id: 'crawl', nome: 'Crawl — Soltura', parametros: { distancia: 200, series: 1, descanso: 0 } },
    ],
  },
  {
    id: 'intermediario-forca',
    nome: 'Intermediário — Força',
    nivel: 'intermediario',
    ambiente: 'piscina',
    descricao: 'Desenvolvimento de potência com acessórios de resistência.',
    blocos: [
      { exercicio_id: 'crawl', nome: 'Aquecimento Crawl', parametros: { distancia: 400, series: 1, descanso: 30 } },
      { exercicio_id: 'pe-de-pato', nome: 'Nadadeiras (Pé de Pato)', parametros: { distancia: 800, series: 1, descanso: 60 } },
      { exercicio_id: 'boia-palmar', nome: 'Boia + Palmar', parametros: { distancia: 400, series: 2, descanso: 60 } },
      { exercicio_id: 'paraquedas', nome: 'Paraquedas de Arraste', parametros: { distancia: 100, series: 4, descanso: 90 } },
      { exercicio_id: 'crawl', nome: 'Soltura', parametros: { distancia: 300, series: 1, descanso: 0 } },
    ],
  },
  {
    id: 'intermediario-resistencia',
    nome: 'Intermediário — Resistência',
    nivel: 'intermediario',
    ambiente: 'piscina',
    descricao: 'Volume moderado com trabalho de hipóxia e negative split.',
    blocos: [
      { exercicio_id: 'crawl', nome: 'Aquecimento', parametros: { distancia: 500, series: 1, descanso: 30 } },
      { exercicio_id: 'hipoxia', nome: 'Hipóxia (3-5-7)', parametros: { distancia: 400, series: 2, descanso: 60, observacao: 'Alternar ciclos de respiração 3-5-7' } },
      { exercicio_id: 'negative-split', nome: 'Negative Split', parametros: { distancia: 200, series: 4, descanso: 45 } },
      { exercicio_id: 'aerobico', nome: 'Série Aeróbica', parametros: { distancia: 800, series: 1, descanso: 60 } },
      { exercicio_id: 'crawl', nome: 'Soltura', parametros: { distancia: 300, series: 1, descanso: 0 } },
    ],
  },
  {
    id: 'avancado-velocidade',
    nome: 'Avançado — Velocidade',
    nivel: 'avancado',
    ambiente: 'piscina',
    descricao: 'Foco em sprints ATP-CP, race pace e ativação de fibras tipo II.',
    blocos: [
      { exercicio_id: 'medley', nome: 'Aquecimento Medley', parametros: { distancia: 400, series: 1, descanso: 30 } },
      { exercicio_id: 'elastico', nome: 'Elástico Estático', parametros: { tempo: 30, series: 6, descanso: 120 } },
      { exercicio_id: 'sprint', nome: 'Sprints 25m', parametros: { distancia: 25, series: 10, descanso: 90 } },
      { exercicio_id: 'race-pace', nome: 'Race Pace 100m', parametros: { distancia: 100, series: 6, descanso: 60 } },
      { exercicio_id: 'descendente', nome: 'Série Descendente', parametros: { distancia: 100, series: 4, descanso: 45 } },
      { exercicio_id: 'crawl', nome: 'Soltura', parametros: { distancia: 400, series: 1, descanso: 0 } },
    ],
  },
  {
    id: 'avancado-longo',
    nome: 'Avançado — Treino Longo',
    nivel: 'avancado',
    ambiente: 'piscina',
    descricao: 'Volume alto com trabalho aeróbico e educativos técnicos.',
    blocos: [
      { exercicio_id: 'crawl', nome: 'Aquecimento', parametros: { distancia: 1000, series: 1, descanso: 30 } },
      { exercicio_id: 'punho-fechado', nome: 'Punho Fechado', parametros: { distancia: 400, series: 2, descanso: 30 } },
      { exercicio_id: 'aerobico', nome: 'Série Aeróbica', parametros: { distancia: 1500, series: 1, descanso: 60 } },
      { exercicio_id: 'pe-pato-palmar', nome: 'Pé de Pato + Palmar', parametros: { distancia: 800, series: 1, descanso: 60 } },
      { exercicio_id: 'hipoxia', nome: 'Hipóxia', parametros: { distancia: 400, series: 2, descanso: 45 } },
      { exercicio_id: 'crawl', nome: 'Soltura', parametros: { distancia: 500, series: 1, descanso: 0 } },
    ],
  },
  {
    id: 'mar-iniciante',
    nome: 'Mar Aberto — Iniciante',
    nivel: 'iniciante',
    ambiente: 'mar',
    descricao: 'Adaptação ao mar aberto. Navegação por ondas e orientação sem linha.',
    blocos: [
      { exercicio_id: 'mar-head-up', nome: 'Head-up — Adaptação', parametros: { tempo: 600, series: 1, descanso: 120, observacao: 'Focar na orientação visual' } },
      { exercicio_id: 'mar-ondas', nome: 'Passagem por Ondas', parametros: { tempo: 600, series: 2, descanso: 120 } },
      { exercicio_id: 'mar-crawl', nome: 'Crawl em Mar Aberto', parametros: { tempo: 900, series: 1, descanso: 120 } },
    ],
  },
  {
    id: 'mar-avancado',
    nome: 'Mar Aberto — Percurso Longo',
    nivel: 'avancado',
    ambiente: 'mar',
    descricao: 'Percurso longo com fartlek. Ideal para preparação de provas de águas abertas.',
    blocos: [
      { exercicio_id: 'mar-crawl', nome: 'Aquecimento Mar', parametros: { tempo: 600, series: 1, descanso: 60 } },
      { exercicio_id: 'mar-percurso', nome: 'Percurso Principal', parametros: { tempo: 3600, series: 1, descanso: 120, observacao: '~3km em ritmo moderado' } },
      { exercicio_id: 'mar-fartlek', nome: 'Fartlek Final', parametros: { tempo: 1200, series: 1, descanso: 60 } },
      { exercicio_id: 'mar-crawl', nome: 'Soltura', parametros: { tempo: 600, series: 1, descanso: 0 } },
    ],
  },
]
