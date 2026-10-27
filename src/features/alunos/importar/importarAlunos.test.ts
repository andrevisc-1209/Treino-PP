import { describe, expect, it } from 'vitest'
import { decodificarArquivo, detectarDelimitador, lerCsv } from './csv'
import {
  LIMITE_IMPORTACAO,
  MODELO_CSV,
  lerPlanilha,
  mapearCabecalho,
  normalizarNascimento,
  normalizarObjetivos,
  normalizarSexo,
  resumoLeitura,
  selecionadasPorPadrao,
} from './importarAlunos'

const HOJE = '2026-10-26'

describe('csv', () => {
  it('detecta ; , e tab pelo cabeçalho', () => {
    expect(detectarDelimitador('a;b;c\n1;2;3')).toBe(';')
    expect(detectarDelimitador('a,b,c')).toBe(',')
    expect(detectarDelimitador('a\tb\tc')).toBe('\t')
    expect(detectarDelimitador('a')).toBe(',')
  })
  it('lê aspas, vírgula dentro de aspas, aspas duplas, quebra de linha dentro da célula e CRLF', () => {
    const t = 'nome,obs\r\n"Silva, Ana","disse ""oi"""\r\n"Bia","linha1\nlinha2"\r\n\r\n'
    expect(lerCsv(t)).toEqual([
      ['nome', 'obs'],
      ['Silva, Ana', 'disse "oi"'],
      ['Bia', 'linha1\nlinha2'],
    ])
  })
  it('decodifica UTF-8 (tirando o BOM) e cai para Windows-1252 quando não é UTF-8', () => {
    const utf8 = new TextEncoder().encode('﻿João')
    expect(decodificarArquivo(utf8.buffer.slice(utf8.byteOffset, utf8.byteOffset + utf8.byteLength) as ArrayBuffer)).toBe('João')
    const w1252 = new Uint8Array([0x4a, 0x6f, 0xe3, 0x6f]) // "João" em Windows-1252
    expect(decodificarArquivo(w1252.buffer)).toBe('João')
  })
})

describe('normalizações', () => {
  it('nascimento aceita vários formatos e rejeita data impossível', () => {
    expect(normalizarNascimento('15/03/1990')).toBe('1990-03-15')
    expect(normalizarNascimento('5/3/1990')).toBe('1990-03-05')
    expect(normalizarNascimento('1990-03-15')).toBe('1990-03-15')
    expect(normalizarNascimento('15-03-90')).toBe('1990-03-15')
    expect(normalizarNascimento('15/03/05')).toBe('2005-03-15')
    expect(normalizarNascimento('31/02/1990')).toBeNull()
    expect(normalizarNascimento('amanhã')).toBeNull()
  })
  it('sexo', () => {
    expect(normalizarSexo('Masculino')).toBe('M')
    expect(normalizarSexo('f')).toBe('F')
    expect(normalizarSexo('Outro')).toBe('outro')
    expect(normalizarSexo('xyz')).toBeNull()
  })
  it('objetivos: só a lista do app (sem acento/caixa, "/" do nome mantido); o resto fica de fora e nada livre vai para a base', () => {
    expect(normalizarObjetivos('hipertrofia|saude e qualidade de vida')).toEqual({ objetivos: ['Hipertrofia', 'Saúde e qualidade de vida'], ignorados: [] })
    expect(normalizarObjetivos('Corrida/maratona')).toEqual({ objetivos: ['Corrida/maratona'], ignorados: [] })
    expect(normalizarObjetivos('Emagrecer; Hipertrofia')).toEqual({ objetivos: ['Hipertrofia'], ignorados: ['Emagrecer'] })
    expect(normalizarObjetivos('Outros')).toEqual({ objetivos: [], ignorados: ['Outros'] })
    expect(normalizarObjetivos('')).toEqual({ objetivos: [], ignorados: [] })
  })
  it('texto livre enorme não vai inteiro nem para o aviso', () => {
    expect(normalizarObjetivos('x'.repeat(500)).ignorados[0]).toHaveLength(40)
  })
  it('cabeçalho: sinônimos e sem acento; sobra vira "ignorada"', () => {
    const r = mapearCabecalho(['Nome do Aluno', 'WhatsApp', 'E-mail', 'Data de Nascimento', 'Gênero', 'Plano'])
    expect(r.colunas).toEqual({ nome: 0, telefone: 1, email: 2, nascimento: 3, sexo: 4 })
    expect(r.ignoradas).toEqual(['Plano'])
  })
})

