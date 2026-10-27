// Leitor de CSV (sem biblioteca): aceita vírgula, ponto e vírgula (Excel brasileiro) ou tab, aspas, quebra de linha dentro de aspas
// e BOM. Também decodifica o arquivo: UTF-8 e, se o texto não for UTF-8 válido, Windows-1252 (o "CSV" antigo do Excel em português).

export type Delimitador = ',' | ';' | '\t'

/** Decodifica os bytes do arquivo. Sem erro: se não for UTF-8, tenta Windows-1252 (acentos do Excel antigo). */
export function decodificarArquivo(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Descobre o separador pelas primeiras linhas (fora de aspas): o que mais aparece vence; empate ou nenhum = vírgula. Olha várias linhas porque a 1ª pode ser só um título. */
export function detectarDelimitador(texto: string): Delimitador {
  const amostra = texto.split(/\r\n|\n|\r/).slice(0, 6)
  const contar = (d: string) => {
    let n = 0
    for (const linha of amostra) {
      let aspas = false
      for (const c of linha) {
        if (c === '"') aspas = !aspas
        else if (c === d && !aspas) n++
      }
    }
    return n
  }
  const opcoes: Delimitador[] = [';', '\t', ',']
  let melhor: Delimitador = ','
  let max = 0
  for (const d of opcoes) {
    const n = contar(d)
    if (n > max) {
      max = n
      melhor = d
    }
  }
  return melhor
}

/** Lê o texto inteiro em linhas de células. Linhas totalmente vazias são descartadas. */
export function lerCsv(texto: string, delimitador: Delimitador = detectarDelimitador(texto)): string[][] {
  const linhas: string[][] = []
  let linha: string[] = []
  let celula = ''
  let aspas = false
  const fecharCelula = () => {
    linha.push(celula)
    celula = ''
  }
  const fecharLinha = () => {
    fecharCelula()
    if (linha.some((c) => c.trim() !== '')) linhas.push(linha)
    linha = []
  }
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celula += '"'
          i++
        } else aspas = false
      } else celula += c
    } else if (c === '"') aspas = true
    else if (c === delimitador) fecharCelula()
    else if (c === '\n') fecharLinha()
    else if (c === '\r') {
      if (texto[i + 1] === '\n') i++
      fecharLinha()
    } else celula += c
  }
  if (celula !== '' || linha.length > 0) fecharLinha()
  return linhas
}
