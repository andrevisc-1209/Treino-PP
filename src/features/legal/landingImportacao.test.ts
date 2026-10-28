import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { LIMITE_IMPORTACAO, MODELO_CSV } from '../alunos/importar/importarAlunos'
import { TERMOS_USO_TEXTO } from './textos'

// A landing promete a importação; o que ela diz precisa bater com o app, com o modelo que se baixa e com os Termos (cláusula 3.5).
const raiz = path.join(import.meta.dirname, '..', '..', '..')
const landing = fs.readFileSync(path.join(raiz, 'public', 'landing.html'), 'utf8')
const secao = landing.slice(landing.indexOf('id="traga-seus-alunos"'), landing.indexOf('<!-- ─── Bloco 5 — A Conta'))
const faqInicio = landing.indexOf('id="faq-importacao"')
const faq = landing.slice(faqInicio, landing.indexOf('</details>', faqInicio))

describe('landing: seção "Traga seus alunos"', () => {
  it('existe, vem depois da comparação e tem os 3 caminhos, citando as IAs', () => {
    expect(landing.indexOf('id="traga-seus-alunos"')).toBeGreaterThan(landing.indexOf('id="comparacao"'))
    expect(landing.indexOf('id="traga-seus-alunos"')).toBeLessThan(landing.indexOf('id="conta"'))
    for (const t of ['Tenho uma planilha', 'Está tudo bagunçado', 'Prefiro um por um', 'ChatGPT', 'Gemini', 'Claude']) expect(secao).toContain(t)
  })
  it('promessa exata: a IA é a do personal; o prompt e a revisão são do app (nada de "importação automática com IA")', () => {
    expect(secao).toContain('A IA é a que você já usa; o prompt pronto e a revisão são nossos')
    expect(landing).not.toMatch(/importa[çc][ãa]o autom[áa]tica/i)
    expect(landing).not.toMatch(/nossa (própria )?IA|IA do Treino/i)
  })
  it('traz o limite e o cuidado de privacidade, e manda para o FAQ', () => {
    expect(secao).toContain(`Até ${LIMITE_IMPORTACAO} alunos por vez`)
    expect(secao).toContain('dados de saúde só com o consentimento do aluno')
    expect(secao).toContain('envia os dados a um serviço de terceiros')
    expect(secao).toContain('href="#faq-importacao"')
  })
  it('só mostra dados fictícios (Exemplo) na ilustração da revisão', () => {
    expect(secao).toContain('Maria Exemplo')
    expect(secao).toContain('exemplo.com')
    expect(secao).not.toMatch(/@gmail|@hotmail|@outlook/)
  })
  it('o "Passo 1" fala em trazer os alunos e o hero tem a linha de apoio', () => {
    expect(landing).toContain('Passo 1</p><p class="mt-2 text-lg font-semibold">Traga seus alunos')
    expect(landing).toContain('Traga todos em minutos')
  })
})

describe('landing: FAQ da importação', () => {
  it('diz o limite, os dados básicos, o cuidado com a IA (sem saúde, CPF nem senha) e a revisão', () => {
    expect(faq).toContain(`até ${LIMITE_IMPORTACAO} alunos por vez`)
    expect(faq).toContain('só dados básicos')
    expect(faq).toContain('nunca saúde, CPF ou senha')
    expect(faq).toContain('serviço de terceiros')
    expect(faq).toContain('antes de gravar')
    expect(faq).toContain('dá para desfazer')
  })
  it('a promessa dos Termos (3.5) é a mesma: limite de 50 e só dados básicos', () => {
    expect(TERMOS_USO_TEXTO).toContain(`até ${LIMITE_IMPORTACAO} (cinquenta)`)
    expect(TERMOS_USO_TEXTO).toContain('apenas dados básicos')
  })
})

describe('modelo de planilha estático da landing', () => {
  it('public/modelo-alunos.csv é exatamente o modelo que o app baixa (com BOM para o Excel)', () => {
    const arquivo = fs.readFileSync(path.join(raiz, 'public', 'modelo-alunos.csv'), 'utf8')
    expect(arquivo).toBe('﻿' + MODELO_CSV)
    expect(landing).toContain('href="/modelo-alunos.csv"')
  })
})
