// Prompt para o personal colar numa IA (ChatGPT, Gemini, Claude…) e converter a lista de alunos dele no CSV da importação.
// A lista de objetivos, o limite e o cabeçalho vêm do CÓDIGO da importação (uma fonte só): se mudarem, o prompt muda junto.
// O exemplo do prompt é lido pela própria importação nos testes. Regras de privacidade: nada de saúde, CPF, senha nem valor; nunca inventar.

import { OBJETIVOS } from '../opcoes'
import { COLUNAS, LIMITE_IMPORTACAO, MODELO_CSV } from './importarAlunos'

export const CABECALHO_CSV = COLUNAS.join(';')

/** Objetivos que a importação aceita (o "Outros" pede descrição e fica de fora). */
export const OBJETIVOS_DO_PROMPT = OBJETIVOS.filter((o) => o !== 'Outros')

/** Palavras que o personal costuma escrever e o objetivo do app que elas querem dizer (a IA preenche só com estas equivalências, sem adivinhar). */
export const EQUIVALENCIAS: Record<string, string[]> = {
  'Perder peso': ['emagrecer', 'perder peso', 'secar', 'queimar gordura'],
  Hipertrofia: ['ganhar massa', 'ganho de massa', 'massa muscular', 'hipertrofia'],
  'Saúde e qualidade de vida': ['saúde', 'bem-estar', 'qualidade de vida'],
  'Condicionamento físico': ['condicionamento', 'fôlego', 'resistência'],
  'Corrida/maratona': ['corrida', 'maratona', 'meia maratona', '5k', '10k'],
  'Performance esportiva': ['performance', 'desempenho', 'competição'],
  Reabilitação: ['reabilitação'],
  'Mobilidade/flexibilidade': ['mobilidade', 'flexibilidade', 'alongamento'],
}

/** A linha de exemplo do modelo (sem o cabeçalho): dado fictício. */
const EXEMPLO = MODELO_CSV.split(/\r?\n/).filter(Boolean)

/** Linha de saída do exemplo de entrada e saída do prompt (o teste a lê pela importação). */
export const EXEMPLO_ENTRADA_SAIDA = 'Fernanda;(11) 96666-0006;;;F;Mobilidade/flexibilidade'

const EQUIV_TEXTO = Object.entries(EQUIVALENCIAS)
  .map(([objetivo, palavras]) => `${palavras.join(', ')} = ${objetivo}`)
  .join('; ')

export function montarPromptIA(): string {
  return `Você vai transformar a lista de alunos que eu colar ou anexar a seguir em uma planilha CSV para importar no app Treino PP. Siga EXATAMENTE estas regras.

FORMATO
- Responda SÓ com o CSV dentro de um bloco de código, sem texto antes nem depois do bloco.
- Separador: ponto e vírgula (;). A primeira linha é o cabeçalho, exatamente assim: ${CABECALHO_CSV}
- Uma linha por aluno, no máximo ${LIMITE_IMPORTACAO} alunos. Se houver mais, faça só os ${LIMITE_IMPORTACAO} primeiros e me avise depois do bloco.

COLUNAS
- nome: obrigatório. Só o nome da pessoa, com maiúscula no começo de cada nome (João Pedro). Tire apelidos, observações e descrições entre parênteses ou depois do nome, e títulos como Sr. e Sra.
- telefone: do Brasil, com DDD. Exemplo: (11) 91234-5678. Se estiver sem DDD ou incompleto, deixe vazio.
- email: só se for um e-mail completo e válido; senão, deixe vazio.
- nascimento: dd/mm/aaaa. Se a lista trouxer o ano com 2 dígitos (15/11/89), pode mandar assim: o app completa o ano. Se só houver a idade ou faltar dia ou mês, deixe vazio.
- sexo: M, F ou Outro. Preencha quando a lista disser de forma explícita (F, feminino, mulher; M, masculino, homem). NÃO deduza pelo nome nem pela foto. Se não estiver explícito, deixe vazio.
- objetivos: um ou mais, separados por | (barra vertical). Use SOMENTE estes valores, escritos exatamente assim: ${OBJETIVOS_DO_PROMPT.join(' | ')}. Aceite estas equivalências (e só elas): ${EQUIV_TEXTO}. Se o objetivo da lista não corresponder a nenhum deles, deixe vazio.

REGRAS IMPORTANTES
- NUNCA invente, complete nem corrija dados. Se não souber, deixe a célula vazia.
- NÃO inclua nenhuma informação de saúde (lesões, cirurgias, medicamentos, doenças, peso, altura), nem CPF, endereço, senha ou valor de mensalidade. Ignore essas informações.
- Se uma célula tiver ponto e vírgula ou aspas, coloque-a entre aspas duplas.
- Não repita o mesmo aluno.

EXEMPLO (dados fictícios):
\`\`\`csv
${EXEMPLO.join('\n')}
\`\`\`

EXEMPLO DE ENTRADA E SAÍDA (dados fictícios): quando a lista diz "mulher" ou "homem", preencha o sexo.
Entrada: Fernanda, mulher, wpp 11 96666 0006, quer alongar e ganhar mobilidade
Saída:
\`\`\`csv
${CABECALHO_CSV}
${EXEMPLO_ENTRADA_SAIDA}
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
