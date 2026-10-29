import type { SalvarAlunoInput } from './api'
import { payloadAltura } from './medidas'

/** Colunas clínicas de `alunos`: o banco só aceita ESCREVER valor não vazio nelas com consentimento ativo (migration 20261051). */
export const COLUNAS_CLINICAS = ['injury', 'injury_regions', 'injury_notes', 'surgery', 'surgery_regions', 'surgery_notes', 'medications', 'height_cm'] as const

/** Campos clínicos do aluno (lesão, cirurgia, medicamentos e altura). A altura só entra com consentimento (o UPDATE não apaga o que existe). */
export function camposClinicos(input: SalvarAlunoInput) {
  return {
    injury: input.injury,
    injury_regions: input.injury ? input.injury_regions : [],
    injury_notes: input.injury ? input.injury_notes || null : null,
    surgery: input.surgery,
    surgery_regions: input.surgery ? input.surgery_regions : [],
    surgery_notes: input.surgery ? input.surgery_notes || null : null,
    medications: input.medications || null,
    ...payloadAltura(input.lgpd_consent, input.height_cm),
  }
}

/** Todo o resto do aluno (nada clínico). Vai ANTES do consentimento; os clínicos vão depois dele (o banco exige a ordem). */
export function camposGerais(input: SalvarAlunoInput, professionalId: string) {
  const foco = input.modalidade_foco === 'triathlon' || input.modalidade_foco === 'corrida'
  return {
    professional_id: professionalId,
    name: input.name,
    birth_date: input.birth_date || null,
    sex: input.sex || null,
    phone: input.phone || null,
    email: input.email || null,
    cpf: input.cpf ? input.cpf.replace(/\D/g, '') : null,
    endereco: input.endereco?.trim() || null,
    objetivos: input.objetivos,
    objetivo_notes: input.objetivos.includes('Outros') ? input.objetivo_notes || null : null,
    modalidade_foco: input.modalidade_foco || null,
    // prova alvo só existe para triathlon e corrida
    prova_alvo: foco ? input.prova_alvo || null : null,
    // o nome só existe junto de uma prova alvo
    nome_prova: foco && input.prova_alvo ? input.nome_prova?.trim().slice(0, 60) || null : null,
    data_prova: input.data_prova || null,
    practices_sport: input.practices_sport,
    sports: input.practices_sport ? input.sports : [],
    sport_name: input.practices_sport ? input.sport_name || null : null,
  }
}

/** true = nada clínico a gravar (aluno novo sem dado de saúde): dispensa o UPDATE dos campos clínicos. */
export function semDadoClinico(c: ReturnType<typeof camposClinicos>): boolean {
  return !c.injury && c.injury_regions.length === 0 && c.injury_notes === null && !c.surgery && c.surgery_regions.length === 0 && c.surgery_notes === null && c.medications === null && !('height_cm' in c && c.height_cm != null)
}