describe('lerPlanilha', () => {
  it('o modelo baixado é lido sem erro nem aviso', () => {
    const r = lerPlanilha(MODELO_CSV, [], HOJE)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.linhas).toHaveLength(1)
    expect(r.linhas[0].status).toBe('ok')
    expect(r.linhas[0].aluno).toMatchObject({ name: 'Maria Exemplo', phone: '(11) 91234-5678', birth_date: '1990-03-15', sex: 'F' })
  })
  it('só o nome é obrigatório: sem nome é erro; campo ruim vira aviso e entra vazio', () => {
    const t = 'nome;telefone;email;nascimento;sexo\n;11912345678;;;\nAna;123;ana@@x;31/02/2000;x\nBia;;;;'
    const r = lerPlanilha(t, [], HOJE)
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.map((l) => l.status)).toEqual(['erro', 'aviso', 'ok'])
    expect(r.linhas[0].erros).toEqual(['Sem nome.'])
    expect(r.linhas[1].aluno).toMatchObject({ phone: null, email: null, birth_date: null, sex: null })
    expect(r.linhas[1].avisos).toHaveLength(4)
    expect(r.linhas[2].aluno).toMatchObject({ name: 'Bia', phone: null })
  })
  it('data futura e muito antiga viram aviso', () => {
    const r = lerPlanilha('nome;nascimento\nA;01/01/2030\nB;01/01/1900', [], HOJE)
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.every((l) => l.status === 'aviso' && l.aluno?.birth_date === null)).toBe(true)
  })
  it('duplicado: mesmo nome (sem acento/caixa) e mesmo telefone, contra a base e dentro do arquivo', () => {
    const t = 'nome;telefone\nJoão Silva;(11) 91234-5678\njoao silva;11912345678\nJoão Silva;(11) 90000-0000\nMaria;'
    const r = lerPlanilha(t, [{ name: 'Maria', phone: null }], HOJE)
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.map((l) => l.status)).toEqual(['ok', 'duplicado', 'ok', 'duplicado'])
    expect(r.linhas[1].avisos[0]).toContain('Repetido')
    expect(r.linhas[3].avisos[0]).toContain('Já existe')
    expect(selecionadasPorPadrao(r.linhas)).toEqual([2, 4])
    expect(resumoLeitura(r.linhas)).toEqual({ total: 4, ok: 2, aviso: 0, duplicado: 2, erro: 0 })
  })
  it('recusa planilha sem coluna nome, vazia, só cabeçalho e acima do limite', () => {
    expect(lerPlanilha('', [], HOJE)).toMatchObject({ ok: false })
    expect(lerPlanilha('telefone\n123', [], HOJE)).toMatchObject({ ok: false, erro: expect.stringContaining('"nome"') })
    expect(lerPlanilha('nome', [], HOJE)).toMatchObject({ ok: false, erro: expect.stringContaining('só tem o cabeçalho') })
    const muitas = 'nome\n' + Array.from({ length: LIMITE_IMPORTACAO + 1 }, (_, i) => `Aluno ${i}`).join('\n')
    expect(lerPlanilha(muitas, [], HOJE)).toMatchObject({ ok: false, erro: expect.stringContaining('limite é 50') })
    const exato = 'nome\n' + Array.from({ length: LIMITE_IMPORTACAO }, (_, i) => `Aluno ${i}`).join('\n')
    expect(lerPlanilha(exato, [], HOJE).ok).toBe(true)
  })
})

describe('planilha com título antes do cabeçalho (Google Planilhas)', () => {
  const arquivo = 'modelo-alunos\nnome;telefone;email;nascimento;sexo;objetivos\nMaria Exemplo;(11) 91234-5678;maria@exemplo.com;15/03/1990;F;Hipertrofia|Saúde e qualidade de vida\nPaulo trinta;1145024-6200;paulo123@p.com;17/05/78;M;Saúde\n'
  it('acha o cabeçalho na 2ª linha, detecta o ; e numera as linhas como na planilha', () => {
    const r = lerPlanilha(arquivo, [], HOJE)
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.map((l) => l.linha)).toEqual([3, 4])
    expect(r.linhas.map((l) => l.status)).toEqual(['ok', 'ok'])
    expect(r.linhas[1].aluno).toMatchObject({ name: 'Paulo trinta', phone: '(11) 45024-6200', birth_date: '1978-05-17', sex: 'M', objetivos: ['Saúde e qualidade de vida'] })
  })
  it('linha em branco antes do cabeçalho também funciona; sem "nome" nas 5 primeiras linhas, recusa', () => {
    expect(lerPlanilha('\n\nnome\nAna', [], HOJE).ok).toBe(true)
    expect(lerPlanilha('a\nb\nc\nd\ne\nnome\nAna', [], HOJE)).toMatchObject({ ok: false })
  })
  it('objetivo por início único ("Saúde"), mas não por início ambíguo', () => {
    expect(normalizarObjetivos('Saúde')).toEqual({ objetivos: ['Saúde e qualidade de vida'], ignorados: [] })
    expect(normalizarObjetivos('Cond')).toEqual({ objetivos: ['Condicionamento físico'], ignorados: [] })
    expect(normalizarObjetivos('Per')).toEqual({ objetivos: [], ignorados: ['Per'] }) // curto demais
    expect(normalizarObjetivos('Perf')).toEqual({ objetivos: ['Performance esportiva'], ignorados: [] })
  })
})
