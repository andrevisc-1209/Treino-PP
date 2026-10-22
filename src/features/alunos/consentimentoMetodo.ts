/** Como o consentimento do aluno foi registrado (coluna `consentimentos.method`). */
export type MetodoConsentimento = 'app' | 'papel' | 'link'

/**
 * Quem prova o quê: `link` = o próprio aluno confirmou pelo link (a plataforma guarda versão, hora e IP); `papel` = o personal DECLARA que
 * tem o consentimento (pessoalmente ou por escrito) — a plataforma não tem como verificar, a prova é dele; `app` = registro antigo feito no app.
 */
export function rotuloMetodoConsentimento(metodo: string | null | undefined): string {
  if (metodo === 'link') return 'confirmado pelo aluno'
  if (metodo === 'papel') return 'declarado por você'
  return 'registrado no app'
}

export const TITULO_CONSENTIMENTO_DECLARADO = 'Declarar consentimento do aluno'

/** Aviso mostrado antes de o personal declarar que o aluno já consentiu pessoalmente ou por escrito (LGPD, art. 8º, §2º: o controlador prova o consentimento). */
export const AVISO_CONSENTIMENTO_DECLARADO =
  'Ao confirmar, você declara, sob sua responsabilidade, que possui o consentimento do aluno (termo assinado ou registro equivalente) para tratar os dados de saúde dele. Guarde essa prova: você poderá ser solicitado a apresentá-la.'

/** Lembrete curto na ficha, quando o consentimento foi declarado pelo personal. */
export const LEMBRETE_PROVA_CONSENTIMENTO = 'Guarde o termo ou registro do consentimento: a prova é sua e você pode ser solicitado a apresentá-lo.'
