// Prompt para o personal colar numa IA (ChatGPT, Gemini, Claude…) e converter a lista de alunos dele no CSV da importação.
// A lista de objetivos, o limite e o cabeçalho vêm do CÓDIGO da importação (uma fonte só): se mudarem, o prompt muda junto.
// O exemplo do prompt é lido pela própria importação nos testes. Regras de privacidade: nada de saúde, CPF, senha nem valor; nunca inventar.

import { OBJETIVOS } from '../opcoes'
import { COLUNAS, LIMITE_IMPORTACAO, MODELO_CSV } from './importarAlunos'

export const CABECALHO_CSV = COLUNAS.join(';')

/** Objetivos que a importação aceita (o "Outros" pede descrição e fica de fora). */
export const OBJETIVOS_DO_PROMPT = OBJETIVOS.filter((o) => o !== 'Outros')

/** A linha de exemplo do modelo (sem o cabeçalho): dado fictício. */
const EXEMPLO = MODELO_CSV.split(/\r?\n/).filter(Boolean)

export function montarPromptIA(): string {
  return `Você vai transformar a lista de alunos que eu colar ou anexar a seguir em uma planilha CSV para importar no app Treino PP. Siga EXATAMENTE estas regras.

FORMATO
- Responda SÓ com o CSV dentro de um bloco de código, sem texto antes nem depois do bloco.
- Separador: ponto e vírgula (;). A primeira linha é o cabeçalho, exatamente assim: ${CABECALHO_CSV}
- Uma linha por aluno, no máximo ${LIMITE_IMPORTACAO} alunos. Se houver mais, faça só os ${LIMITE_IMPORTACAO} primeiros e me avise depois do bloco.

COLUNAS
- nome: obrigatório. Escreva como está na lista.
- telefone: do Brasil, com DDD. Exemplo: (11) 91234-5678. Se estiver sem DDD ou incompleto, deixe vazio.
- email: só se for um e-mail completo e válido; senão, deixe vazio.
- nascimento: no formato dd/mm/aaaa. Se só houver a idade ou a data estiver incompleta, deixe vazio.
- sexo: M, F ou Outro. Só se estiver claro na lista; NÃO deduza pelo nome. Senão, deixe vazio.
- objetivos: um ou mais, separados por | (barra vertical). Use SOMENTE estes valores, escritos exatamente assim: ${OBJETIVOS_DO_PROMPT.join(' | ')}. Se o objetivo da lista não corresponder a nenhum deles, deixe vazio.

REGRAS IMPORTANTES
- NUNCA invente, complete nem corrija dados. Se não souber, deixe a célula vazia.
- NÃO inclua nenhuma informação de saúde (lesões, cirurgias, medicamentos, doenças, peso, altura), nem CPF, endereço, senha ou valor de mensalidade. Ignore essas informações.
- Se uma célula tiver ponto e vírgula ou aspas, coloque-a entre aspas duplas.
- Não repita o mesmo aluno.

EXEMPLO (dados fictícios):
\`\`\`csv
${EXEMPLO.join('\n')}
\`\`\`

Agora vou colar a lista de alunos:
`
}

/**
 * O que a IA devolve costuma vir dentro de um bloco de código (``` ou ```csv), às vezes com a palavra "csv" numa linha solta.
 * Tira isso e as pontas, para o texto colado ser lido como se fosse o arquivo.
 */
export function limparTextoColado(texto: string): string {
  const linhas = texto
    .replace(/^﻿/, '')
    .split(/\r\n|\n|\r/)
    .filter((l) => !/^\s*```/.test(l))
  while (linhas.length > 0 && linhas[0].trim() === '') linhas.shift()
  if (linhas.length > 0 && linhas[0].trim().toLowerCase() === 'csv') linhas.shift()
  return linhas.join('\n').trim()
}
