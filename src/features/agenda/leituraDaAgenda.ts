/** Lógica pura da leitura da Agenda: nomes curtos sem ambiguidade, horários compartilhados e aluno em duas aulas ao mesmo tempo. */

export interface AulaParaLeitura {
  id: string
  status: 'agendada' | 'realizada' | 'cancelada'
  starts_at: string
  duration_min: number
  aula_participantes: { aluno_id: string; status: string; aluno: { name: string } | null }[]
}

const partes = (nome: string) => nome.trim().split(/\s+/).filter(Boolean)
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Cria o encurtador de nomes para a grade semanal: só o prenome quando ele é único entre os alunos da semana;
 * prenome + inicial do último sobrenome ("Paulo H.") quando dois alunos dividem o prenome; nome inteiro se nem assim se distinguem.
 */
export function criarAbreviador(nomes: string[]): (nome: string) => string {
  const unicos = [...new Set(nomes.map((n) => n.trim()).filter(Boolean))]
  const prenome = (n: string) => partes(n)[0]?.toLowerCase() ?? ''
  const comPrenome = new Map<string, string[]>()
  for (const n of unicos) comPrenome.set(prenome(n), [...(comPrenome.get(prenome(n)) ?? []), n])

  const curtoComInicial = (n: string) => {
    const p = partes(n)
    return p.length > 1 ? `${maiuscula(p[0])} ${p[p.length - 1].charAt(0).toUpperCase()}.` : maiuscula(p[0] ?? '')
  }
  // quantos alunos distintos cairiam no mesmo rótulo "Prenome I."
  const rotulosComInicial = new Map<string, number>()
  for (const n of unicos) rotulosComInicial.set(curtoComInicial(n), (rotulosComInicial.get(curtoComInicial(n)) ?? 0) + 1)

  return (nome) => {
    const n = nome.trim()
    if (!n) return ''
    if ((comPrenome.get(prenome(n))?.length ?? 0) <= 1) return maiuscula(partes(n)[0])
    const curto = curtoComInicial(n)
    return (rotulosComInicial.get(curto) ?? 0) > 1 ? n : curto
  }
}

export interface GrupoDeHorario<T> {
  starts_at: string
  aulas: T[]
}

/** Agrupa aulas que começam juntas (já em ordem de horário). Grupos de uma aula só não pedem aviso. */
export function agruparPorHorario<T extends { starts_at: string }>(aulas: T[]): GrupoDeHorario<T>[] {
  const grupos: GrupoDeHorario<T>[] = []
  for (const a of aulas) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.starts_at === a.starts_at) ultimo.aulas.push(a)
    else grupos.push({ starts_at: a.starts_at, aulas: [a] })
  }
  return grupos
}

const fim = (a: AulaParaLeitura) => new Date(a.starts_at).getTime() + a.duration_min * 60_000

/**
 * Conflito real: o MESMO aluno previsto em duas aulas que se cruzam no tempo. Duas aulas no mesmo horário com alunos diferentes
 * é normal (dupla, grupo, alunos em paralelo) e não entra aqui. Devolve, por aula, os nomes dos alunos em conflito.
 */
export function conflitosDeAluno(aulas: AulaParaLeitura[]): Map<string, string[]> {
  const ativas = aulas.filter((a) => a.status !== 'cancelada')
  const resultado = new Map<string, string[]>()
  const marcar = (id: string, nome: string) => {
    const atuais = resultado.get(id) ?? []
    if (!atuais.includes(nome)) resultado.set(id, [...atuais, nome])
  }
  for (let i = 0; i < ativas.length; i++) {
    for (let j = i + 1; j < ativas.length; j++) {
      const a = ativas[i]
      const b = ativas[j]
      const seCruzam = new Date(a.starts_at).getTime() < fim(b) && new Date(b.starts_at).getTime() < fim(a)
      if (!seCruzam) continue
      for (const pa of a.aula_participantes) {
        if (pa.status === 'cancelou') continue
        if (b.aula_participantes.some((pb) => pb.aluno_id === pa.aluno_id && pb.status !== 'cancelou')) {
          const nome = pa.aluno?.name ?? 'Aluno'
          marcar(a.id, nome)
          marcar(b.id, nome)
        }
      }
    }
  }
  return resultado
}
