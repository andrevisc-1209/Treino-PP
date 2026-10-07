import { exerciciosLivresDe, linhasDetalhes, MODALIDADES_CONFIG, type ModalidadeDetalhes, type ModalidadeTipo } from '@/types/modalidades'

/**
 * Mensagem de WhatsApp com o treino para o aluno fazer por conta (execução assíncrona).
 * Só o que o personal montou para o treino — nada de ficha de saúde do aluno (LGPD).
 */
export function gerarMensagemTreino(args: {
  nomeAluno: string
  nomePersonal: string
  nomeTreino: string
  modalidade: ModalidadeTipo
  detalhes: ModalidadeDetalhes | null | undefined
  /** musculação: exercícios do treino */
  exercicios?: { nome: string; series: number; repeticoes: string }[]
  /** link da página pública para o aluno registrar a execução */
  link?: string
}): string {
  const cfg = MODALIDADES_CONFIG[args.modalidade]
  const primeiroNome = args.nomeAluno.trim().split(/\s+/)[0] || args.nomeAluno
  const blocos: string[] = [
    `Olá, ${primeiroNome}! 💪`,
    `Seu treino "${args.nomeTreino}" de ${cfg.emoji} ${cfg.label} está pronto!`,
  ]
  const detalhes = linhasDetalhes(args.modalidade, args.detalhes)
  if (detalhes.length > 0) blocos.push(`📋 Detalhes:\n${detalhes.join('\n')}`)
  if (args.exercicios && args.exercicios.length > 0) {
    blocos.push(`📋 Exercícios:\n${args.exercicios.map((e, i) => `${i + 1}. ${e.nome} — ${e.series}x${e.repeticoes}`).join('\n')}`)
  }
  const livres = exerciciosLivresDe(args.detalhes)
  if (livres.length > 0) {
    blocos.push(`📋 Exercícios:\n${livres.map((l, i) => `${i + 1}. ${l.nome}${l.descricao ? ` — ${l.descricao}` : ''}`).join('\n')}`)
  }
  if (args.link) blocos.push(`Para registrar sua execução, acesse:\n🔗 ${args.link}`)
  blocos.push(`Qualquer dúvida, me chame!\n— ${args.nomePersonal}`)
  return blocos.join('\n\n')
}
