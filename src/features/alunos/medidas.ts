/** Medidas corporais (altura, peso, % gordura, circunferências) são dado de saúde: só com o consentimento do aluno. */

/** Altura no payload do aluno: sem consentimento a chave nem entra (o UPDATE não apaga o que já existe). */
export function payloadAltura(consentimento: boolean, alturaCm: number | null | undefined): { height_cm?: number | null } {
  return consentimento ? { height_cm: alturaCm ?? null } : {}
}

/** Registrar peso/medidas (cadastro ou "Nova avaliação") só com consentimento ativo. */
export const podeRegistrarMedidas = (consentimento: boolean): boolean => consentimento
